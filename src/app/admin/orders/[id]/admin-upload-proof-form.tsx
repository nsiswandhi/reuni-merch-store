"use client";

import { useState } from "react";
import { adminUploadPaymentProof } from "../actions";

// For buyers who couldn't upload their own proof and sent it to admin
// personally instead — same shape as the buyer-facing UploadProofForm
// (order/[token]/upload-proof-form.tsx), just pointed at the admin action.
export function AdminUploadProofForm({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await adminUploadPaymentProof(orderId, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit} className="mb-4 flex flex-col gap-2 rounded border border-gray-200 p-3">
      <p className="text-sm font-semibold">Upload Bukti Transfer (atas nama pembeli)</p>
      <p className="text-xs text-gray-500">
        Untuk pembeli yang gagal upload sendiri dan mengirim bukti transfernya langsung ke admin.
      </p>
      <input
        type="file"
        name="proof"
        accept="image/jpeg,image/png,application/pdf"
        required
        className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[#124B23] file:px-3 file:py-1.5 file:font-medium file:text-white"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-[#124B23] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Mengunggah..." : "Upload Bukti Transfer"}
      </button>
    </form>
  );
}
