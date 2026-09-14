"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/current-user";

const createVendorSchema = z.object({
  brandName: z.string().min(1),
  ownerName: z.string().min(1),
  angkatan: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function createVendor(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

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
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

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

const updateVendorSchema = z.object({
  vendorId: z.string().min(1),
  brandName: z.string().min(1),
  ownerName: z.string().min(1),
  angkatan: z.string().min(1),
  email: z.string().email(),
});

export async function updateVendor(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const parsed = updateVendorSchema.safeParse({
    vendorId: formData.get("vendorId"),
    brandName: formData.get("brandName"),
    ownerName: formData.get("ownerName"),
    angkatan: formData.get("angkatan"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { vendorId, ...rest } = parsed.data;

  // Email doubles as the vendor's login username, so it must stay unique —
  // check against every OTHER vendor, not just any existing row.
  const existing = await prisma.vendor.findUnique({ where: { email: rest.email } });
  if (existing && existing.id !== vendorId) {
    return { error: "Email vendor sudah dipakai." };
  }

  await prisma.vendor.update({ where: { id: vendorId }, data: rest });
  revalidatePath("/admin/vendors");
  return {};
}

export async function deactivateVendor(vendorId: string): Promise<void> {
  await requireAdmin();
  await prisma.vendor.update({ where: { id: vendorId }, data: { isActive: false } });
  revalidatePath("/admin/vendors");
}

export async function reactivateVendor(vendorId: string): Promise<void> {
  await requireAdmin();
  await prisma.vendor.update({ where: { id: vendorId }, data: { isActive: true } });
  revalidatePath("/admin/vendors");
}
