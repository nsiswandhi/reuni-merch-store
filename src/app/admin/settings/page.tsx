import { prisma } from "@/lib/prisma";
import { updateSettings, removeQrisImage } from "./actions";

export default async function AdminSettingsPage() {
  const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Pengaturan</h1>
      <form
        action={async (formData: FormData) => {
          "use server";
          await updateSettings(formData);
        }}
        className="flex max-w-md flex-col gap-3"
      >
        <label className="text-sm font-medium">Nama Bank</label>
        <input name="bankName" defaultValue={settings.bankName} className="rounded border border-gray-300 px-3 py-2" />
        <label className="text-sm font-medium">Nomor Rekening</label>
        <input name="bankAccountNumber" defaultValue={settings.bankAccountNumber} className="rounded border border-gray-300 px-3 py-2" />
        <label className="text-sm font-medium">Nama Pemilik Rekening</label>
        <input name="bankAccountName" defaultValue={settings.bankAccountName} className="rounded border border-gray-300 px-3 py-2" />

        <div className="mt-2 rounded border border-gray-200 p-3">
          <p className="mb-2 text-sm font-semibold">QRIS (opsional)</p>
          {settings.qrisImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- blob-hosted upload, not a static asset
            <img src={settings.qrisImageUrl} alt="QRIS" className="mb-2 h-40 w-40 rounded border border-gray-200 object-contain" />
          )}
          <label className="text-sm font-medium">
            {settings.qrisImageUrl ? "Ganti gambar QRIS" : "Upload gambar QRIS"}
          </label>
          <input
            name="qrisImage"
            type="file"
            accept="image/*"
            className="mt-1 w-full cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[#124B23] file:px-3 file:py-1.5 file:font-medium file:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Kalau diisi, gambar QRIS ini akan ditampilkan sebagai opsi pembayaran di halaman order pembeli dan di email info cara bayar.
          </p>
        </div>

        <label className="text-sm font-medium">Ongkir Flat (Rp)</label>
        <input name="shippingFlatRate" type="number" defaultValue={settings.shippingFlatRate} className="rounded border border-gray-300 px-3 py-2" />
        <label className="text-sm font-medium">Email Notifikasi Admin</label>
        <input name="adminNotificationEmail" type="email" defaultValue={settings.adminNotificationEmail} className="rounded border border-gray-300 px-3 py-2" />
        <button type="submit" className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white">Simpan</button>
      </form>

      {settings.qrisImageUrl && (
        <form
          action={async () => {
            "use server";
            await removeQrisImage();
          }}
          className="mt-2 max-w-md"
        >
          <button type="submit" className="text-sm text-red-600 underline">Hapus Gambar QRIS</button>
        </form>
      )}
    </main>
  );
}
