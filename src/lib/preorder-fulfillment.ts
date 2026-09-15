import { prisma } from "@/lib/prisma";
import { sendPreorderQuotaMetEmail } from "@/lib/email";

// Called right after a preorder reservation is created. If the product's
// quota is now met, moves every RESERVED order for that product to
// PENDING_PAYMENT (starting their 3-day payment window) and resets
// preorderReservedQty to 0 so the next round starts counting fresh.
//
// Race-safe the same way the STOCK decrement in checkout/actions.ts is: the
// reset is a conditional updateMany guarded by `preorderReservedQty >= min`.
// If two reservations cross the quota at nearly the same time, only the
// first one to run this sees the guard still match (count === 1) — the
// second sees reservedQty already reset to 0 by the time it runs, so its
// guard matches zero rows and it does nothing further.
export async function finalizePreorderRoundIfQuotaMet(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isPreorder || product.preorderMinQty == null) {
    return;
  }
  if (product.preorderReservedQty < product.preorderMinQty) {
    return;
  }

  const sealed = await prisma.product.updateMany({
    where: { id: productId, preorderReservedQty: { gte: product.preorderMinQty } },
    data: { preorderReservedQty: 0 },
  });
  if (sealed.count === 0) {
    return; // another concurrent reservation already sealed this round
  }

  const affectedOrders = await prisma.order.findMany({
    where: { status: "RESERVED", isPreorder: true, items: { some: { productId } } },
  });
  if (affectedOrders.length === 0) {
    return;
  }

  const now = new Date();
  await prisma.order.updateMany({
    where: { id: { in: affectedOrders.map((o) => o.id) } },
    data: { status: "PENDING_PAYMENT", paymentDueStartedAt: now },
  });

  for (const order of affectedOrders) {
    await sendPreorderQuotaMetEmail(order.id);
  }
}
