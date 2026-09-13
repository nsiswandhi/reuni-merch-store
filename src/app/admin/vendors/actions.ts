"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

const createVendorSchema = z.object({
  brandName: z.string().min(1),
  ownerName: z.string().min(1),
  angkatan: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function createVendor(formData: FormData): Promise<{ error?: string }> {
  const parsed = createVendorSchema.safeParse({
    brandName: formData.get("brandName"),
    ownerName: formData.get("ownerName"),
    angkatan: formData.get("angkatan"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const existing = await prisma.vendor.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Email vendor sudah dipakai." };
  }

  const { password, ...rest } = parsed.data;
  await prisma.vendor.create({
    data: { ...rest, passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin/vendors");
  return {};
}

const resetPasswordSchema = z.object({
  vendorId: z.string().min(1),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
});

export async function resetVendorPassword(formData: FormData): Promise<{ error?: string }> {
  const parsed = resetPasswordSchema.safeParse({
    vendorId: formData.get("vendorId"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  await prisma.vendor.update({
    where: { id: parsed.data.vendorId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  revalidatePath("/admin/vendors");
  return {};
}
