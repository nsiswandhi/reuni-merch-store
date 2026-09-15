"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PRODUCT_SORT_OPTIONS, type ProductSortOption } from "@/lib/products";

export function SortSelect({ current }: { current: ProductSortOption }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Preserve any other query params (e.g. ?vendor=...) instead of
    // overwriting the URL outright — VendorFilterSelect does the mirror of
    // this for its own param.
    const params = new URLSearchParams(searchParams.toString());
    // "terbaru" is the default, so drop the query param entirely rather
    // than writing a redundant ?sort=terbaru into the URL.
    if (e.target.value === "terbaru") {
      params.delete("sort");
    } else {
      params.set("sort", e.target.value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label="Urutkan produk"
      className="rounded border border-gray-300 px-3 py-2 text-sm"
    >
      {PRODUCT_SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
