import { describe, it, expect } from "vitest";
import { calculateOrderTotals } from "../src/lib/money";

describe("calculateOrderTotals", () => {
  it("sums subtotal from items and adds no shipping for PICKUP", () => {
    const result = calculateOrderTotals(
      [{ unitPrice: 85000, qty: 2 }, { unitPrice: 50000, qty: 1 }],
      "PICKUP",
      20000
    );
    expect(result.subtotal).toBe(220000);
    expect(result.shippingCost).toBe(0);
    expect(result.total).toBe(220000);
  });

  it("adds the flat shipping rate for SHIPPING", () => {
    const result = calculateOrderTotals(
      [{ unitPrice: 85000, qty: 2 }],
      "SHIPPING",
      20000
    );
    expect(result.subtotal).toBe(170000);
    expect(result.shippingCost).toBe(20000);
    expect(result.total).toBe(190000);
  });

  it("returns zero totals for an empty cart", () => {
    const result = calculateOrderTotals([], "PICKUP", 20000);
    expect(result).toEqual({ subtotal: 0, shippingCost: 0, total: 0 });
  });

  it("throws if any item has qty <= 0", () => {
    expect(() =>
      calculateOrderTotals([{ unitPrice: 1000, qty: 0 }], "PICKUP", 20000)
    ).toThrow();
  });
});
