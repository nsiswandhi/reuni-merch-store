import { describe, it, expect } from "vitest";
import { getPreorderProgress } from "../src/lib/preorder";

describe("getPreorderProgress", () => {
  it("returns null for a non-preorder product (no minimum quota set)", () => {
    expect(getPreorderProgress({ preorderMinQty: null, preorderReservedQty: 0 })).toBeNull();
  });

  it("reports progress and remaining slots below quota", () => {
    const progress = getPreorderProgress({ preorderMinQty: 36, preorderReservedQty: 20 });
    expect(progress).toEqual({ reserved: 20, min: 36, remaining: 16, isQuotaMet: false });
  });

  it("reports quota met with zero remaining exactly at the minimum", () => {
    const progress = getPreorderProgress({ preorderMinQty: 36, preorderReservedQty: 36 });
    expect(progress).toEqual({ reserved: 36, min: 36, remaining: 0, isQuotaMet: true });
  });

  it("clamps remaining at zero when reserved exceeds the minimum", () => {
    const progress = getPreorderProgress({ preorderMinQty: 36, preorderReservedQty: 50 });
    expect(progress).toEqual({ reserved: 50, min: 36, remaining: 0, isQuotaMet: true });
  });
});
