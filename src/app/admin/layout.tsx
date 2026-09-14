import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-48 border-r border-gray-200 p-4">
        <p className="mb-4 font-[Bebas_Neue] text-xl text-[#124B23]">Admin</p>
        <ul className="flex flex-col gap-2 text-sm">
          <li><Link href="/admin">Dashboard</Link></li>
          <li><Link href="/admin/products">Produk</Link></li>
          <li><Link href="/admin/vendors">Vendor</Link></li>
          <li><Link href="/admin/orders">Order</Link></li>
          <li><Link href="/admin/settings">Pengaturan</Link></li>
        </ul>
      </nav>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
