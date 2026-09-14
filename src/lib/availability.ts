export type AvailabilityMode = "ALWAYS" | "LAST_ORDER_DATE" | "STOCK";

export interface AvailabilityInfo {
  isAvailable: boolean;
  reasonLabel?: string;
  remainingStock?: number;
}

/**
 * Pure function shared by the product detail page (to disable the order
 * button) and the checkout server action (to re-validate authoritatively
 * before accepting an order).
 */
export function getProductAvailability(
  product: {
    availabilityMode: AvailabilityMode;
    lastOrderAt: Date | null;
    stock: number | null;
  },
  now: Date = new Date()
): AvailabilityInfo {
  if (product.availabilityMode === "LAST_ORDER_DATE") {
    const isAvailable = product.lastOrderAt ? now <= product.lastOrderAt : true;
    return { isAvailable, reasonLabel: isAvailable ? undefined : "Pemesanan sudah ditutup" };
  }
  if (product.availabilityMode === "STOCK") {
    const stock = product.stock ?? 0;
    return {
      isAvailable: stock > 0,
      remainingStock: stock,
      reasonLabel: stock > 0 ? undefined : "Stok habis",
    };
  }
  return { isAvailable: true };
}
