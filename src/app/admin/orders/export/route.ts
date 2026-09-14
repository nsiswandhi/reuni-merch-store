import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/current-user";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  AWAITING_CONFIRMATION: "Menunggu Konfirmasi",
  PAID: "Sudah Dibayar",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Tidak diizinkan.", { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const vendorId = request.nextUrl.searchParams.get("vendorId") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  const orderWhere: Prisma.OrderWhereInput = {};
  if (q) {
    orderWhere.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { buyerName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) {
    orderWhere.status = status as Prisma.EnumOrderStatusFilter["equals"];
  }
  if (vendorId) {
    orderWhere.items = { some: { vendorId } };
  }

  const items = await prisma.orderItem.findMany({
    where: { order: orderWhere, ...(vendorId ? { vendorId } : {}) },
    include: { order: true, vendor: true },
    orderBy: { order: { createdAt: "desc" } },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Order");

  sheet.columns = [
    { header: "No. Order", key: "orderNumber", width: 20 },
    { header: "Tanggal", key: "tanggal", width: 20 },
    { header: "Nama Pembeli", key: "buyerName", width: 20 },
    { header: "Angkatan", key: "buyerAngkatan", width: 12 },
    { header: "Email", key: "buyerEmail", width: 25 },
    { header: "WhatsApp", key: "buyerWhatsapp", width: 18 },
    { header: "Metode Kirim", key: "deliveryMethod", width: 14 },
    { header: "Alamat", key: "shippingAddress", width: 30 },
    { header: "Vendor", key: "vendor", width: 18 },
    { header: "Produk", key: "produk", width: 25 },
    { header: "Varian", key: "varian", width: 18 },
    { header: "Qty", key: "qty", width: 8 },
    { header: "Harga Satuan", key: "unitPrice", width: 15 },
    { header: "Subtotal Item", key: "itemSubtotal", width: 15 },
    { header: "Ongkir", key: "shippingCost", width: 12 },
    { header: "Total Order", key: "total", width: 15 },
    { header: "Status Bayar", key: "status", width: 20 },
    { header: "Status Fulfillment", key: "fulfillmentStatus", width: 16 },
    { header: "Tgl Konfirmasi", key: "confirmedAt", width: 20 },
  ];

  for (const item of items) {
    sheet.addRow({
      orderNumber: item.order.orderNumber,
      tanggal: item.order.createdAt.toISOString(),
      buyerName: item.order.buyerName,
      buyerAngkatan: item.order.buyerAngkatan,
      buyerEmail: item.order.buyerEmail,
      buyerWhatsapp: item.order.buyerWhatsapp,
      deliveryMethod: item.order.deliveryMethod,
      shippingAddress: item.order.shippingAddress ?? "",
      vendor: item.vendor.brandName,
      produk: item.productNameSnapshot,
      varian: item.variantLabelSnapshot,
      qty: item.qty,
      unitPrice: item.unitPriceSnapshot,
      itemSubtotal: item.unitPriceSnapshot * item.qty,
      shippingCost: item.order.shippingCost,
      total: item.order.total,
      status: STATUS_LABELS[item.order.status] ?? item.order.status,
      fulfillmentStatus: item.fulfillmentStatus,
      confirmedAt: item.order.confirmedAt ? item.order.confirmedAt.toISOString() : "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="orders-export-${Date.now()}.xlsx"`,
    },
  });
}
