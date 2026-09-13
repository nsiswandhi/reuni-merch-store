import { prisma } from "@/lib/prisma";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default async function AdminDashboardPage() {
  const [pendingCount, awaitingCount, paidCount, expiredCount, paidAgg] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "AWAITING_CONFIRMATION" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "EXPIRED" } }),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
  ]);

  const stats = [
    { label: "Menunggu Pembayaran", value: pendingCount },
    { label: "Menunggu Konfirmasi", value: awaitingCount },
    { label: "Sudah Dibayar", value: paidCount },
    { label: "Kedaluwarsa", value: expiredCount },
  ];

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
      <p className="text-lg">Total Omzet (order sudah dibayar): {formatRupiah(paidAgg._sum.total ?? 0)}</p>
    </main>
  );
}
