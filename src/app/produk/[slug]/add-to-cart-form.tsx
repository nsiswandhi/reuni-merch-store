"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCart } from "@/lib/cart";
import { QuantityStepper } from "@/components/quantity-stepper";

interface VariantOption {
  id: string;
  label: string;
  price: number;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export function AddToCartForm({
  productId,
  productSlug,
  productName,
  vendorBrandName,
  vendorAllowsPickup,
  basePrice,
  variants,
  available = true,
  unavailableReason,
  maxQty,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  vendorBrandName: string;
  vendorAllowsPickup: boolean;
  basePrice: number;
  variants: VariantOption[];
  available?: boolean;
  unavailableReason?: string;
  maxQty?: number;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [qty, setQty] = useState(maxQty !== undefined ? Math.min(1, maxQty) : 1);

  function handleAdd() {
    const variant = variants.find((v) => v.id === variantId) ?? null;
    addToCart({
      itemKey: `${productId}:${variant?.id ?? "none"}`,
      productId,
      productSlug,
      productName,
      vendorBrandName,
      vendorAllowsPickup,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? "",
      unitPrice: variant?.price ?? basePrice,
      qty,
    });
    router.push("/keranjang");
  }

  if (!available) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
          {unavailableReason ?? "Produk tidak tersedia"}
        </p>
        <button
          disabled
          className="rounded bg-gray-300 px-4 py-2 font-semibold text-gray-500"
        >
          Tambah ke Keranjang
        </button>
      </div>
    );
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
              {v.label} — {formatRupiah(v.price)}
            </option>
          ))}
        </select>
      )}
      <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
      {!vendorAllowsPickup && (
        <p className="text-xs text-gray-500">Produk ini hanya bisa dikirim (vendor tidak melayani ambil di venue).</p>
      )}
      <button
        onClick={handleAdd}
        className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white"
      >
        Tambah ke Keranjang
      </button>
    </div>
  );
}
