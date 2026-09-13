"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCart } from "@/lib/cart";

interface VariantOption {
  id: string;
  label: string;
  price: number;
}

export function AddToCartForm({
  productId,
  productSlug,
  productName,
  vendorBrandName,
  basePrice,
  variants,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  vendorBrandName: string;
  basePrice: number;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);

  function handleAdd() {
    const variant = variants.find((v) => v.id === variantId) ?? null;
    addToCart({
      itemKey: `${productId}:${variant?.id ?? "none"}`,
      productId,
      productSlug,
      productName,
      vendorBrandName,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? "",
      unitPrice: variant?.price ?? basePrice,
      qty,
    });
    router.push("/keranjang");
  }

  return (
    <div className="flex flex-col gap-3">
      {variants.length > 0 && (
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      )}
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
        className="w-24 rounded border border-gray-300 px-3 py-2"
      />
      <button
        onClick={handleAdd}
        className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white"
      >
        Tambah ke Keranjang
      </button>
    </div>
  );
}
