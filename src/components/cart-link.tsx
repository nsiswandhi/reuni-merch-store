"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart } from "@/lib/cart";
import { CartIcon } from "./cart-icon";

// Header cart icon + item-count badge. The cart itself lives in
// localStorage (see lib/cart.ts), so this has to be a client component and
// re-read it whenever the cart changes — both in this tab (the "cart-updated"
// event lib/cart.ts dispatches after every write) and in other tabs (the
// browser's own "storage" event).
export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function syncCount() {
      setCount(getCart().reduce((sum, item) => sum + item.qty, 0));
    }
    // Initial read happens after mount (not as a useState initializer) since
    // SSR has no localStorage — matches the same pattern keranjang/page.tsx
    // already uses for hydration safety.
    syncCount();
    window.addEventListener("cart-updated", syncCount);
    window.addEventListener("storage", syncCount);
    return () => {
      window.removeEventListener("cart-updated", syncCount);
      window.removeEventListener("storage", syncCount);
    };
  }, []);

  return (
    <Link
      href="/keranjang"
      aria-label={count > 0 ? `Keranjang belanja, ${count} item` : "Keranjang belanja"}
      className="relative flex items-center rounded-lg p-2 text-brand-green hover:bg-black/5"
    >
      <CartIcon className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
