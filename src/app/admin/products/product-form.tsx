"use client";

import { useState } from "react";
import { createProduct, addVariant } from "./actions";

export function NewProductForm({ vendors }: { vendors: { id: string; brandName: string }[] }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createProduct(formData);
    setError(result.error ?? null);
  }

  return (
    <form action={handleSubmit} className="mb-6 flex flex-col gap-2 rounded border border-gray-200 p-4">
      <h2 className="font-semibold">Tambah Produk</h2>
      <select name="vendorId" required className="rounded border border-gray-300 px-3 py-2">
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>{v.brandName}</option>
        ))}
      </select>
      <input name="name" placeholder="Nama produk" required className="rounded border border-gray-300 px-3 py-2" />
      <textarea name="description" placeholder="Deskripsi" className="rounded border border-gray-300 px-3 py-2" />
      <input name="basePrice" type="number" placeholder="Harga dasar (dipakai kalau tanpa varian)" required className="rounded border border-gray-300 px-3 py-2" />
      <input name="image" type="file" accept="image/*" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white">Simpan Produk</button>
    </form>
  );
}

export function NewVariantForm({ productId }: { productId: string }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("productId", productId);
    const result = await addVariant(formData);
    setError(result.error ?? null);
  }

  return (
    <form action={handleSubmit} className="mt-2 flex items-center gap-2">
      <input name="label" placeholder="Label varian (mis. L / Hitam)" required className="rounded border border-gray-300 px-2 py-1 text-sm" />
      <input name="price" type="number" placeholder="Harga" required className="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
      <button type="submit" className="rounded bg-gray-700 px-3 py-1 text-sm text-white">Tambah Varian</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
