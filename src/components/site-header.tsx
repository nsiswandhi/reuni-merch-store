import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="flex items-center border-b border-gray-200 bg-brand-yellow px-4 py-3">
      <Link href="/" className="flex items-center gap-3 font-heading text-2xl text-brand-green">
        <Image src="/logo-invnity.png" alt="InVnity" width={77} height={40} priority />
        REUNI AKBAR IA LIMA 2026
      </Link>
    </header>
  );
}
