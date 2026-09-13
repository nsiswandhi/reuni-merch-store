import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session || session.role !== "VENDOR" || !session.vendorId) {
    redirect("/login");
  }
  const vendor = await prisma.vendor.findUnique({ where: { id: session.vendorId } });
  if (!vendor) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <p className="mb-4 font-[Bebas_Neue] text-xl text-[#124B23]">Panel Vendor — {vendor.brandName}</p>
      {children}
    </div>
  );
}
