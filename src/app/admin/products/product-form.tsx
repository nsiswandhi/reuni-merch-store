"use client";

import { useState } from "react";
import {
  createProduct,
  addVariant,
  updateProduct,
  deleteProduct,
  reactivateProduct,
  deleteVariant,
  updateVariant,
  reactivateVariant,
} from "./actions";

type AvailabilityMode = "ALWAYS" | "LAST_ORDER_DATE" | "STOCK";

// Shared by NewProductForm and EditProductForm: makes "produk biasa vs
// preorder" an explicit either/or choice, so only one of AvailabilityFields
// / PreorderFields is ever shown (and submitted) for a given product. This
// resolves a real bug: a product could previously be both "Preorder" AND
// have a Last Order Date / Stok set, even though a preorder round is
// deliberately open-ended (no deadline) — the stale availability setting
// could silently cut off preorder ordering before the quota was met.
function ProductTypeSelector({
  isPreorder,
  onChange,
}: {
  isPreorder: boolean;
  onChange: (isPreorder: boolean) => void;
}) {
  return (
    <fieldset className="rounded border border-gray-200 p-3">
      <legend className="px-1 text-sm font-semibold">Tipe Produk</legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name="productType"
          value="REGULAR"
          checked={!isPreorder}
          onChange={() => onChange(false)}
        />
        Produk Biasa
      </label>
      <label className="mt-1 flex items-center gap-2 text-sm">
        <input
          type="radio"
          name="productType"
          value="PREORDER"
          checked={isPreorder}
          onChange={() => onChange(true)}
        />
        Preorder (pesan dulu, produksi setelah kuota terpenuhi)
      </label>
    </fieldset>
  );
}

// Shown only when ProductTypeSelector is set to Preorder — see there for why
// this and AvailabilityFields are mutually exclusive.
function PreorderFields({
  defaultPreorderMinQty,
  defaultPreorderNote,
  preorderReservedQty,
}: {
  defaultPreorderMinQty?: number | string;
  defaultPreorderNote?: string;
  preorderReservedQty?: number;
}) {
  return (
    <div className="mt-2 rounded border border-gray-200 p-3">
      <label htmlFor="preorderMinQty" className="mb-1 block text-sm font-semibold">
        Kuota Minimum
      </label>
      <input
        id="preorderMinQty"
        name="preorderMinQty"
        type="number"
        min={1}
        placeholder="Kuota minimum (mis. 36)"
        required
        defaultValue={defaultPreorderMinQty}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
      {preorderReservedQty !== undefined && (
        <p className="mt-1 text-xs text-gray-500">
          Progress gelombang berjalan: {preorderReservedQty} pcs sudah dipesan.
        </p>
      )}
      <label htmlFor="preorderNote" className="mt-3 mb-1 block text-sm font-semibold">
        Catatan Preorder
      </label>
      <textarea
        id="preorderNote"
        name="preorderNote"
        placeholder="Mis. Produksi 1-2 minggu, estimasi kirim awal November"
        defaultValue={defaultPreorderNote}
        rows={2}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <p className="mt-1 text-xs text-gray-500">
        Catatan ini ditampilkan ke pembeli di dekat info kuota preorder.
      </p>
    </div>
  );
}

// Shared by NewProductForm and EditProductForm so the two forms can't drift
// out of sync on what "availability" looks like as a form field. Only
// rendered for non-preorder products — see ProductTypeSelector above.
function AvailabilityFields({
  availabilityMode,
  onAvailabilityModeChange,
  defaultLastOrderAt,
  defaultStock,
}: {
  availabilityMode: AvailabilityMode;
  onAvailabilityModeChange: (mode: AvailabilityMode) => void;
  defaultLastOrderAt?: string;
  defaultStock?: number | string;
}) {
  return (
    <div className="mt-2 rounded border border-gray-200 p-3">
      <p className="mb-2 text-sm font-semibold">Ketersediaan</p>
      <select
        name="availabilityMode"
        value={availabilityMode}
        onChange={(e) => onAvailabilityModeChange(e.target.value as AvailabilityMode)}
        className="mb-2 w-full rounded border border-gray-300 px-3 py-2"
      >
        <option value="ALWAYS">Selalu Tersedia</option>
        <option value="LAST_ORDER_DATE">Batas Tanggal Order</option>
        <option value="STOCK">Stok Terbatas</option>
      </select>
      {availabilityMode === "LAST_ORDER_DATE" && (
        <input
          name="lastOrderAt"
          type="date"
          required
          defaultValue={defaultLastOrderAt}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      )}
      {availabilityMode === "STOCK" && (
        <input
          name="stock"
          type="number"
          min={0}
          placeholder="Jumlah stok"
          required
          defaultValue={defaultStock}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      )}
    </div>
  );
}

