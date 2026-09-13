"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadBufferToBlobs, validateUploadFile } from "@/lib/blobs";
import { requireAdmin } from "@/lib/auth/current-user";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const productSchema = z.object({
  vendorId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  basePrice: z.coerce.number().int().min(1),
});

export async function createProduct(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const parsed = productSchema.safeParse({
    vendorId: formData.get("vendorId"),
    name: formData.get("name"),
    description: formData.get("description"),
    basePrice: formData.get("basePrice"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  let imageUrl = "";
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    const validationError = validateUploadFile(imageFile);
    if (validationError) {
      return { error: validationError };
    }
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    imageUrl = await uploadBufferToBlobs(`product-images/${Date.now()}-${imageFile.name}`, buffer, imageFile.type);
  }

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  await prisma.product.create({
    data: { ...parsed.data, slug, imageUrl },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}

export async function deleteProduct(productId: string): Promise<void> {
  await requireAdmin();
  await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  revalidatePath("/admin/products");
  revalidatePath("/");
}

const variantSchema = z.object({
  productId: z.string().min(1),
  label: z.string().min(1),
  price: z.coerce.number().int().min(1),
});

export async function addVariant(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const parsed = variantSchema.safeParse({
    productId: formData.get("productId"),
    label: formData.get("label"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  await prisma.productVariant.create({ data: parsed.data });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}

export async function deleteVariant(variantId: string): Promise<void> {
  await requireAdmin();
  await prisma.productVariant.update({ where: { id: variantId }, data: { isActive: false } });
  revalidatePath("/admin/products");
  revalidatePath("/");
}
