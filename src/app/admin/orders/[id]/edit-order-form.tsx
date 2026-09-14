"use client";

import { useState } from "react";
import { updateOrderDetails } from "../actions";

type DeliveryMethod = "PICKUP" | "SHIPPING";

interface OrderFields {
  id: string;
  buyerName: string;
  buyerAngkatan: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress: string | null;
}

export function EditOrderForm({ order }: { order: OrderFields }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(order.deliveryMethod);

  async function handleSubmit(formData: FormData) {
    formData.set("orderId", order.id);
    const result = await updateOrderDetails(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-sm underline">
        Edit Data Pembeli
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="mb-6 flex flex-col gap-2 rounded border border-gray-200 p-4">
      <h2 className="font-semibold">Edit Data Pembeli &amp; Pengiriman</h2>
      <input name="buyerName" defaultValue={order.buyerName} required placeholder="Nama pembeli" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="buyerAngkatan" defaultValue={order.buyerAngkatan} required placeholder="Angkatan" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="buyerEmail" type="email" defaultValue={order.buyerEmail} required placeholder="Email" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="buyerWhatsapp" defaultValue={order.buyerWhatsapp} required placeholder="No. WhatsApp" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <select
        name="deliveryMethod"
        value={deliveryMethod}
        onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="PICKUP">Ambil Sendiri</option>
        <option value="SHIPPING">Dikirim</option>
      </select>
      {deliveryMethod === "SHIPPING" && (
        <input
          name="shippingAddress"
          defaultValue={order.shippingAddress ?? ""}
          required
          placeholder="Alamat pengiriman"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-[#124B23] px-3 py-1 text-sm text-white">Simpan</button>
        <button type="button" onClick={() => setEditing(false)} className="rounded border border-gray-300 px-3 py-1 text-sm">Batal</button>
      </div>
    </form>
  );
}
