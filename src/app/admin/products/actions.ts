"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadBufferToBlobs, validateFileSignature, validateUploadFile } from "@/lib/blobs";
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
  preorderNote: z.string().optional(),
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
    // Derived from the ProductTypeSelector radio group (productType form-
    // wide), not a standalone checkbox — see product-form.tsx for why
    // regular-vs-preorder is now an explicit either/or choice.
    isPreorder: formData.get("productType") === "PREORDER",
    preorderMinQty: formData.get("preorderMinQty") || undefined,
    preorderNote: formData.get("preorderNote") || undefined,
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
    const signatureError = validateFileSignature(buffer, imageFile.type);
    if (signatureError) {
      return { error: signatureError };
    }
    imageUrl = await uploadBufferToBlobs(`product-images/${Date.now()}-${imageFile.name}`, buffer, imageFile.type);
  }

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const { availabilityMode, lastOrderAt, stock, isPreorder, preorderMinQty, preorderNote, ...productData } = parsed.data;

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
      preorderNote: isPreorder ? (preorderNote?.trim() || null) : null,
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
    isPreorder: formData.get("productType") === "PREORDER",
    preorderMinQty: formData.get("preorderMinQty") || undefined,
    preorderNote: formData.get("preorderNote") || undefined,
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
    const signatureError = validateFileSignature(buffer, imageFile.type);
    if (signatureError) {
      return { error: signatureError };
    }
    imageUrl = await uploadBufferToBlobs(`product-images/${Date.now()}-${imageFile.name}`, buffer, imageFile.type);
  }

  const { productId, availabilityMode, lastOrderAt, stock, isPreorder, preorderMinQty, preorderNote, ...productData } = parsed.data;

  // Same total-stock invariant enforced from the other direction (see
  // resolveVariantStock in the variant actions below): an admin lowering the
  // product's own stock number below what's already allocated across its
  // variants would otherwise silently leave the variant totals inconsistent.
  const newStock = availabilityMode === "STOCK" ? Number(stock) : null;
  if (newStock !== null) {
    const activeVariants = await prisma.productVariant.findMany({
      where: { productId, isActive: true },
      select: { stock: true },
    });
    const variantTotal = activeVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    if (variantTotal > newStock) {
      return {
        error: `Stok produk (${newStock}) lebih kecil dari total stok varian yang sudah diisi (${variantTotal}). Kurangi dulu stok varian, atau naikkan stok produk.`,
      };
    }
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        ...productData,
        ...(imageUrl ? { imageUrl } : {}),
        availabilityMode,
        lastOrderAt: availabilityMode === "LAST_ORDER_DATE" ? new Date(`${lastOrderAt}T23:59:59+07:00`) : null,
        stock: newStock,
        isPreorder,
        preorderMinQty: isPreorder ? Number(preorderMinQty) : null,
        preorderNote: isPreorder ? (preorderNote?.trim() || null) : null,
      },
    }),
    // Availability mode no longer STOCK — any per-variant stock numbers are
    // stale/unused from here on, so clear them rather than leaving them to
    // silently reappear if the product is switched back to STOCK later.
    ...(availabilityMode !== "STOCK"
      ? [prisma.productVariant.updateMany({ where: { productId }, data: { stock: null } })]
      : []),
  ]);

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
  // Manual display-order override (see lib/products.ts, which already
  // orders variants by this field) — added because auto-detecting the
  // "right" order (numeric for sandal sizes, XS..6XL for apparel) from a
  // free-text label isn't reliable across every product type vendors sell.
  sortOrder: z.string().optional(),
  // Only required/used when the parent product's availabilityMode is
  // STOCK — validated against that product's total stock below, since a
  // plain schema can't see the parent product's own fields or sibling
  // variants.
  stock: z.string().optional(),
});

// Shared by addVariant and updateVariant: resolves the raw "stock" form
// field into either a validated Int (or null, for a non-STOCK product) or
// an error message. Loads the parent product fresh from the DB rather than
// trusting anything the client sent, and sums only ACTIVE sibling variants
// (excludeVariantId lets an update exclude the variant's own prior value)
// since inactive variants aren't orderable and shouldn't count against the
// total.
async function resolveVariantStock(
  productId: string,
  rawStock: string | undefined,
  excludeVariantId?: string
): Promise<{ stock: number | null; error?: string }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { availabilityMode: true, stock: true },
  });
  if (!product) {
    return { stock: null, error: "Produk tidak ditemukan." };
  }
  if (product.availabilityMode !== "STOCK") {
    return { stock: null };
  }

  const stockNum = Number(rawStock);
  if (!rawStock || Number.isNaN(stockNum) || stockNum < 0) {
    return { stock: null, error: "Stok varian wajib diisi untuk produk dengan Ketersediaan Stok Terbatas." };
  }

  const siblingVariants = await prisma.productVariant.findMany({
    where: { productId, isActive: true, ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}) },
    select: { stock: true },
  });
  const othersTotal = siblingVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  const total = othersTotal + stockNum;
  const productStock = product.stock ?? 0;
  if (total > productStock) {
    return {
      stock: null,
      error: `Total stok varian (${total}) melebihi stok produk (${productStock}).`,
    };
  }

  return { stock: stockNum };
}

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
    sortOrder: formData.get("sortOrder") || undefined,
    stock: formData.get("stock") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const stockResult = await resolveVariantStock(parsed.data.productId, parsed.data.stock);
  if (stockResult.error) {
    return { error: stockResult.error };
  }

  await prisma.productVariant.create({
    data: {
      productId: parsed.data.productId,
      label: parsed.data.label,
      price: parsed.data.price,
      sortOrder: parsed.data.sortOrder ? Number(parsed.data.sortOrder) : 0,
      stock: stockResult.stock,
    },
  });
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
  sortOrder: z.string().optional(),
  stock: z.string().optional(),
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
    sortOrder: formData.get("sortOrder") || undefined,
    stock: formData.get("stock") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  // productId is looked up server-side from the variant itself rather than
  // trusted from the client, so a tampered form field can't point the stock
  // validation at a different product.
  const existing = await prisma.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    select: { productId: true },
  });
  if (!existing) {
    return { error: "Varian tidak ditemukan." };
  }

  const stockResult = await resolveVariantStock(existing.productId, parsed.data.stock, parsed.data.variantId);
  if (stockResult.error) {
    return { error: stockResult.error };
  }

  await prisma.productVariant.update({
    where: { id: parsed.data.variantId },
    data: {
      label: parsed.data.label,
      price: parsed.data.price,
      sortOrder: parsed.data.sortOrder ? Number(parsed.data.sortOrder) : 0,
      stock: stockResult.stock,
    },
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}
