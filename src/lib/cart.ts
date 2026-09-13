export interface CartItem {
  itemKey: string; // `${productId}:${variantId ?? "none"}`
  productId: string;
  productSlug: string;
  productName: string;
  vendorBrandName: string;
  variantId: string | null;
  variantLabel: string;
  unitPrice: number;
  qty: number;
}

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
}

export function addToCart(newItem: CartItem): CartItem[] {
  const items = getCart();
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
