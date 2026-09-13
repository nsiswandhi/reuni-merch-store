import { describe, it, expect } from "vitest";
import {
  canUploadProof,
  canConfirmPayment,
  canRejectProof,
  getReminderAction,
} from "../src/lib/order-status";

describe("status guards", () => {
  it("only allows proof upload while PENDING_PAYMENT", () => {
    expect(canUploadProof("PENDING_PAYMENT")).toBe(true);
    expect(canUploadProof("AWAITING_CONFIRMATION")).toBe(false);
    expect(canUploadProof("PAID")).toBe(false);
    expect(canUploadProof("EXPIRED")).toBe(false);
  });

  it("only allows confirming payment while AWAITING_CONFIRMATION", () => {
    expect(canConfirmPayment("AWAITING_CONFIRMATION")).toBe(true);
    expect(canConfirmPayment("PENDING_PAYMENT")).toBe(false);
    expect(canConfirmPayment("PAID")).toBe(false);
  });

  it("only allows rejecting proof while AWAITING_CONFIRMATION", () => {
    expect(canRejectProof("AWAITING_CONFIRMATION")).toBe(true);
    expect(canRejectProof("PAID")).toBe(false);
  });
});

describe("getReminderAction", () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");

  it("does nothing before 24 hours", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(getReminderAction(createdAt, 0, now)).toBe("NONE");
  });

  it("sends the first reminder at/after 24 hours if none sent yet", () => {
    const now = new Date("2026-01-02T01:00:00Z");
    expect(getReminderAction(createdAt, 0, now)).toBe("SEND_REMINDER");
  });

  it("does not send a second reminder before 48 hours", () => {
    const now = new Date("2026-01-02T02:00:00Z");
    expect(getReminderAction(createdAt, 1, now)).toBe("NONE");
  });

  it("sends the second reminder at/after 48 hours if only one sent", () => {
    const now = new Date("2026-01-03T01:00:00Z");
    expect(getReminderAction(createdAt, 1, now)).toBe("SEND_REMINDER");
  });

  it("expires at/after 72 hours regardless of reminder count", () => {
    const now = new Date("2026-01-04T01:00:00Z");
    expect(getReminderAction(createdAt, 2, now)).toBe("EXPIRE");
  });

  it("does not act again once both reminders are sent but under 72h", () => {
    const now = new Date("2026-01-03T02:00:00Z");
    expect(getReminderAction(createdAt, 2, now)).toBe("NONE");
  });
});
