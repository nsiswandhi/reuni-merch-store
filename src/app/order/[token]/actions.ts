"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { savePaymentProofFile } from "@/lib/payment-proof";
import { sendProofUploadedNotificationToAdmin } from "@/lib/email";

export async function uploadPaymentProof(orderToken: string, formData: FormData): Promise<{ error?: string }> {
  const order = await prisma.order.findUnique({ where: { token: orderToken } });
  if (!order) {
    return { error: "Order tidak ditemukan." };
  }

  const result = await savePaymentProofFile(order, formData.get("proof"));
  if (result.error) {
    return { error: result.error };
  }

  await sendProofUploadedNotificationToAdmin(order.id);

  revalidatePath(`/order/${orderToken}`);
  return {};
}
