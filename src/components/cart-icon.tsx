// Small inline shopping-cart icon — matching the existing zero-dependency
// style (see ProfileIcon for the same approach; no icon library installed).
export function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.2 20.9a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7Zm9.6 0a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7ZM6.28 16.2h11.02a1 1 0 0 0 .96-.73l2.1-7.5A1 1 0 0 0 19.4 6.6H5.54l-.4-1.92A1 1 0 0 0 4.16 4H2v1.8h1.4l2.46 11.63A1.8 1.8 0 0 0 7.6 19h10.9v-1.8H7.6l-.27-1Z" />
    </svg>
  );
}