export function NewProductForm({ vendors }: { vendors: { id: string; brandName: string }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>("ALWAYS");
  const [isPreorder, setIsPreorder] = useState(false);

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
      <input
        name="image"
        type="file"
        accept="image/*"
        className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[#124B23] file:px-3 file:py-1.5 file:font-medium file:text-white"
      />

      <ProductTypeSelector isPreorder={isPreorder} onChange={setIsPreorder} />
      {isPreorder ? (
        <PreorderFields />
      ) : (
        <AvailabilityFields availabilityMode={availabilityMode} onAvailabilityModeChange={setAvailabilityMode} />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white">Simpan Produk</button>
    </form>
  );
}

interface ProductFields {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  basePrice: number;
  availabilityMode: AvailabilityMode;
  lastOrderAt: string | null;
  stock: number | null;
  isPreorder: boolean;
  preorderMinQty: number | null;
  preorderReservedQty: number;
  preorderNote: string | null;
}

export function EditProductForm({
  product,
  vendors,
}: {
  product: ProductFields;
  vendors: { id: string; brandName: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>(product.availabilityMode);
  const [isPreorder, setIsPreorder] = useState(product.isPreorder);

  async function handleSubmit(formData: FormData) {
    formData.set("productId", product.id);
    const result = await updateProduct(formData);
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
        Edit
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="mt-2 flex flex-col gap-2 rounded border border-gray-200 p-3">
      <select name="vendorId" defaultValue={product.vendorId} required className="rounded border border-gray-300 px-3 py-2 text-sm">
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>{v.brandName}</option>
        ))}
      </select>
      <input name="name" defaultValue={product.name} required placeholder="Nama produk" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <textarea name="description" defaultValue={product.description} placeholder="Deskripsi" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="basePrice" type="number" defaultValue={product.basePrice} required placeholder="Harga dasar" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input
        name="image"
        type="file"
        accept="image/*"
        className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[#124B23] file:px-3 file:py-1.5 file:font-medium file:text-white"
      />
      <p className="text-xs text-gray-500">Kosongkan gambar jika tidak ingin menggantinya.</p>

      <ProductTypeSelector isPreorder={isPreorder} onChange={setIsPreorder} />
      {isPreorder ? (
        <PreorderFields
          defaultPreorderMinQty={product.preorderMinQty ?? undefined}
          defaultPreorderNote={product.preorderNote ?? undefined}
          preorderReservedQty={product.isPreorder ? product.preorderReservedQty : undefined}
        />
      ) : (
        <AvailabilityFields
          availabilityMode={availabilityMode}
          onAvailabilityModeChange={setAvailabilityMode}
          defaultLastOrderAt={product.lastOrderAt ?? undefined}
          defaultStock={product.stock ?? undefined}
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

export function ReactivateProductForm({ productId }: { productId: string }) {
  return (
    <form action={reactivateProduct.bind(null, productId)}>
      <button type="submit" className="text-sm text-green-700 underline">Aktifkan</button>
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

interface VariantFields {
  id: string;
  productId: string;
  label: string;
  price: number;
}

export function EditVariantForm({ variant, onDone }: { variant: VariantFields; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("variantId", variant.id);
    const result = await updateVariant(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    onDone();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-2 py-1">
      <input name="label" defaultValue={variant.label} required className="w-28 rounded border border-gray-300 px-2 py-1 text-xs" />
      <input name="price" type="number" defaultValue={variant.price} required className="w-24 rounded border border-gray-300 px-2 py-1 text-xs" />
      <button type="submit" className="rounded bg-[#124B23] px-2 py-1 text-xs text-white">Simpan</button>
      <button type="button" onClick={onDone} className="rounded border border-gray-300 px-2 py-1 text-xs">Batal</button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

export function VariantRow({ variant }: { variant: VariantFields }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="border-b py-1">
        <EditVariantForm variant={variant} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between border-b py-1">
      <span>{variant.label} — Rp{variant.price.toLocaleString("id-ID")}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="text-xs underline">Edit</button>
        <form action={deleteVariant.bind(null, variant.id)}>
          <button type="submit" className="text-xs text-red-600 underline">Hapus</button>
        </form>
      </div>
    </li>
  );
}

export function ReactivateVariantForm({ variantId }: { variantId: string }) {
  return (
    <form action={reactivateVariant.bind(null, variantId)}>
      <button type="submit" className="text-xs text-green-700 underline">Aktifkan</button>
    </form>
  );
}

// Represents only ACTIVE products — inactive ones get a separate, simpler
// read-only block in page.tsx (same split used on the vendors page), so this
// component never needs to branch on an isActive flag of its own.
export function ProductCard({
  product,
  vendorName,
  vendors,
  activeVariants,
  inactiveVariants,
}: {
  product: ProductFields;
  vendorName: string;
  vendors: { id: string; brandName: string }[];
  activeVariants: VariantFields[];
  inactiveVariants: VariantFields[];
}) {
  return (
    <div className="rounded border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-gray-500">{vendorName}</p>
          <p className="text-xs text-gray-500">
            {product.availabilityMode === "ALWAYS" && "Selalu tersedia"}
            {product.availabilityMode === "LAST_ORDER_DATE" &&
              product.lastOrderAt &&
              `Batas order: ${new Date(product.lastOrderAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
            {product.availabilityMode === "STOCK" && `Stok: ${product.stock ?? 0}`}
          </p>
          {product.isPreorder && (
            <div className="text-xs font-medium text-[#124B23]">
              <p>
                Preorder — {product.preorderReservedQty} dari minimal {product.preorderMinQty} pcs
              </p>
              {product.preorderNote && <p className="font-normal text-gray-500">{product.preorderNote}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <EditProductForm product={product} vendors={vendors} />
          <form action={deleteProduct.bind(null, product.id)}>
            <button type="submit" className="text-sm text-red-600 underline">Nonaktifkan</button>
          </form>
        </div>
      </div>

      <ul className="mt-2 text-sm">
        {activeVariants.map((v) => (
          <VariantRow key={v.id} variant={v} />
        ))}
      </ul>
      <NewVariantForm productId={product.id} />

      {inactiveVariants.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-gray-500">Varian Nonaktif</p>
          <ul className="text-sm">
            {inactiveVariants.map((v) => (
              <li key={v.id} className="flex items-center justify-between border-b py-1 text-gray-400">
                <span>{v.label} — Rp{v.price.toLocaleString("id-ID")}</span>
                <ReactivateVariantForm variantId={v.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
