import { prisma } from "@/lib/prisma";
import { NewVendorForm, ResetPasswordForm } from "./vendor-form";

export default async function AdminVendorsPage() {
  const vendors = await prisma.vendor.findMany({ orderBy: { brandName: "asc" } });

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Kelola Vendor</h1>
      <NewVendorForm />
      <div className="flex flex-col gap-3">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="rounded border border-gray-200 p-4">
            <p className="font-semibold">{vendor.brandName}</p>
            <p className="text-sm text-gray-500">
              {vendor.ownerName} — Angkatan {vendor.angkatan} — {vendor.email}
            </p>
            <div className="mt-2">
              <ResetPasswordForm vendorId={vendor.id} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
