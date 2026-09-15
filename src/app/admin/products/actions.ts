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

const productBaseFields = z.object({
  vendorId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  basePrice: z.coerce.number().int().min(1),
  availabilityMode: z.enum(["ALWAYS", "LAST_ORDER_DATE", "STOCK"]).default("ALWAYS"),
  lastOrderAt: z.string().optional(),
  stock: z.string().optional(),
  isPreorder: z.boolean().default(false),
  preorderMinQty: z.string().optional(),
});

// Shared by create and update — one place defining what "valid availability
// fields" means, so the two schemas can't drift out of sync with each other.
function checkAvailabilityFields(
  data: { availabilityMode: "ALWAYS" | "LAST_ORDER_DATE" | "STOCK"; lastOrderAt?: string; stock?: string },
  ctx: z.RefinementCtx
) {
  if (data.availabilityMode === "LAST_ORDER_DATE" && !data.lastOrderAt) {
    ctx.addIssue({ code: "custom", message: "Tanggal batas order wajib diisi.", path: ["lastOrderAt"] });
  }
  if (data.availabilityMode === "STOCK") {
    const stockNum = Number(data.stock);
    if (!data.stock || Number.isNaN(stockNum) || stockNum < 0) {
      ctx.addIssue({ code: "custom", message: "Jumlah stok wajib diisi.", path: ["stock"] });
    }
  }
}

function checkPreorderFields(
  data: { isPreorder: boolean; preorderMinQty?: string },
  ctx: z.RefinementCtx
) {
  if (data.isPreorder) {
    const qty = Number(data.preorderMinQty);
    if (!data.preorderMinQty || Number.isNaN(qty) || qty < 1) {
      ctx.addIssue({ code: "custom", message: "Kuota minimum preorder wajib diisi.", path: ["preorderMinQty"] });
    }
  }
}

function checkProductFields(
  data: {
    availabilityMode: "ALWAYS" | "LAST_ORDER_DATE" | "STOCK";
    lastOrderAt?: string;
    stock?: string;
    isPreorder: boolean;
    preorderMinQty?: string;
  },
  ctx: z.RefinementCtx
) {
  checkAvailabilityFields(data, ctx);
  checkPreorderFields(data, ctx);
}

const productSchema = productBaseFields.superRefine(checkProductFields);
const updateProductSchema = productBaseFields
  .extend({ productId: z.string().min(1) })
  .superRefine(checkProductFields);

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
    availabilityMode: formData.get("availabilityMode") || undefined,
    lastOrderAt: formData.get("lastOrderAt") || undefined,
    stock: formData.get("stock") || undefined,
    isPreorder: formData.get("isPreorder") === "on",
    preorderMinQty: formData.get("preorderMinQty") || undefined,
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

  const { availabilityMode, lastOrderAt, stock, isPreorder, preorderMinQty, ...productData } = parsed.data;

  await prisma.product.create({
    data: {
      ...productData,
      slug,
      imageUrl,
      availabilityMode,
      // Stored as end-of-day WIB (UTC+7) so the deadline covers the whole
      // Indonesia-local day the admin picked, not just until UTC midnight.
      lastOrderAt: availabilityMode === "LAST_ORDER_DATE" ? new Date(`${lastOrderAt}T23:59:59+07:00`) : null,
      stock: availabilityMode === "STOCK" ? Number(stock) : null,
      isPreorder,
      preorderMinQty: isPreorder ? Number(preorderMinQty) : null,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}

export async function updateProduct(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    vendorId: formData.get("vendorId"),
    name: formData.get("name"),
    description: formData.get("description"),
    basePrice: formData.get("basePrice"),
    availabilityMode: formData.get("availabilityMode") || undefined,
    lastOrderAt: formData.get("lastOrderAt") || undefined,
    stock: formData.get("stock") || undefined,
    isPreorder: formData.get("isPreorder") === "on",
    preorderMinQty: formData.get("preorderMinQty") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  // Image is optional on edit — only replace it when a new file was chosen.
  let imageUrl: string | undefined;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    const validationError = validateUploadFile(imageFile);
    if (validationError) {
      return { error: validationError };
    }
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    imageUrl = await uploadBufferToBlobs(`product-images/${Date.now()}-${imageFile.name}`, buffer, imageFile.type);
  }

  const { productId, availabilityMode, lastOrderAt, stock, isPreorder, preorderMinQty, ...productData } = parsed.data;

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...productData,
      ...(imageUrl ? { imageUrl } : {}),
      availabilityMode,
      lastOrderAt: availabilityMode === "LAST_ORDER_DATE" ? new Date(`${lastOrderAt}T23:59:59+07:00`) : null,
      stock: availabilityMode === "STOCK" ? Number(stock) : null,
      isPreorder,
      preorderMinQty: isPreorder ? Number(preorderMinQty) : null,
    },
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

export async function reactivateProduct(productId: string): Promise<void> {
  await requireAdmin();
  await prisma.product.update({ where: { id: productId }, data: { isActive: true } });
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

export async function reactivateVariant(variantId: string): Promise<void> {
  await requireAdmin();
  await prisma.productVariant.update({ where: { id: variantId }, data: { isActive: true } });
  revalidatePath("/admin/products");
  revalidatePath("/");
}

const updateVariantSchema = z.object({
  variantId: z.string().min(1),
  label: z.string().min(1),
  price: z.coerce.number().int().min(1),
});

export async function updateVariant(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Tidak diizinkan." };
  }

  const parsed = updateVariantSchema.safeParse({
    variantId: formData.get("variantId"),
    label: formData.get("label"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const { variantId, ...rest } = parsed.data;
  await prisma.productVariant.update({ where: { id: variantId }, data: rest });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}
