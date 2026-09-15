import Link from "next/link";
import Image from "next/image";
import { getCurrentSession } from "@/lib/auth/current-user";
import { logout } from "@/app/login/actions";
import { CartLink } from "./cart-link";

export async function SiteHeader() {
  const session = await getCurrentSession();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-brand-yellow px-4 py-3">
      <Link href="/" className="flex items-center gap-3 font-heading text-2xl text-brand-green">
        <Image src="/logo-invnity.png" alt="InVnity" width={77} height={40} priority />
        {/* Hidden below sm so a small screen keeps just the logo + the
            cart/logout controls on the right instead of wrapping/crowding. */}
        <span className="hidden sm:inline">REUNI AKBAR IA LIMA 2026</span>
      </Link>
      <div className="flex items-center gap-2">
        <CartLink />
        {session && (
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Logout
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
