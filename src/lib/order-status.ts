export type OrderStatus = "RESERVED" | "PENDING_PAYMENT" | "AWAITING_CONFIRMATION" | "PAID" | "EXPIRED" | "CANCELLED";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "RESERVED",
  "PENDING_PAYMENT",
  "AWAITING_CONFIRMATION",
  "PAID",
  "EXPIRED",
  "CANCELLED",
];

// Validates a raw URL query-string value against the real enum before it's
// used in a Prisma `where` filter, instead of trusting an unchecked
// `as Prisma.EnumOrderStatusFilter["equals"]` cast. An unrecognized value
// (typo'd or tampered with) is treated as "no filter" rather than thrown —
// this only ever narrows an admin list/export query, so failing open to
// "show everything" is safe and simpler than surfacing a 400.
export function parseOrderStatusFilter(value: string | undefined): OrderStatus | undefined {
  if (value && (ORDER_STATUSES as string[]).includes(value)) {
    return value as OrderStatus;
  }
  return undefined;
}

export function canUploadProof(status: OrderStatus): boolean {
  return status === "PENDING_PAYMENT";
}

export function canConfirmPayment(status: OrderStatus): boolean {
  return status === "AWAITING_CONFIRMATION";
}

export function canRejectProof(status: OrderStatus): boolean {
  return status === "AWAITING_CONFIRMATION";
}

// Cancelling releases any stock (or preorder quota slot) the order reserved
// at checkout, so it's only allowed before payment is confirmed — an
// already-PAID order represents a real, fulfilled transaction and isn't
// cancellable from here. RESERVED (preorder, quota not met yet) is
// cancellable too, so admins can release someone's reservation.
export function canCancelOrder(status: OrderStatus): boolean {
  return status === "RESERVED" || status === "PENDING_PAYMENT" || status === "AWAITING_CONFIRMATION";
}

const HOUR_MS = 60 * 60 * 1000;

export type ReminderAction = "NONE" | "SEND_REMINDER" | "EXPIRE";

/**
 * Pure function used both by the checkout-age UI and the daily cron job.
 * reminderCount tracks how many reminders have been sent so far (0, 1, or 2+).
 */
export function getReminderAction(
  createdAt: Date,
  reminderCount: number,
  now: Date
): ReminderAction {
  const ageHours = (now.getTime() - createdAt.getTime()) / HOUR_MS;

  if (ageHours >= 72) {
    return "EXPIRE";
  }
  if (ageHours >= 48 && reminderCount < 2) {
    return "SEND_REMINDER";
  }
  if (ageHours >= 24 && reminderCount < 1) {
    return "SEND_REMINDER";
  }
  return "NONE";
}
