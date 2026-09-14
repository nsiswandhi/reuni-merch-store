"use client";

import { useState } from "react";
import { createVendor, resetVendorPassword, updateVendor, deactivateVendor, reactivateVendor } from "./actions";

export function NewVendorForm() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createVendor(formData);
    setError(result.error ?? null);
  }

  return (
    <form action={handleSubmit} className="mb-6 flex flex-col gap-2 rounded border border-gray-200 p-4">
      <h2 className="font-semibold">Tambah Vendor</h2>
      <input name="brandName" placeholder="Nama Brand (mis. Mollusca)" required className="rounded border border-gray-300 px-3 py-2" />
      <input name="ownerName" placeholder="Nama Pemilik" required className="rounded border border-gray-300 px-3 py-2" />
      <input name="angkatan" placeholder="Angkatan" required className="rounded border border-gray-300 px-3 py-2" />
      <input name="email" type="email" placeholder="Email login" required className="rounded border border-gray-300 px-3 py-2" />
      <input name="password" type="password" placeholder="Password" required className="rounded border border-gray-300 px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white">Simpan Vendor</button>
    </form>
  );
}

export function ResetPasswordForm({ vendorId }: { vendorId: string }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("vendorId", vendorId);
    const result = await resetVendorPassword(formData);
    setError(result.error ?? null);
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <input name="newPassword" type="password" placeholder="Password baru" required className="rounded border border-gray-300 px-2 py-1 text-sm" />
      <button type="submit" className="rounded bg-gray-700 px-3 py-1 text-sm text-white">Reset Password</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

interface VendorFields {
  id: string;
  brandName: string;
  ownerName: string;
  angkatan: string;
  email: string;
}

export function EditVendorForm({ vendor }: { vendor: VendorFields }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("vendorId", vendor.id);
    const result = await updateVendor(formData);
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
      <input name="brandName" defaultValue={vendor.brandName} required placeholder="Nama Brand" className="rounded border border-gray-300 px-2 py-1 text-sm" />
      <input name="ownerName" defaultValue={vendor.ownerName} required placeholder="Nama Pemilik" className="rounded border border-gray-300 px-2 py-1 text-sm" />
      <input name="angkatan" defaultValue={vendor.angkatan} required placeholder="Angkatan" className="rounded border border-gray-300 px-2 py-1 text-sm" />
      <input name="email" type="email" defaultValue={vendor.email} required placeholder="Email login" className="rounded border border-gray-300 px-2 py-1 text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-[#124B23] px-3 py-1 text-sm text-white">Simpan</button>
        <button type="button" onClick={() => setEditing(false)} className="rounded border border-gray-300 px-3 py-1 text-sm">Batal</button>
      </div>
    </form>
  );
}

export function DeactivateVendorForm({ vendorId }: { vendorId: string }) {
  return (
    <form action={deactivateVendor.bind(null, vendorId)}>
      <button type="submit" className="text-sm text-red-600 underline">Nonaktifkan</button>
    </form>
  );
}

export function ReactivateVendorForm({ vendorId }: { vendorId: string }) {
  return (
    <form action={reactivateVendor.bind(null, vendorId)}>
      <button type="submit" className="text-sm text-green-700 underline">Aktifkan</button>
    </form>
  );
}
