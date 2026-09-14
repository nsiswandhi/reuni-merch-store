import { describe, it, expect } from "vitest";
import { getProductAvailability } from "../src/lib/availability";

describe("getProductAvailability", () => {
  it("is always available in ALWAYS mode", () => {
    const result = getProductAvailability({ availabilityMode: "ALWAYS", lastOrderAt: null, stock: null });
    expect(result.isAvailable).toBe(true);
  });

  describe("LAST_ORDER_DATE mode", () => {
    const lastOrderAt = new Date("2026-09-20T16:59:59Z"); // end of day WIB

    it("is available before the deadline", () => {
      const now = new Date("2026-09-20T10:00:00Z");
      const result = getProductAvailability({ availabilityMode: "LAST_ORDER_DATE", lastOrderAt, stock: null }, now);
      expect(result.isAvailable).toBe(true);
    });

    it("is available exactly at the deadline", () => {
      const result = getProductAvailability(
        { availabilityMode: "LAST_ORDER_DATE", lastOrderAt, stock: null },
        lastOrderAt
      );
      expect(result.isAvailable).toBe(true);
    });

    it("is unavailable after the deadline", () => {
      const now = new Date("2026-09-21T00:00:00Z");
      const result = getProductAvailability({ availabilityMode: "LAST_ORDER_DATE", lastOrderAt, stock: null }, now);
      expect(result.isAvailable).toBe(false);
      expect(result.reasonLabel).toBe("Pemesanan sudah ditutup");
    });
  });

  describe("STOCK mode", () => {
    it("is available with remaining stock", () => {
      const result = getProductAvailability({ availabilityMode: "STOCK", lastOrderAt: null, stock: 5 });
      expect(result.isAvailable).toBe(true);
      expect(result.remainingStock).toBe(5);
    });

    it("is unavailable at zero stock", () => {
      const result = getProductAvailability({ availabilityMode: "STOCK", lastOrderAt: null, stock: 0 });
      expect(result.isAvailable).toBe(false);
      expect(result.reasonLabel).toBe("Stok habis");
    });

    it("treats null stock as zero", () => {
      const result = getProductAvailability({ availabilityMode: "STOCK", lastOrderAt: null, stock: null });
      expect(result.isAvailable).toBe(false);
    });
  });
});
