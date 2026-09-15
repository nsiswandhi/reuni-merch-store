// Small inline profile/person icon — no icon library is installed in this
// project, so this is a plain SVG matching the existing zero-dependency
// style (see QuantityStepper for the same approach).
export function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 12c2.71 0 4.9-2.19 4.9-4.9S14.71 2.2 12 2.2 7.1 4.39 7.1 7.1 9.29 12 12 12Zm0 2.45c-3.27 0-9.8 1.64-9.8 4.9v2.45h19.6v-2.45c0-3.26-6.53-4.9-9.8-4.9Z" />
    </svg>
  );
}
