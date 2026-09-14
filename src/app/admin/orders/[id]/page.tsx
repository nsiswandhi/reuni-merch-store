import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { confirmPayment, rejectProof } from "../actions";
import { PaymentProofDialog } from "./payment-proof-dialog";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { vendor: true } } },
  });

  if (!order) {
    notFound();
  }

  return (
    <main>
      <Link href="/admin/orders" className="mb-3 inline-block text-sm underline">&larr; Kembali ke semua order</Link>
      <h1 className="mb-2 font-[Bebas_Neue] text-3xl text-[#124B23]">Order {order.orderNumber}</h1>
      <p className="mb-4">Status: <strong>{order.status}</strong></p>
      <p>Pembeli: {order.buyerName} (Angkatan {order.buyerAngkatan})</p>
      <p>Email: {order.buyerEmail} — WhatsApp: {order.buyerWhatsapp}</p>
      <p>Pengiriman: {order.deliveryMethod}{order.shippingAddress ? ` — ${order.shippingAddress}` : ""}</p>
      <p className="mb-4 text-lg font-bold">Total: {formatRupiah(order.total)}</p>

      {order.paymentProofUrl && (
        <div className="mb-4">
          <p className="font-semibold">Bukti Transfer:</p>
          <PaymentProofDialog url={order.paymentProofUrl} />
        </div>
      )}

      {order.status === "AWAITING_CONFIRMATION" && (
        <div className="mb-6 flex gap-2">
          <form action={confirmPayment.bind(null, order.id)}>
            <button type="submit" className="rounded bg-[#124B23] px-4 py-2 text-white">Konfirmasi Bayar</button>
          </form>
          <form action={rejectProof.bind(null, order.id)}>
            <button type="submit" className="rounded bg-red-600 px-4 py-2 text-white">Tolak Bukti</button>
          </form>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Vendor</th>
            <th className="p-2">Produk</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Fulfillment</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-2">{item.vendor.brandName}</td>
              <td className="p-2">{item.productNameSnapshot} {item.variantLabelSnapshot}</td>
              <td className="p-2">{item.qty}</td>
              <td className="p-2">{item.fulfillmentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
