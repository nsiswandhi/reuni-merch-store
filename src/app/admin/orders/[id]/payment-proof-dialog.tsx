"use client";

import { useRef } from "react";

export function PaymentProofDialog({ url }: { url: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function closeOnBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    // The dialog element itself fills the space behind its own content (the ::backdrop
    // covers the viewport, but click events on the backdrop area land on <dialog> itself,
    // not on the content div inside it). A click that lands directly on <dialog> — not one
    // of its children — means the tap was outside the content, so treat it as "close".
    if (e.target === dialogRef.current) {
      dialogRef.current?.close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium underline"
      >
        Lihat bukti
      </button>
      <dialog
        ref={dialogRef}
        onClick={closeOnBackdropClick}
        className="w-[90vw] max-w-2xl rounded-lg border-0 p-0 backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <span className="font-semibold">Bukti Transfer</span>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup"
            className="rounded px-2 py-1 text-lg leading-none hover:bg-gray-100"
          >
            &times;
          </button>
        </div>
        <iframe src={url} title="Bukti Transfer" className="h-[75vh] w-full" />
      </dialog>
    </>
  );
}
