"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/current-user";

export async function updateFulfillmentStatus(orderId: string, formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session || session.role !== "VENDOR" || !session.vendorId) {
    throw new Error("Tidak diizinkan.");
  }

  const newStatus = formData.get("status");
  if (newStatus !== "PROCESSING" && newStatus !== "IN_PRODUCTION" && newStatus !== "DONE") {
    throw new Error("Status tidak valid.");
  }

  // Scoped to orderId AND vendorId AND order.status === "PAID" — updateMany silently
  // affects zero rows if this vendor has no items in that (PAID) order, which is the
  // correct "no access" behavior (vendors can't act on unpaid/expired orders — I7).
  await prisma.orderItem.updateMany({
    where: { orderId, vendorId: session.vendorId, order: { status: "PAID" } },
    data: { fulfillmentStatus: newStatus },
  });

  revalidatePath(`/vendor/orders/${orderId}`);
  revalidatePath("/vendor");
}
