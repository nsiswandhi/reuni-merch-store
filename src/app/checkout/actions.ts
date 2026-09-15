"use server";

import { prisma } from "@/lib/prisma";
import { calculateOrderTotals } from "@/lib/money";
import { generateOrderToken, generateOrderNumber } from "@/lib/order-number";
import { checkoutFormSchema } from "@/lib/checkout-schema";
import { sendOrderCreatedEmails, sendPreorderReservationEmails } from "@/lib/email";
import { getProductAvailability } from "@/lib/availability";
import { finalizePreorderRoundIfQuotaMet } from "@/lib/preorder-fulfillment";

export interface CreateOrderState {
  error?: string;
  orderToken?: string;
}

// Thrown inside the order-creation transaction to abort it with a
// buyer-facing message (out of stock, ordering closed) instead of a generic
// 500 — caught in createOrder and turned into a normal { error } result.
class CheckoutError extends Error {}

export async function createOrder(
  _prevState: CreateOrderState,
  formData: FormData
): Promise<CreateOrderState> {
  let parsedItems: unknown;
  try {
    parsedItems = JSON.parse(String(formData.get("cartItems") ?? "[]"));
  } catch {
    return { error: "Data keranjang tidak valid." };
  }

  const parsed = checkoutFormSchema.safeParse({
    buyerName: formData.get("buyerName"),
    buyerAngkatan: formData.get("buyerAngkatan"),
    buyerEmail: formData.get("buyerEmail"),
    buyerWhatsapp: formData.get("buyerWhatsapp"),
    deliveryMethod: formData.get("deliveryMethod"),
    shippingAddress: formData.get("shippingAddress") ?? undefined,
    items: parsedItems,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { buyerName, buyerAngkatan, buyerEmail, buyerWhatsapp, deliveryMethod, shippingAddress, items } = parsed.data;

  // Re-fetch authoritative prices from the database — never trust client-submitted prices.
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { variants: true, vendor: { select: { allowsPickup: true } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  // Same rule enforced client-side in cart.ts's addToCart (CartConflictError)
  // — re-checked here since cart contents are never trusted. A preorder
  // order can't mix with regular items, and can only be tied to one
  // product's quota, since the whole order transitions RESERVED ->
  // PENDING_PAYMENT together when that one product's quota is met.
  const isPreorderOrder = products.some((p) => p.isPreorder);

  // Same rules enforced client-side in checkout/page.tsx, re-checked here
  // since the client's choice can never be trusted: a preorder order is
  // always shipped (production takes 1-2 weeks, no same-day pickup to
  // offer), and otherwise if any item's vendor can't hand off in person,
  // the whole order must be shipped.
  if (deliveryMethod === "PICKUP") {
    if (isPreorderOrder) {
      return { error: "Pesanan preorder hanya bisa dikirim — silakan pilih Dikirim." };
    }
    if (products.some((p) => !p.vendor.allowsPickup)) {
      return { error: "Salah satu vendor di pesananmu hanya melayani pengiriman — silakan pilih Dikirim." };
    }
  }

  if (isPreorderOrder) {
    if (products.some((p) => !p.isPreorder)) {
      return { error: "Pesanan preorder tidak bisa dicampur dengan produk reguler." };
    }
    const preorderProductIds = new Set(items.map((i) => i.productId));
    if (preorderProductIds.size > 1) {
      return { error: "Pesanan preorder hanya boleh berisi 1 produk." };
    }
  }

  const resolvedItems: {
    productId: string;
    variantId: string | null;
    vendorId: string;
    productNameSnapshot: string;
    variantLabelSnapshot: string;
    unitPriceSnapshot: number;
    qty: number;
  }[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) {
      return { error: "Salah satu produk di keranjang sudah tidak tersedia." };
    }
    // Re-check availability server-side — the buyer's cart may be stale
    // (page loaded before the deadline passed, or stock ran out since).
    const availability = getProductAvailability(product);
    if (!availability.isAvailable) {
      return { error: `${product.name}: ${availability.reasonLabel ?? "sudah tidak tersedia"}.` };
    }
    const hasActiveVariants = product.variants.some((v) => v.isActive);
    const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId && v.isActive) : null;
    if (hasActiveVariants && !variant) {
      return { error: "Varian produk wajib dipilih." };
    }
    resolvedItems.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      vendorId: product.vendorId,
      productNameSnapshot: product.name,
      variantLabelSnapshot: variant?.label ?? "",
      unitPriceSnapshot: variant?.price ?? product.basePrice,
      qty: item.qty,
    });
  }

  const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });
  const totals = calculateOrderTotals(
    resolvedItems.map((i) => ({ unitPrice: i.unitPriceSnapshot, qty: i.qty })),
    deliveryMethod,
    settings.shippingFlatRate
  );

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      // Atomically decrement stock inside the transaction: the `gte` guard
      // means a concurrent checkout can't push stock below zero — if two
      // buyers race for the last unit, the loser's updateMany matches zero
      // rows and the whole order is rolled back with a clear error.
      for (const item of resolvedItems) {
        const product = productById.get(item.productId)!;
        if (product.availabilityMode === "STOCK") {
          const updated = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });
          if (updated.count === 0) {
            throw new CheckoutError(`Stok "${product.name}" tidak mencukupi.`);
          }
        }
      }

      // Preorder reservations don't count against stock or trigger payment
      // yet — they add to the product's running quota instead.
      if (isPreorderOrder) {
        const preorderProductId = resolvedItems[0].productId;
        const totalQty = resolvedItems.reduce((sum, i) => sum + i.qty, 0);
        await tx.product.update({
          where: { id: preorderProductId },
          data: { preorderReservedQty: { increment: totalQty } },
        });
      }

      return tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          token: generateOrderToken(),
          buyerName,
          buyerAngkatan,
          buyerEmail,
          buyerWhatsapp,
          deliveryMethod,
          shippingAddress: deliveryMethod === "SHIPPING" ? shippingAddress : null,
          subtotal: totals.subtotal,
          shippingCost: totals.shippingCost,
          total: totals.total,
          status: isPreorderOrder ? "RESERVED" : "PENDING_PAYMENT",
          isPreorder: isPreorderOrder,
          items: {
            create: resolvedItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              vendorId: i.vendorId,
              productNameSnapshot: i.productNameSnapshot,
              variantLabelSnapshot: i.variantLabelSnapshot,
              unitPriceSnapshot: i.unitPriceSnapshot,
              qty: i.qty,
            })),
          },
        },
      });
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return { error: err.message };
    }
    throw err;
  }

  if (isPreorderOrder) {
    await sendPreorderReservationEmails(order.id);
    // Real-time check (not just the daily cron) so buyers get the payment
    // email the moment the quota is crossed, not up to a day later.
    await finalizePreorderRoundIfQuotaMet(resolvedItems[0].productId);
  } else {
    await sendOrderCreatedEmails(order.id);
  }

  return { orderToken: order.token };
}
