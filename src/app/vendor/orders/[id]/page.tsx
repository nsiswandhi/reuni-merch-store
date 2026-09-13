import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { updateFulfillmentStatus } from "../actions";

export default async function VendorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const vendorId = session!.vendorId!;

  const items = await prisma.orderItem.findMany({
    where: { orderId: id, vendorId, order: { status: "PAID" } },
    include: { order: true },
  });

  if (items.length === 0) {
    notFound();
  }

  const order = items[0].order;

  return (
    <main>
      <h1 className="mb-2 text-2xl font-semibold">Order {order.orderNumber}</h1>
      <p className="mb-1">Pembeli: {order.buyerName} — WhatsApp: {order.buyerWhatsapp}</p>
      {order.shippingAddress && <p className="mb-4">Alamat: {order.shippingAddress}</p>}

      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Produk</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-2">{item.productNameSnapshot} {item.variantLabelSnapshot}</td>
              <td className="p-2">{item.qty}</td>
              <td className="p-2">{item.fulfillmentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={updateFulfillmentStatus.bind(null, order.id)} className="flex items-center gap-2">
        <select name="status" defaultValue="PROCESSING" className="rounded border border-gray-300 px-3 py-2">
          <option value="PROCESSING">Diproses</option>
          <option value="DONE">Selesai</option>
        </select>
        <button type="submit" className="rounded bg-[#124B23] px-4 py-2 text-white">
          Update Semua Item Order Ini
        </button>
      </form>
    </main>
  );
}
