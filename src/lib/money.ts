export interface OrderTotals {
  subtotal: number;
  shippingCost: number;
  total: number;
}

export function calculateOrderTotals(
  items: { unitPrice: number; qty: number }[],
  deliveryMethod: "PICKUP" | "SHIPPING",
  shippingFlatRate: number
): OrderTotals {
  for (const item of items) {
    if (item.qty <= 0) {
      throw new Error("Item quantity must be greater than zero");
    }
    if (item.unitPrice < 0) {
      throw new Error("Item unit price cannot be negative");
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const shippingCost = deliveryMethod === "SHIPPING" ? shippingFlatRate : 0;
  const total = subtotal + shippingCost;

  return { subtotal, shippingCost, total };
}
