import type { Config } from "@netlify/functions";
import { prisma } from "../../src/lib/prisma";
import { getReminderAction } from "../../src/lib/order-status";
import { sendReminderEmail, sendExpiredEmail } from "../../src/lib/email";

export default async () => {
  const now = new Date();
  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT" },
    include: { items: true },
  });

  let remindersSent = 0;
  let expired = 0;

  for (const order of pendingOrders) {
    const action = getReminderAction(order.createdAt, order.reminderCount, now);

    if (action === "SEND_REMINDER") {
      await sendReminderEmail(order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: { reminderCount: { increment: 1 } },
      });
      remindersSent++;
    } else if (action === "EXPIRE") {
      // Release any stock this order had reserved at checkout — it never
      // got paid, so the units go back into the pool for other buyers.
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: "EXPIRED" },
        }),
        ...order.items.map((item) =>
          prisma.product.updateMany({
            where: { id: item.productId, availabilityMode: "STOCK" },
            data: { stock: { increment: item.qty } },
          })
        ),
      ]);
      await sendExpiredEmail(order.id);
      expired++;
    }
  }

  console.log(`daily-order-check: checked ${pendingOrders.length} orders, sent ${remindersSent} reminders, expired ${expired} orders`);

  return new Response("OK");
};

export const config: Config = {
  schedule: "0 1 * * *", // 01:00 UTC = 08:00 WIB, once per day
};
