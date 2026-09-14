"use client";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  className = "",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-stretch rounded border border-gray-300 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Kurangi jumlah"
        className="flex h-10 w-10 items-center justify-center text-xl font-semibold text-[#124B23] disabled:opacity-30"
      >
        &minus;
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.trunc(Number(e.target.value)) || min))}
        className="h-10 w-12 border-x border-gray-300 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Tambah jumlah"
        className="flex h-10 w-10 items-center justify-center text-xl font-semibold text-[#124B23]"
      >
        +
      </button>
    </div>
  );
}
