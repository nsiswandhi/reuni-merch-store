import { describe, it, expect } from "vitest";
import { parseProductSort, sortProducts } from "../src/lib/product-sort";

type FakeProduct = {
  name: string;
  basePrice: number;
  variants: { price: number }[];
  vendor: { brandName: string };
};

const products: FakeProduct[] = [
  { name: "Kaos", basePrice: 120000, variants: [], vendor: { brandName: "Zeta Merch" } },
  { name: "Tumbler", basePrice: 85000, variants: [{ price: 90000 }, { price: 95000 }], vendor: { brandName: "Alpha Craft" } },
  { name: "Bucket Hat", basePrice: 100000, variants: [], vendor: { brandName: "Mitra Store" } },
];

describe("parseProductSort", () => {
  it("accepts a recognized sort value", () => {
    expect(parseProductSort("harga-asc")).toBe("harga-asc");
    expect(parseProductSort("nama")).toBe("nama");
  });

  it("defaults to terbaru for missing or unrecognized values (including the removed 'vendor' sort)", () => {
    expect(parseProductSort(undefined)).toBe("terbaru");
    expect(parseProductSort("not-a-real-option")).toBe("terbaru");
    expect(parseProductSort("vendor")).toBe("terbaru");
  });

  it("takes the first value when given an array (repeated query param)", () => {
    expect(parseProductSort(["nama", "harga-asc"])).toBe("nama");
  });
});

describe("sortProducts", () => {
  it("sorts by lowest display price ascending", () => {
    const result = sortProducts(products, "harga-asc");
    expect(result.map((p) => p.name)).toEqual(["Tumbler", "Bucket Hat", "Kaos"]);
  });

  it("sorts by lowest display price descending", () => {
    const result = sortProducts(products, "harga-desc");
    expect(result.map((p) => p.name)).toEqual(["Kaos", "Bucket Hat", "Tumbler"]);
  });

  it("sorts by product name A-Z", () => {
    const result = sortProducts(products, "nama");
    expect(result.map((p) => p.name)).toEqual(["Bucket Hat", "Kaos", "Tumbler"]);
  });

  it("leaves order unchanged for terbaru (already sorted by the query)", () => {
    const result = sortProducts(products, "terbaru");
    expect(result.map((p) => p.name)).toEqual(["Kaos", "Tumbler", "Bucket Hat"]);
  });

  it("does not mutate the input array", () => {
    const original = [...products];
    sortProducts(products, "harga-asc");
    expect(products).toEqual(original);
  });
});
