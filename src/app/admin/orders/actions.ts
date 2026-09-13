"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canConfirmPayment, canRejectProof } from "@/lib/order-status";
import { sendPaymentConfirmedEmails, sendProofRejectedEmail } from "@/lib/email";

export async function confirmPayment(orderId: string): Promise<void> {
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
