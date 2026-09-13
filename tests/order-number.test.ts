import { describe, it, expect } from "vitest";
import { generateOrderToken, generateOrderNumber } from "../src/lib/order-number";

describe("generateOrderToken", () => {
  it("generates a URL-safe string at least 24 characters long", () => {
    const token = generateOrderToken();
    expect(token.length).toBeGreaterThanOrEqual(24);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates different tokens on each call", () => {
    const a = generateOrderToken();
    const b = generateOrderToken();
    expect(a).not.toBe(b);
  });
});

describe("generateOrderNumber", () => {
  it("starts with INV- prefix", () => {
    expect(generateOrderNumber()).toMatch(/^INV-/);
  });

  it("generates different order numbers on each call", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
  });
});
