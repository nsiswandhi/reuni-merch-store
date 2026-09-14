"use client";

import { useState } from "react";
import { uploadPaymentProof } from "./actions";

export function UploadProofForm({ orderToken }: { orderToken: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await uploadPaymentProof(orderToken, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2">
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
        className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Mengunggah..." : "Upload Bukti Transfer"}
      </button>
    </form>
  );
}
