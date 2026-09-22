"use client";

import { useState } from "react";
import { reactivateExpiredOrder } from "../actions";

// EXPIRED -> PENDING_PAYMENT, so the buyer (or admin, via AdminUploadProofForm)
// can submit a payment proof again. A plain bound server-action form isn't
// used here (unlike ConfirmPayment/RejectProof/CancelOrder) because the one
// realistic failure mode — stock sold to someone else while this order sat
// expired — deserves a real inline message, not Next's default error page.
export function ReactivateExpiredForm({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await reactivateExpiredOrder(orderId);
    setPending(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div>
      <form action={handleSubmit}>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#124B23] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Memproses..." : "Reactivate Expired"}
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
