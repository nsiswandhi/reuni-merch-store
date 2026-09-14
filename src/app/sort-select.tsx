"use client";

import { useRouter, usePathname } from "next/navigation";
import { PRODUCT_SORT_OPTIONS, type ProductSortOption } from "@/lib/products";

export function SortSelect({ current }: { current: ProductSortOption }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    // "terbaru" is the default, so drop the query param entirely rather
    // than writing a redundant ?sort=terbaru into the URL.
    router.push(value === "terbaru" ? pathname : `${pathname}?sort=${value}`);
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
