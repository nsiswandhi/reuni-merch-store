import { prisma } from "@/lib/prisma";

export {
  getDisplayPriceRange,
  type ProductSortOption,
  PRODUCT_SORT_OPTIONS,
  parseProductSort,
  sortProducts,
} from "./product-sort";

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

