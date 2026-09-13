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
      <input type="file" name="proof" accept="image/jpeg,image/png,application/pdf" required />
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
