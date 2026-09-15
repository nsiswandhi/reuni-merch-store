"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canConfirmPayment, canRejectProof, canCancelOrder } from "@/lib/order-status";
import { sendPaymentConfirmedEmails, sendProofRejectedEmail, sendOrderCancelledEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/auth/current-user";

export async function confirmPayment(orderId: string): Promise<void> {
  await requireAdmin();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!canConfirmPayment(order.status)) {
    throw new Error("Order tidak dalam status yang bisa dikonfirmasi.");
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PAID", confirmedAt: new Date() },
  });
  await sendPaymentConfirmedEmails(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function rejectProof(orderId: string): Promise<void> {
  await requireAdmin();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!canRejectProof(order.status)) {
    throw new Error("Order tidak dalam status yang bisa ditolak buktinya.");
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PENDING_PAYMENT", paymentProofUrl: null, proofUploadedAt: null },
  });
  await sendProofRejectedEmail(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

// Buyer/shipping details only — money fields (subtotal/shippingCost/total),
// items, and status are never editable through this action.
const updateOrderDetailsSchema = z
  .object({
    orderId: z.string().min(1),
    buyerName: z.string().min(1, "Nama wajib diisi"),
    buyerAngkatan: z.string().min(1, "Angkatan wajib diisi"),
    buyerEmail: z.string().email("Email tidak valid"),
    buyerWhatsapp: z.string().min(8, "No. WhatsApp tidak valid"),
    deliveryMethod: z.enum(["PICKUP", "SHIPPING"]),
    shippingAddress: z.string().optional(),
  })
  .refine(
    (data) => data.deliveryMethod !== "SHIPPING" || (data.shippingAddress && data.shippingAddress.trim().length > 0),
    { message: "Alamat wajib diisi untuk pengiriman", path: ["shippingAddress"] }
  );

export async function updateOrderDetails(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const parsed = updateOrderDetailsSchema.safeParse({
    orderId: formData.get("orderId"),
    buyerName: formData.get("buyerName"),
    buyerAngkatan: formData.get("buyerAngkatan"),
    buyerEmail: formData.get("buyerEmail"),
    buyerWhatsapp: formData.get("buyerWhatsapp"),
    deliveryMethod: formData.get("deliveryMethod"),
    shippingAddress: formData.get("shippingAddress") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { orderId, deliveryMethod, shippingAddress, ...rest } = parsed.data;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      ...rest,
      deliveryMethod,
      shippingAddress: deliveryMethod === "SHIPPING" ? shippingAddress : null,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}

export async function cancelOrder(orderId: string): Promise<void> {
  await requireAdmin();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!canCancelOrder(order.status)) {
    throw new Error("Order tidak dalam status yang bisa dibatalkan.");
  }

  // Same stock-restoration pattern as the EXPIRE path in the daily cron job:
  // release any units this order reserved for STOCK-mode products. A
  // still-RESERVED (preorder, quota not met yet) order also gives back its
  // slot in the running quota count — safe only pre-seal, since once the
  // round transitions to PENDING_PAYMENT the counter has already been reset
  // for the *next* round and no longer refers to this order.
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
    ...order.items.map((item) =>
      prisma.product.updateMany({
        where: { id: item.productId, availabilityMode: "STOCK" },
        data: { stock: { increment: item.qty } },
      })
    ),
    ...(order.status === "RESERVED"
      ? order.items.map((item) =>
          prisma.product.updateMany({
            where: { id: item.productId, isPreorder: true },
            data: { preorderReservedQty: { decrement: item.qty } },
          })
        )
      : []),
  ]);

  await sendOrderCancelledEmail(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
