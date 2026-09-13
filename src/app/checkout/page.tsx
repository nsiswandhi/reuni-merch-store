"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCart, clearCart, type CartItem } from "@/lib/cart";
import { createOrder, type CreateOrderState } from "./actions";
import { useActionState } from "react";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

const initialState: CreateOrderState = {};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "SHIPPING">("PICKUP");
  const [state, formAction, pending] = useActionState(createOrder, initialState);

  useEffect(() => {
    const cart = getCart();
    if (cart.length === 0) {
      router.replace("/keranjang");
    }
    // Sync from localStorage (external system) on mount; SSR/hydration requires
    // the initial render to be empty, so this can't be a useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(cart);
  }, [router]);

  useEffect(() => {
    if (state.orderToken) {
      clearCart();
      router.push(`/order/${state.orderToken}`);
    }
  }, [state.orderToken, router]);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Checkout</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="cartItems" value={JSON.stringify(items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.qty,
        })))} />
        <input name="buyerName" placeholder="Nama" required className="rounded border border-gray-300 px-3 py-2" />
        <input name="buyerAngkatan" placeholder="Angkatan" required className="rounded border border-gray-300 px-3 py-2" />
        <input name="buyerEmail" type="email" placeholder="Email" required className="rounded border border-gray-300 px-3 py-2" />
        <input name="buyerWhatsapp" placeholder="No. WhatsApp" required className="rounded border border-gray-300 px-3 py-2" />

        <fieldset className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryMethod"
              value="PICKUP"
              checked={deliveryMethod === "PICKUP"}
              onChange={() => setDeliveryMethod("PICKUP")}
            />
            Ambil di Venue
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryMethod"
              value="SHIPPING"
              checked={deliveryMethod === "SHIPPING"}
              onChange={() => setDeliveryMethod("SHIPPING")}
            />
            Dikirim
          </label>
        </fieldset>

        {deliveryMethod === "SHIPPING" && (
          <textarea
            name="shippingAddress"
            placeholder="Alamat lengkap"
            required
            className="rounded border border-gray-300 px-3 py-2"
          />
        )}

        <div className="rounded border border-gray-200 p-3">
          <p>Subtotal: {formatRupiah(subtotal)}</p>
          <p className="text-sm text-gray-500">Ongkir dihitung otomatis kalau pilih Dikirim.</p>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || items.length === 0}
          className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Memproses..." : "Buat Pesanan"}
        </button>
      </form>
    </main>
  );
}
