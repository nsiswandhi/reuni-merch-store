import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UploadProofForm } from "./upload-proof-form";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

const STATUS_LABELS: Record<string, string> = {
  RESERVED: "Menunggu Kuota Terpenuhi",
  PENDING_PAYMENT: "Menunggu Pembayaran",
  AWAITING_CONFIRMATION: "Menunggu Konfirmasi Admin",
  PAID: "Sudah Dibayar",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { token },
    include: { items: { include: { vendor: true, product: true } } },
  });

  if (!order) {
    notFound();
  }

  const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });

  const itemsByVendor = order.items.reduce<Record<string, typeof order.items>>((acc, item) => {
    (acc[item.vendor.brandName] ??= []).push(item);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-[Bebas_Neue] text-3xl text-[#124B23]">Order {order.orderNumber}</h1>
      <p className="mb-6 inline-block rounded bg-[#F3C21A] px-3 py-1 text-sm font-semibold">
        {STATUS_LABELS[order.status]}
      </p>

      {order.status === "RESERVED" && (
        <section className="mb-6 rounded border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold">Menunggu Kuota Terpenuhi</h2>
          <p>Ini reservasi preorder — belum perlu dibayar.</p>
          {order.items[0]?.product?.isPreorder && (
            <p className="mt-1">
              Progress: {order.items[0].product.preorderReservedQty} dari minimal {order.items[0].product.preorderMinQty} pcs.
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Begitu kuota minimum tercapai, kami kirim email berisi instruksi pembayaran (batas waktu 3 hari).
          </p>
        </section>
      )}

      {order.status === "PENDING_PAYMENT" && (
        <section className="mb-6 rounded border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold">Info Pembayaran</h2>
          <p>Transfer ke: {settings.bankName} {settings.bankAccountNumber} a.n. {settings.bankAccountName}</p>
          {settings.qrisImageUrl && (
            <div className="my-3">
              <p className="mb-1 text-sm text-gray-600">Atau scan QRIS berikut:</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob-hosted upload, not a static asset */}
              <img src={settings.qrisImageUrl} alt="QRIS" className="h-48 w-48 rounded border border-gray-200 object-contain" />
            </div>
          )}
          <p className="mb-4 text-lg font-bold">Total: {formatRupiah(order.total)}</p>
          <UploadProofForm orderToken={order.token} />
        </section>
      )}

      {order.status === "AWAITING_CONFIRMATION" && order.paymentProofUrl && (
        <section className="mb-6 rounded border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold">Bukti Transfer Terkirim</h2>
          <p>Menunggu admin memverifikasi pembayaran kamu.</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Rincian Pesanan</h2>
        {Object.entries(itemsByVendor).map(([vendorName, vendorItems]) => (
          <div key={vendorName} className="mb-4">
            <p className="font-medium text-gray-600">{vendorName}</p>
            {vendorItems.map((item) => (
              <div key={item.id} className="flex justify-between border-b py-1 text-sm">
                <span>
                  {item.productNameSnapshot} {item.variantLabelSnapshot && `(${item.variantLabelSnapshot})`} x{item.qty}
                </span>
                <span>{formatRupiah(item.unitPriceSnapshot * item.qty)}</span>
              </div>
            ))}
          </div>
        ))}
        <p className="text-right">Subtotal: {formatRupiah(order.subtotal)}</p>
        <p className="text-right">Ongkir: {formatRupiah(order.shippingCost)}</p>
        <p className="text-right text-lg font-bold">Total: {formatRupiah(order.total)}</p>
      </section>
    </main>
  );
}
