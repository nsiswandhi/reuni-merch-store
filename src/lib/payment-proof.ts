import { prisma } from "@/lib/prisma";
import { canUploadProof, type OrderStatus } from "@/lib/order-status";
import { validateFileSignature, validateUploadFile, uploadBufferToBlobs } from "@/lib/blobs";

/**
 * Shared by the buyer's own upload form (order/[token]/actions.ts) and the
 * admin's upload-on-buyer's-behalf action (admin/orders/actions.ts) — same
 * validation, storage, and order-update logic either way, so the two entry
 * points can't quietly drift apart. Callers are responsible for loading the
 * order themselves (buyer looks it up by token, admin already has it by id)
 * and for any notification email, since that differs between the two paths.
 */
export async function savePaymentProofFile(
  order: { id: string; status: OrderStatus },
  file: FormDataEntryValue | null
): Promise<{ error?: string; url?: string }> {
  if (!canUploadProof(order.status)) {
    return { error: "Order ini tidak bisa menerima upload bukti transfer saat ini." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file bukti transfer terlebih dahulu." };
  }

  const validationError = validateUploadFile(file);
  if (validationError) {
    return { error: validationError };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signatureError = validateFileSignature(buffer, file.type);
  if (signatureError) {
    return { error: signatureError };
  }

  const key = `payment-proofs/${order.id}-${Date.now()}`;
  const url = await uploadBufferToBlobs(key, buffer, file.type);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentProofUrl: url,
      proofUploadedAt: new Date(),
      status: "AWAITING_CONFIRMATION",
    },
  });

  return { url };
}
