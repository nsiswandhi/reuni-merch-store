import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// invnity.ialima.id is verified in Resend (SPF + DKIM DNS records added under the
// ialima.id Cloudflare zone), so mail can now be delivered to any recipient, not just
// the Resend account owner's own inbox (as onboarding@resend.dev was restricted to).
const FROM_ADDRESS = "Reuni Akbar InVnity <no-reply@invnity.ialima.id>";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function siteBase(): string {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

function orderUrl(token: string): string {
  return `${siteBase()}/order/${token}`;
}

async function safeSend(args: { to: string; subject: string; html: string }): Promise<void> {
  try {
    // Constructed here (not at module scope) so a missing/invalid RESEND_API_KEY
    // is caught by this same try/catch instead of throwing at import time and
    // crashing every route that imports this module (checkout, confirm/reject, etc).
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM_ADDRESS, to: args.to, subject: args.subject, html: args.html });
  } catch (error) {
    console.error("Failed to send email:", args.subject, "to", args.to, error);
  }
}

// Shared by sendOrderCreatedEmails and sendPreorderQuotaMetEmail — both are
// "here's how to pay" emails, they just fire at different points in time
// (immediately at checkout vs. once a preorder's quota is met).
function paymentInstructionsHtml(settings: { bankName: string; bankAccountNumber: string; bankAccountName: string; qrisImageUrl: string | null }): string {
  const qrisHtml = settings.qrisImageUrl
    ? `<p>Atau scan QRIS berikut:</p>
       <p><img src="${siteBase()}${settings.qrisImageUrl}" alt="QRIS" width="200" style="max-width:200px;height:auto;" /></p>`
    : "";
  return `<p>Silakan transfer ke: ${settings.bankName} ${settings.bankAccountNumber} a.n. ${settings.bankAccountName}.</p>
          ${qrisHtml}`;
}

export async function sendOrderCreatedEmails(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });

    await safeSend({
      to: settings.adminNotificationEmail,
      subject: `Order baru masuk: ${order.orderNumber}`,
      html: `<p>Order baru dari ${order.buyerName} sebesar ${formatRupiah(order.total)}.</p>
             <p><a href="${orderUrl(order.token)}">Lihat detail order</a></p>`,
    });

    await safeSend({
      to: order.buyerEmail,
      subject: `Pesanan kamu diterima: ${order.orderNumber}`,
      html: `<p>Halo ${order.buyerName}, pesanan kamu sebesar ${formatRupiah(order.total)} sudah diterima.</p>
             ${paymentInstructionsHtml(settings)}
             <p>Lalu upload bukti transfer di halaman berikut:</p>
             <p><a href="${orderUrl(order.token)}">${orderUrl(order.token)}</a></p>`,
    });
  } catch (error) {
    console.error("sendOrderCreatedEmails failed:", error);
  }
}

// Sent right after a buyer reserves a preorder slot — no payment info yet,
// since payment is only requested once the product's minimum quota is met.
export async function sendPreorderReservationEmails(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    const product = order.items[0]?.product;

    await safeSend({
      to: settings.adminNotificationEmail,
      subject: `Reservasi preorder baru: ${order.orderNumber}`,
      html: `<p>Reservasi preorder baru dari ${order.buyerName} sebesar ${formatRupiah(order.total)}.</p>
             <p><a href="${orderUrl(order.token)}">Lihat detail order</a></p>`,
    });

    const progressHtml = product
      ? `<p>Progress kuota saat ini: ${product.preorderReservedQty} dari minimal ${product.preorderMinQty} pcs.</p>`
      : "";

    await safeSend({
      to: order.buyerEmail,
      subject: `Reservasi preorder kamu diterima: ${order.orderNumber}`,
      html: `<p>Halo ${order.buyerName}, reservasi preorder kamu (${formatRupiah(order.total)}) sudah diterima.</p>
             <p>Ini <strong>belum perlu dibayar</strong> — kami akan kirim email instruksi pembayaran begitu kuota minimum produk ini terpenuhi.</p>
             ${progressHtml}
             <p><a href="${orderUrl(order.token)}">${orderUrl(order.token)}</a></p>`,
    });
  } catch (error) {
    console.error("sendPreorderReservationEmails failed:", error);
  }
}

