"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Sibling of SortSelect: same "preserve the other query param" approach, so
// picking a vendor doesn't clobber the current sort and vice versa.
export function VendorFilterSelect({
  vendors,
  current,
}: {
  vendors: { id: string; brandName: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "") {
      params.delete("vendor");
    } else {
      params.set("vendor", e.target.value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label="Filter vendor"
      className="rounded border border-gray-300 px-3 py-2 text-sm"
    >
      <option value="">Semua Vendor</option>
      {vendors.map((v) => (
        <option key={v.id} value={v.id}>
          {v.brandName}
        </option>
      ))}
    </select>
  );
}
