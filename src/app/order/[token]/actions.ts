"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canUploadProof } from "@/lib/order-status";
import { validateFileSignature, validateUploadFile, uploadBufferToBlobs } from "@/lib/blobs";
import { sendProofUploadedNotificationToAdmin } from "@/lib/email";

export async function uploadPaymentProof(orderToken: string, formData: FormData): Promise<{ error?: string }> {
  const order = await prisma.order.findUnique({ where: { token: orderToken } });
  if (!order) {
    return { error: "Order tidak ditemukan." };
  }
  if (!canUploadProof(order.status)) {
    return { error: "Order ini tidak bisa menerima upload bukti transfer saat ini." };
  }

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file bukti transfer terlebih dahulu." };
  }

  const validationError = validateUploadFile(file);
  if (validationError) {
    return { error: validationError };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signatureError = validateFileSignature(buffer, file.type);
  if (signatureError) {
    return { error: signatureError };
  }
  const key = `payment-proofs/${order.id}-${Date.now()}`;
  const url = await uploadBufferToBlobs(key, buffer, file.type);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentProofUrl: url,
      proofUploadedAt: new Date(),
      status: "AWAITING_CONFIRMATION",
    },
  });

  await sendProofUploadedNotificationToAdmin(order.id);

  revalidatePath(`/order/${orderToken}`);
  return {};
}
