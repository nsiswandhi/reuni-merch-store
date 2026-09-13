import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export default async function VendorOrdersPage() {
  const session = await getCurrentSession();
  const vendorId = session!.vendorId!;

  const items = await prisma.orderItem.findMany({
    where: { vendorId },
    include: { order: true },
    orderBy: { order: { createdAt: "desc" } },
  });

  const orderIds = [...new Set(items.map((i) => i.orderId))];

  return (
    <main>
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
