import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vendorId?: string; status?: string }>;
}) {
  const { q, vendorId, status } = await searchParams;

  const where: Prisma.OrderWhereInput = {};
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { buyerName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status as Prisma.EnumOrderStatusFilter["equals"];
  }
  if (vendorId) {
    where.items = { some: { vendorId } };
  }

  const [orders, vendors] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.vendor.findMany({ orderBy: { brandName: "asc" } }),
  ]);

  const exportQuery = new URLSearchParams();
  if (q) exportQuery.set("q", q);
  if (vendorId) exportQuery.set("vendorId", vendorId);
  if (status) exportQuery.set("status", status);

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Kelola Order</h1>
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={q} placeholder="Cari nomor order / nama pembeli" className="rounded border border-gray-300 px-3 py-2" />
        <select name="vendorId" defaultValue={vendorId ?? ""} className="rounded border border-gray-300 px-3 py-2">
          <option value="">Semua Vendor</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.brandName}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded border border-gray-300 px-3 py-2">
          <option value="">Semua Status</option>
          <option value="PENDING_PAYMENT">Menunggu Pembayaran</option>
          <option value="AWAITING_CONFIRMATION">Menunggu Konfirmasi</option>
          <option value="PAID">Sudah Dibayar</option>
          <option value="EXPIRED">Kedaluwarsa</option>
        </select>
        <button type="submit" className="rounded bg-[#124B23] px-4 py-2 text-white">Filter</button>
        <a
          href={`/admin/orders/export?${exportQuery.toString()}`}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Export Excel
        </a>
      </form>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">No. Order</th>
            <th className="p-2">Pembeli</th>
            <th className="p-2">Total</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <Link href={`/admin/orders/${order.id}`} className="underline">{order.orderNumber}</Link>
              </td>
              <td className="p-2">{order.buyerName}</td>
              <td className="p-2">{formatRupiah(order.total)}</td>
              <td className="p-2">{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
