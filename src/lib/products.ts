import { prisma } from "@/lib/prisma";

export async function getActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: {
      vendor: true,
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      vendor: true,
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export function getDisplayPriceRange(product: {
  basePrice: number;
  variants: { price: number }[];
}): { min: number; max: number } {
  if (product.variants.length === 0) {
    return { min: product.basePrice, max: product.basePrice };
  }
  const prices = product.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
