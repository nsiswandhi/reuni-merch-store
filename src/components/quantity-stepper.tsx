"use client";

// Drawn with CSS bars instead of the "+"/"−" text glyphs: those two characters
// have different side-bearings in the deployed font, so even identical
// centering CSS left the "+" looking off-center with extra whitespace on one
// side. Bars of the same length are always pixel-symmetric.
function MinusGlyph() {
  return <span aria-hidden="true" className="block h-0.5 w-3 bg-current" />;
}

function PlusGlyph() {
  return (
    <span aria-hidden="true" className="relative block h-3 w-3">
      <span className="absolute left-0 top-1/2 h-0.5 w-3 -translate-y-1/2 bg-current" />
      <span className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 bg-current" />
    </span>
  );
}

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
        className="flex h-10 w-10 items-center justify-center text-[#124B23] disabled:opacity-30"
      >
        <MinusGlyph />
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
        className="flex h-10 w-10 items-center justify-center text-[#124B23]"
      >
        <PlusGlyph />
      </button>
    </div>
  );
}
