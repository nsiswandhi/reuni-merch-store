import { prisma } from "@/lib/prisma";
import { NewVendorForm, ResetPasswordForm, EditVendorForm, DeactivateVendorForm, ReactivateVendorForm } from "./vendor-form";

export default async function AdminVendorsPage() {
  const allVendors = await prisma.vendor.findMany({ orderBy: { brandName: "asc" } });
  const activeVendors = allVendors.filter((v) => v.isActive);
  const inactiveVendors = allVendors.filter((v) => !v.isActive);

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Kelola Vendor</h1>
      <NewVendorForm />
      <div className="flex flex-col gap-3">
        {activeVendors.map((vendor) => (
          <div key={vendor.id} className="rounded border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">
                  {vendor.brandName}
                  {!vendor.allowsPickup && (
                    <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600">Hanya Kirim</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {vendor.ownerName} — Angkatan {vendor.angkatan} — {vendor.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <EditVendorForm vendor={vendor} />
                <DeactivateVendorForm vendorId={vendor.id} />
              </div>
            </div>
            <div className="mt-2">
              <ResetPasswordForm vendorId={vendor.id} />
            </div>
          </div>
        ))}
      </div>

      {inactiveVendors.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-semibold text-gray-600">Vendor Nonaktif</h2>
          <div className="flex flex-col gap-3">
            {inactiveVendors.map((vendor) => (
              <div key={vendor.id} className="rounded border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-500">{vendor.brandName}</p>
                    <p className="text-sm text-gray-400">
                      {vendor.ownerName} — Angkatan {vendor.angkatan} — {vendor.email}
                    </p>
                  </div>
                  <ReactivateVendorForm vendorId={vendor.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
