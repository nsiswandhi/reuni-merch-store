"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCart, CartConflictError } from "@/lib/cart";
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
  isPreorder = false,
  preorderProgress,
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
  isPreorder?: boolean;
  preorderProgress?: { reserved: number; min: number } | null;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [qty, setQty] = useState(maxQty !== undefined ? Math.min(1, maxQty) : 1);
  const [cartError, setCartError] = useState<string | null>(null);

  function handleAdd() {
    const variant = variants.find((v) => v.id === variantId) ?? null;
    try {
      addToCart({
        itemKey: `${productId}:${variant?.id ?? "none"}`,
        productId,
        productSlug,
        productName,
        vendorBrandName,
        vendorAllowsPickup,
        isPreorder,
        variantId: variant?.id ?? null,
        variantLabel: variant?.label ?? "",
        unitPrice: variant?.price ?? basePrice,
        qty,
      });
    } catch (err) {
      if (err instanceof CartConflictError) {
        setCartError(err.message);
        return;
      }
      throw err;
    }
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
      {isPreorder && preorderProgress && (
        <p className="text-xs text-gray-500">
          Sudah dipesan: {preorderProgress.reserved} dari minimal {preorderProgress.min} pcs. Belum perlu bayar — kami kirim email begitu kuota terpenuhi.
        </p>
      )}
      {cartError && <p className="text-sm text-red-600">{cartError}</p>}
      <button
        onClick={handleAdd}
        className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white"
      >
        {isPreorder ? "Pesan" : "Tambah ke Keranjang"}
      </button>
    </div>
  );
}
