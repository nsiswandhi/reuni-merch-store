"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  bankName: z.string().min(1),
  bankAccountNumber: z.string().min(1),
  bankAccountName: z.string().min(1),
  shippingFlatRate: z.coerce.number().int().min(0),
  adminNotificationEmail: z.string().email(),
});

export async function updateSettings(formData: FormData): Promise<{ error?: string }> {
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
  await prisma.adminSettings.update({ where: { id: "singleton" }, data: parsed.data });
  revalidatePath("/admin/settings");
  return {};
}
