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
  const [deliveryMethodChoice, setDeliveryMethodChoice] = useState<"PICKUP" | "SHIPPING">("PICKUP");
  const [state, formAction, pending] = useActionState(createOrder, initialState);

  // A cart item from before this feature shipped has no vendorAllowsPickup
  // in its stored JSON — treat that as "allowed" (today's behavior) rather
  // than silently blocking pickup for pre-existing carts.
  const mustShip = items.some((i) => i.vendorAllowsPickup === false);
  // Derived, not synced via effect: when the cart forces shipping, this
  // overrides whatever the buyer had picked before that became true.
  const deliveryMethod = mustShip ? "SHIPPING" : deliveryMethodChoice;

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
  const isPreorder = items.some((i) => i.isPreorder);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">
        {isPreorder ? "Pesan Preorder" : "Checkout"}
      </h1>
      {isPreorder && (
        <p className="mb-4 rounded border border-[#F3C21A] bg-[#F3C21A]/10 px-3 py-2 text-sm">
          Ini reservasi preorder — belum perlu bayar sekarang. Kami kirim email instruksi pembayaran begitu kuota minimum produk ini terpenuhi.
        </p>
      )}
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
          {!mustShip && (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="deliveryMethod"
                value="PICKUP"
                checked={deliveryMethod === "PICKUP"}
                onChange={() => setDeliveryMethodChoice("PICKUP")}
              />
              Ambil di Venue
            </label>
          )}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryMethod"
              value="SHIPPING"
              checked={deliveryMethod === "SHIPPING"}
              onChange={() => setDeliveryMethodChoice("SHIPPING")}
            />
            Dikirim
          </label>
        </fieldset>
        {mustShip && (
          <p className="text-sm text-gray-500">
            Salah satu vendor di keranjangmu hanya melayani pengiriman, jadi pesanan ini otomatis dikirim.
          </p>
        )}

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
          <p className="text-sm text-gray-500">
            {isPreorder ? "Total akan ditagihkan setelah kuota preorder terpenuhi." : "Ongkir dihitung otomatis kalau pilih Dikirim."}
          </p>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || items.length === 0}
          className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Memproses..." : isPreorder ? "Buat Reservasi" : "Buat Pesanan"}
        </button>
      </form>
    </main>
  );
}
