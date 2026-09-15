import { ProfileIcon } from "./profile-icon";

// Shown on both the catalog thumbnail and the product detail page — the
// container is hidden entirely (returns null) when either field is empty,
// per the user's request, rather than rendering "- Angkatan" or similar.
export function OwnerInfo({
  ownerName,
  angkatan,
  className,
  iconClassName,
}: {
  ownerName: string;
  angkatan: string;
  className?: string;
  iconClassName?: string;
}) {
  if (!ownerName.trim() || !angkatan.trim()) {
    return null;
  }

  return (
    <p className={`flex items-center gap-1 text-gray-500 ${className ?? ""}`}>
      <ProfileIcon className={iconClassName ?? "h-3.5 w-3.5 shrink-0"} />
      <span>{ownerName} - {angkatan}</span>
    </p>
  );
}
