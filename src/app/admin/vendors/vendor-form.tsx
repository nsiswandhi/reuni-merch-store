"use client";

import { useState } from "react";
import { createVendor, resetVendorPassword } from "./actions";

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
