"use server";

import { prisma } from "@/lib/prisma";
import { calculateOrderTotals } from "@/lib/money";
import { generateOrderToken, generateOrderNumber } from "@/lib/order-number";
import { checkoutFormSchema } from "@/lib/checkout-schema";
import { sendOrderCreatedEmails } from "@/lib/email";

export interface CreateOrderState {
  error?: string;
  orderToken?: string;
}

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
    include: { variants: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

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

  const order = await prisma.order.create({
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

  await sendOrderCreatedEmails(order.id);

  return { orderToken: order.token };
}