// Sent once a preorder's quota is met and the order moves from RESERVED to
// PENDING_PAYMENT — this is the buyer's actual "please pay now" email,
// giving them the same 3-day window the existing reminder cron enforces.
export async function sendPreorderQuotaMetEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });

    await safeSend({
      to: order.buyerEmail,
      subject: `Kuota preorder terpenuhi, silakan bayar: ${order.orderNumber}`,
      html: `<p>Halo ${order.buyerName}, kabar baik — kuota minimum untuk preorder kamu sudah terpenuhi!</p>
             <p>Silakan selesaikan pembayaran sebesar ${formatRupiah(order.total)} dalam 3 hari ke depan.</p>
             ${paymentInstructionsHtml(settings)}
             <p>Lalu upload bukti transfer di halaman berikut:</p>
             <p><a href="${orderUrl(order.token)}">${orderUrl(order.token)}</a></p>`,
    });
  } catch (error) {
    console.error("sendPreorderQuotaMetEmail failed:", error);
  }
}

export async function sendProofUploadedNotificationToAdmin(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const settings = await prisma.adminSettings.findUniqueOrThrow({ where: { id: "singleton" } });

    await safeSend({
      to: settings.adminNotificationEmail,
      subject: `Bukti transfer baru: ${order.orderNumber}`,
      html: `<p>Order ${order.orderNumber} dari ${order.buyerName} sudah upload bukti transfer, mohon dicek.</p>
             <p><a href="${orderUrl(order.token)}">Lihat detail order</a></p>`,
    });
  } catch (error) {
    console.error("sendProofUploadedNotificationToAdmin failed:", error);
  }
}

export async function sendPaymentConfirmedEmails(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { vendor: true } } },
    });

    await safeSend({
      to: order.buyerEmail,
      subject: `Pembayaran dikonfirmasi: ${order.orderNumber}`,
      html: `<p>Halo ${order.buyerName}, pembayaran untuk order ${order.orderNumber} sudah dikonfirmasi. Terima kasih!</p>`,
    });

    const vendorEmails = new Map(order.items.map((item) => [item.vendor.id, item.vendor.email]));
    for (const [vendorId, vendorEmail] of vendorEmails) {
      const vendorItemCount = order.items.filter((i) => i.vendor.id === vendorId).length;
      await safeSend({
        to: vendorEmail,
        subject: `Order baru untuk diproses: ${order.orderNumber}`,
        html: `<p>Ada order baru (${vendorItemCount} item) yang sudah dibayar dan perlu kamu proses.</p>
               <p>Cek di panel vendor kamu.</p>`,
      });
    }
  } catch (error) {
    console.error("sendPaymentConfirmedEmails failed:", error);
  }
}

export async function sendProofRejectedEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    await safeSend({
      to: order.buyerEmail,
      subject: `Bukti transfer belum valid: ${order.orderNumber}`,
      html: `<p>Halo ${order.buyerName}, bukti transfer untuk order ${order.orderNumber} belum bisa diverifikasi.</p>
             <p>Silakan upload ulang di: <a href="${orderUrl(order.token)}">${orderUrl(order.token)}</a></p>`,
    });
  } catch (error) {
    console.error("sendProofRejectedEmail failed:", error);
  }
}

export async function sendReminderEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    await safeSend({
      to: order.buyerEmail,
      subject: `Reminder: order ${order.orderNumber} belum dibayar`,
      html: `<p>Halo ${order.buyerName}, order ${order.orderNumber} sebesar ${formatRupiah(order.total)} belum kami terima pembayarannya.</p>
             <p>Order akan kedaluwarsa otomatis jika belum dibayar dalam 3x24 jam.</p>
             <p><a href="${orderUrl(order.token)}">${orderUrl(order.token)}</a></p>`,
    });
  } catch (error) {
    console.error("sendReminderEmail failed:", error);
  }
}

export async function sendOrderCancelledEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    await safeSend({
      to: order.buyerEmail,
      subject: `Order dibatalkan: ${order.orderNumber}`,
      html: `<p>Halo ${order.buyerName}, order ${order.orderNumber} sudah dibatalkan oleh admin.</p>
             <p>Kalau ini tidak sesuai harapan kamu, silakan hubungi panitia.</p>`,
    });
  } catch (error) {
    console.error("sendOrderCancelledEmail failed:", error);
  }
}

export async function sendExpiredEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    await safeSend({
      to: order.buyerEmail,
      subject: `Order kedaluwarsa: ${order.orderNumber}`,
      html: `<p>Halo ${order.buyerName}, order ${order.orderNumber} sudah kedaluwarsa karena belum ada pembayaran.</p>
             <p>Kalau kamu masih ingin memesan, silakan buat pesanan baru.</p>`,
    });
  } catch (error) {
    console.error("sendExpiredEmail failed:", error);
  }
}
