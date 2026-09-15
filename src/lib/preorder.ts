// Pure preorder progress calculation — no prisma import, same rationale as
// product-sort.ts, so it can be unit-tested without a live Prisma engine.

export interface PreorderProgress {
  reserved: number;
  min: number;
  remaining: number;
  isQuotaMet: boolean;
}

// Returns null for a non-preorder product (preorderMinQty unset).
export function getPreorderProgress(product: {
  preorderMinQty: number | null;
  preorderReservedQty: number;
}): PreorderProgress | null {
  if (product.preorderMinQty == null) {
    return null;
  }
  const min = product.preorderMinQty;
  const reserved = product.preorderReservedQty;
  return {
    reserved,
    min,
    remaining: Math.max(0, min - reserved),
    isQuotaMet: reserved >= min,
  };
}
