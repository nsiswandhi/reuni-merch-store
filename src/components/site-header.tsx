import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-brand-green px-4 py-3">
      <Link href="/" className="font-heading text-2xl text-brand-yellow">
        Reuni Akbar InVnity 2026
      </Link>
      <Image src="/mascots/loka.png" alt="Loka the Keeper" width={40} height={40} />
    </header>
  );
}
