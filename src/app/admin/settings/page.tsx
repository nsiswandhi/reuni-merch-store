import { prisma } from "@/lib/prisma";
import { updateSettings } from "./actions";

export default async function AdminSettingsPage() {
  const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Pengaturan</h1>
      <form action={updateSettings} className="flex max-w-md flex-col gap-3">
        <label className="text-sm font-medium">Nama Bank</label>
        <input name="bankName" defaultValue={settings.bankName} className="rounded border border-gray-300 px-3 py-2" />
        <label className="text-sm font-medium">Nomor Rekening</label>
        <input name="bankAccountNumber" defaultValue={settings.bankAccountNumber} className="rounded border border-gray-300 px-3 py-2" />
        <label className="text-sm font-medium">Nama Pemilik Rekening</label>
        <input name="bankAccountName" defaultValue={settings.bankAccountName} className="rounded border border-gray-300 px-3 py-2" />
        <label className="text-sm font-medium">Ongkir Flat (Rp)</label>
        <input name="shippingFlatRate" type="number" defaultValue={settings.shippingFlatRate} className="rounded border border-gray-300 px-3 py-2" />
        <label className="text-sm font-medium">Email Notifikasi Admin</label>
        <input name="adminNotificationEmail" type="email" defaultValue={settings.adminNotificationEmail} className="rounded border border-gray-300 px-3 py-2" />
        <button type="submit" className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white">Simpan</button>
      </form>
    </main>
  );
}
