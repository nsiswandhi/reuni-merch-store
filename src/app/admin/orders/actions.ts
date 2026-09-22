"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canConfirmPayment, canRejectProof, canCancelOrder } from "@/lib/order-status";
import { sendPaymentConfirmedEmails, sendProofRejectedEmail, sendOrderCancelledEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/auth/current-user";
import { savePaymentProofFile } from "@/lib/payment-proof";

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

// For buyers who couldn't complete the upload themselves and sent the proof
// straight to admin instead — shares the exact same validation/storage
// logic as the buyer's own upload (see src/lib/payment-proof.ts), so it's
// only allowed from the same PENDING_PAYMENT state the buyer flow requires.
// Deliberately doesn't send the "new proof uploaded, go check it" admin
// notification email the buyer path sends — the admin doing this upload
// already knows.
export async function adminUploadPaymentProof(orderId: string, formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { error: "Order tidak ditemukan." };
  }

  const result = await savePaymentProofFile(order, formData.get("proof"));
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}

// Reopens an EXPIRED order (buyer never paid in time) back to
// PENDING_PAYMENT so it can accept a payment proof again — the counterpart
// to the daily cron's EXPIRE step, and to cancelOrder's stock release,
// undone here in reverse:
// - Re-reserves the stock the EXPIRE step gave back, guarded the same way
//   checkout does (a conditional updateMany with a `stock >= qty` check) so
//   this can't push stock negative if it was sold to someone else in the
//   meantime — that's reported back as a real error, not silently ignored.
// - Resets reminderCount and restarts the payment window (paymentDueStartedAt
//   = now), since otherwise the age-based reminder/expire cron would just
//   see a still-ancient createdAt and expire it again on its very next run.
// EXPIRED orders only ever came from PENDING_PAYMENT (see the cron job —
// RESERVED preorders never auto-expire), so there's no preorder quota to
// restore here, unlike cancelOrder's RESERVED-specific branch.
export async function reactivateExpiredOrder(orderId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.status !== "EXPIRED") {
    return { error: "Order tidak dalam status Kedaluwarsa." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, availabilityMode: "STOCK", stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (result.count === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { availabilityMode: true, stock: true },
          });
          if (product?.availabilityMode === "STOCK") {
            throw new Error(
              `Stok "${item.productNameSnapshot}" tidak cukup untuk mengaktifkan kembali order ini (tersisa ${product.stock ?? 0}, butuh ${item.qty}).`
            );
          }
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PENDING_PAYMENT",
          reminderCount: 0,
          paymentDueStartedAt: new Date(),
        },
      });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal mengaktifkan kembali order." };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}
