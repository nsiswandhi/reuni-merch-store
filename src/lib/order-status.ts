export type OrderStatus = "PENDING_PAYMENT" | "AWAITING_CONFIRMATION" | "PAID" | "EXPIRED";

export function canUploadProof(status: OrderStatus): boolean {
  return status === "PENDING_PAYMENT";
}

export function canConfirmPayment(status: OrderStatus): boolean {
  return status === "AWAITING_CONFIRMATION";
}

export function canRejectProof(status: OrderStatus): boolean {
  return status === "AWAITING_CONFIRMATION";
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
