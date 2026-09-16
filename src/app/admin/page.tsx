import { prisma } from "@/lib/prisma";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

// Order statuses that count as "dipesan" (ordered, awaiting payment/confirmation)
// in the per-vendor breakdown below — as opposed to RESERVED (preorder slot
// held, quota not met yet) which is tracked separately.
const ORDERED_STATUSES = ["PENDING_PAYMENT", "AWAITING_CONFIRMATION"] as const;

export default async function AdminDashboardPage() {
  const [
    pendingCount,
    awaitingCount,
    paidCount,
    expiredCount,
    reservedCount,
    paidAgg,
    productTotal,
    preorderProductTotal,
    preorderProducts,
    vendors,
    reservedByVendor,
    orderedByVendor,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "AWAITING_CONFIRMATION" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "EXPIRED" } }),
    prisma.order.count({ where: { status: "RESERVED" } }),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { isPreorder: true } }),
    prisma.product.findMany({
      where: { isPreorder: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        preorderReservedQty: true,
        preorderMinQty: true,
        vendor: { select: { brandName: true } },
      },
    }),
    prisma.vendor.findMany({ orderBy: { brandName: "asc" }, select: { id: true, brandName: true } }),
    prisma.orderItem.groupBy({
      by: ["vendorId"],
      where: { order: { status: "RESERVED" } },
      _sum: { qty: true },
    }),
    prisma.orderItem.groupBy({
      by: ["vendorId"],
      where: { order: { status: { in: [...ORDERED_STATUSES] } } },
      _sum: { qty: true },
    }),
  ]);

  const stats = [
    { label: "Menunggu Pembayaran", value: pendingCount },
    { label: "Menunggu Konfirmasi", value: awaitingCount },
    { label: "Sudah Dibayar", value: paidCount },
    { label: "Kedaluwarsa", value: expiredCount },
  ];

  const orderBreakdownStats = [
    { label: "Total Produk", value: productTotal },
    { label: "Total Produk Preorder", value: preorderProductTotal },
    { label: "Total Reserved", value: reservedCount },
  ];

  const reservedByVendorMap = new Map(reservedByVendor.map((row) => [row.vendorId, row._sum.qty ?? 0]));
  const orderedByVendorMap = new Map(orderedByVendor.map((row) => [row.vendorId, row._sum.qty ?? 0]));
  const vendorBreakdown = vendors.map((v) => ({
    id: v.id,
    brandName: v.brandName,
    reservedQty: reservedByVendorMap.get(v.id) ?? 0,
    orderedQty: orderedByVendorMap.get(v.id) ?? 0,
  }));

  return (
    <main>
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Dashboard</h1>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mb-8 text-lg">Total Omzet (order sudah dibayar): {formatRupiah(paidAgg._sum.total ?? 0)}</p>

      <h2 className="mb-4 font-[Bebas_Neue] text-2xl text-[#124B23]">Breakdown Produk &amp; Order</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {orderBreakdownStats.map((s) => (
          <div key={s.label} className="rounded border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-[Bebas_Neue] text-xl text-[#124B23]">Progres Kuota Preorder</h3>
      {preorderProducts.length === 0 ? (
        <p className="mb-8 text-sm text-gray-500">Belum ada produk preorder.</p>
      ) : (
        <table className="mb-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Produk</th>
              <th className="p-2">Vendor</th>
              <th className="p-2">Sudah Dipesan</th>
              <th className="p-2">Kuota</th>
              <th className="p-2">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {preorderProducts.map((p) => {
              const quota = p.preorderMinQty ?? 0;
              const sisa = Math.max(quota - p.preorderReservedQty, 0);
              return (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.vendor.brandName}</td>
                  <td className="p-2">{p.preorderReservedQty}</td>
                  <td className="p-2">{quota}</td>
                  <td className="p-2">{sisa}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3 className="mb-3 font-[Bebas_Neue] text-xl text-[#124B23]">Breakdown per Vendor</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Vendor</th>
            <th className="p-2">Total Produk Dipesan (Reserved)</th>
            <th className="p-2">Total Produk di Order (Menunggu Pembayaran/Konfirmasi)</th>
          </tr>
        </thead>
        <tbody>
          {vendorBreakdown.map((v) => (
            <tr key={v.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{v.brandName}</td>
              <td className="p-2">{v.reservedQty}</td>
              <td className="p-2">{v.orderedQty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
