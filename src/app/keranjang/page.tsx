"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart, removeFromCart, updateCartQty, type CartItem } from "@/lib/cart";
import { QuantityStepper } from "@/components/quantity-stepper";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default function KeranjangPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Sync from localStorage (external system) on mount; SSR/hydration requires
    // the initial render to be empty, so this can't be a useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getCart());
  }, []);

  const grouped = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.vendorBrandName] ??= []).push(item);
    return acc;
  }, {});

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Keranjang</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">
          Keranjang kosong. <Link href="/" className="underline">Kembali belanja</Link>
        </p>
      ) : (
        <>
          {Object.entries(grouped).map(([vendorName, vendorItems]) => (
            <section key={vendorName} className="mb-6">
              <h2 className="mb-2 font-semibold text-gray-600">
                {vendorName}
                {vendorItems.some((i) => i.vendorAllowsPickup === false) && (
                  <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600">Hanya Dikirim</span>
                )}
              </h2>
              {vendorItems.map((item) => (
                <div key={item.itemKey} className="mb-2 flex items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.variantLabel && <p className="text-sm text-gray-500">{item.variantLabel}</p>}
                    <p className="text-sm">{formatRupiah(item.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <QuantityStepper
                      value={item.qty}
                      onChange={(next) => setItems(updateCartQty(item.itemKey, next))}
                    />
                    <button
                      onClick={() => setItems(removeFromCart(item.itemKey))}
                      className="text-sm text-red-600 underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
          <p className="mb-4 text-right text-lg font-semibold">Subtotal: {formatRupiah(subtotal)}</p>
          <Link
            href="/checkout"
            className="block rounded bg-[#124B23] px-4 py-2 text-center font-semibold text-white"
          >
            Lanjut ke Checkout
          </Link>
        </>
      )}
    </main>
  );
}
