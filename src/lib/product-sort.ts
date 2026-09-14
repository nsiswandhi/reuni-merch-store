// Pure catalog display/sort logic — deliberately free of any "@/lib/prisma"
// import (unlike products.ts) so it can be unit-tested without touching a
// real Prisma engine, matching the pattern used by money.ts and
// availability.ts.

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

export type ProductSortOption = "terbaru" | "harga-asc" | "harga-desc" | "vendor" | "nama";

export const PRODUCT_SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: "terbaru", label: "Terbaru" },
  { value: "harga-asc", label: "Harga: Rendah ke Tinggi" },
  { value: "harga-desc", label: "Harga: Tinggi ke Rendah" },
  { value: "vendor", label: "Nama Vendor (A-Z)" },
  { value: "nama", label: "Nama Produk (A-Z)" },
];

// Falls back to "terbaru" for anything missing or unrecognized — e.g. a
// hand-edited or stale ?sort= query value.
export function parseProductSort(value: string | string[] | undefined): ProductSortOption {
  const candidate = Array.isArray(value) ? value[0] : value;
  return PRODUCT_SORT_OPTIONS.some((option) => option.value === candidate)
    ? (candidate as ProductSortOption)
    : "terbaru";
}

// Sorts a copy of the list — never mutates the array the caller passed in.
// "terbaru" is a no-op here because getActiveProducts already orders by
// createdAt desc at the database level.
export function sortProducts<
  T extends { name: string; basePrice: number; variants: { price: number }[]; vendor: { brandName: string } },
>(products: T[], sort: ProductSortOption): T[] {
  const sorted = [...products];
  switch (sort) {
    case "harga-asc":
      return sorted.sort((a, b) => getDisplayPriceRange(a).min - getDisplayPriceRange(b).min);
    case "harga-desc":
      return sorted.sort((a, b) => getDisplayPriceRange(b).min - getDisplayPriceRange(a).min);
    case "vendor":
      return sorted.sort((a, b) => a.vendor.brandName.localeCompare(b.vendor.brandName, "id"));
    case "nama":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "id"));
    case "terbaru":
    default:
      return sorted;
  }
}
