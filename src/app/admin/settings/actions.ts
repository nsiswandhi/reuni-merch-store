"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/current-user";
import { uploadBufferToBlobs, validateFileSignature, validateUploadFile } from "@/lib/blobs";

const settingsSchema = z.object({
  bankName: z.string().min(1),
  bankAccountNumber: z.string().min(1),
  bankAccountName: z.string().min(1),
  shippingFlatRate: z.coerce.number().int().min(0),
  adminNotificationEmail: z.string().email(),
});

export async function updateSettings(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const parsed = settingsSchema.safeParse({
    bankName: formData.get("bankName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    bankAccountName: formData.get("bankAccountName"),
    shippingFlatRate: formData.get("shippingFlatRate"),
    adminNotificationEmail: formData.get("adminNotificationEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  // QRIS is an optional payment method image — only replace it when a new
  // file was chosen; leave the existing one alone otherwise.
  let qrisImageUrl: string | undefined;
  const qrisImage = formData.get("qrisImage");
  if (qrisImage instanceof File && qrisImage.size > 0) {
    const validationError = validateUploadFile(qrisImage);
    if (validationError) {
      return { error: validationError };
    }
    const buffer = Buffer.from(await qrisImage.arrayBuffer());
    const signatureError = validateFileSignature(buffer, qrisImage.type);
    if (signatureError) {
      return { error: signatureError };
    }
    qrisImageUrl = await uploadBufferToBlobs(`qris/${Date.now()}-${qrisImage.name}`, buffer, qrisImage.type);
  }

  await prisma.adminSettings.update({
    where: { id: "singleton" },
    data: { ...parsed.data, ...(qrisImageUrl ? { qrisImageUrl } : {}) },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/order/[token]", "page");
  return {};
}

export async function removeQrisImage(): Promise<void> {
  await requireAdmin();
  await prisma.adminSettings.update({ where: { id: "singleton" }, data: { qrisImageUrl: null } });
  revalidatePath("/admin/settings");
  revalidatePath("/order/[token]", "page");
}
