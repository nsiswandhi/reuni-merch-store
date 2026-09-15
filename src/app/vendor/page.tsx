import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

interface ProductSummary {
  key: string;
  label: string;
  PROCESSING: number;
  IN_PRODUCTION: number;
  DONE: number;
  total: number;
}

export default async function VendorOrdersPage() {
  const session = await getCurrentSession();
  const vendorId = session!.vendorId!;

  const items = await prisma.orderItem.findMany({
    where: { vendorId, order: { status: "PAID" } },
    include: { order: true },
    orderBy: { order: { createdAt: "desc" } },
  });

  const orderIds = [...new Set(items.map((i) => i.orderId))];

  const summaryByProduct = new Map<string, ProductSummary>();
  for (const item of items) {
    const key = `${item.productId}-${item.variantId ?? "none"}`;
    const label = item.variantLabelSnapshot
      ? `${item.productNameSnapshot} ${item.variantLabelSnapshot}`
      : item.productNameSnapshot;
    const existing = summaryByProduct.get(key) ?? { key, label, PROCESSING: 0, IN_PRODUCTION: 0, DONE: 0, total: 0 };
    existing[item.fulfillmentStatus] += item.qty;
    existing.total += item.qty;
    summaryByProduct.set(key, existing);
  }
  const productSummaries = [...summaryByProduct.values()].sort((a, b) => a.label.localeCompare(b.label));
  const grandTotal = {
    PROCESSING: productSummaries.reduce((sum, p) => sum + p.PROCESSING, 0),
    IN_PRODUCTION: productSummaries.reduce((sum, p) => sum + p.IN_PRODUCTION, 0),
    DONE: productSummaries.reduce((sum, p) => sum + p.DONE, 0),
    total: productSummaries.reduce((sum, p) => sum + p.total, 0),
  };

  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold">Ringkasan per Produk</h1>
      {productSummaries.length === 0 ? (
        <p className="mb-8 text-sm text-gray-500">Belum ada order.</p>
      ) : (
        <table className="mb-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Produk</th>
              <th className="p-2">Diproses</th>
              <th className="p-2">Dalam Produksi</th>
              <th className="p-2">Selesai</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {productSummaries.map((p) => (
              <tr key={p.key} className="border-b">
                <td className="p-2">{p.label}</td>
                <td className="p-2">{p.PROCESSING}</td>
                <td className="p-2">{p.IN_PRODUCTION}</td>
                <td className="p-2">{p.DONE}</td>
                <td className="p-2 font-semibold">{p.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="p-2">Total Keseluruhan</td>
              <td className="p-2">{grandTotal.PROCESSING}</td>
              <td className="p-2">{grandTotal.IN_PRODUCTION}</td>
              <td className="p-2">{grandTotal.DONE}</td>
              <td className="p-2">{grandTotal.total}</td>
            </tr>
          </tfoot>
        </table>
      )}

      <h1 className="mb-4 text-2xl font-semibold">Order Kamu</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">No. Order</th>
            <th className="p-2">Status</th>
            <th className="p-2">Jumlah Item</th>
          </tr>
        </thead>
        <tbody>
          {orderIds.map((orderId) => {
            const orderItems = items.filter((i) => i.orderId === orderId);
            const order = orderItems[0].order;
            return (
              <tr key={orderId} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <Link href={`/vendor/orders/${orderId}`} className="underline">{order.orderNumber}</Link>
                </td>
                <td className="p-2">{order.status}</td>
                <td className="p-2">{orderItems.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
