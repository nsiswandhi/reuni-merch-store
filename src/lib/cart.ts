export interface CartItem {
  itemKey: string; // `${productId}:${variantId ?? "none"}`
  productId: string;
  productSlug: string;
  productName: string;
  vendorBrandName: string;
  // Whether this item's vendor can hand items off in person at the venue.
  // false means this item can only ever be shipped — used at checkout to
  // decide whether "Ambil di Venue" can be offered for the whole cart.
  vendorAllowsPickup: boolean;
  // Preorder items go through the RESERVED flow (no immediate payment) —
  // see addToCart below for why a cart can't mix these with regular items.
  isPreorder: boolean;
  variantId: string | null;
  variantLabel: string;
  unitPrice: number;
  qty: number;
}

// Thrown by addToCart instead of silently merging incompatible items — the
// caller (add-to-cart-form.tsx) catches this and shows the message so the
// buyer can clear their cart first.
export class CartConflictError extends Error {}

const STORAGE_KEY = "reuni-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // localStorage's own "storage" event only fires in OTHER tabs, not this
  // one — dispatched separately so same-tab listeners (e.g. the header's
  // cart badge) can react immediately after an add/update/remove here.
  window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(newItem: CartItem): CartItem[] {
  const items = getCart();

  // Preorder orders go through a completely different flow (RESERVED,
  // waiting on a shared quota) than regular ones, and a preorder order can
  // only be tied to one product's quota — so a cart can't mix preorder with
  // regular items, nor mix two different preorder products.
  const existingPreorderItem = items.find((i) => i.isPreorder);
  if (newItem.isPreorder) {
    if (items.some((i) => !i.isPreorder)) {
      throw new CartConflictError(
        "Keranjang berisi produk reguler. Kosongkan keranjang dulu untuk memesan produk preorder ini."
      );
    }
    if (existingPreorderItem && existingPreorderItem.productId !== newItem.productId) {
      throw new CartConflictError(
        "Keranjang preorder hanya bisa berisi 1 produk. Kosongkan keranjang dulu untuk memesan produk preorder lain."
      );
    }
  } else if (existingPreorderItem) {
    throw new CartConflictError(
      "Keranjang berisi produk preorder. Kosongkan keranjang dulu untuk membeli produk reguler ini."
    );
  }

  const existing = items.find((i) => i.itemKey === newItem.itemKey);
  const updated = existing
    ? items.map((i) => (i.itemKey === newItem.itemKey ? { ...i, qty: i.qty + newItem.qty } : i))
    : [...items, newItem];
  saveCart(updated);
  return updated;
}

export function updateCartQty(itemKey: string, qty: number): CartItem[] {
  const items = getCart()
    .map((i) => (i.itemKey === itemKey ? { ...i, qty } : i))
    .filter((i) => i.qty > 0);
  saveCart(items);
  return items;
}

export function removeFromCart(itemKey: string): CartItem[] {
  const items = getCart().filter((i) => i.itemKey !== itemKey);
  saveCart(items);
  return items;
}

export function clearCart(): void {
  saveCart([]);
}
