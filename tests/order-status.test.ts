import { describe, it, expect } from "vitest";
import {
  canUploadProof,
  canConfirmPayment,
  canRejectProof,
  canCancelOrder,
  getReminderAction,
  parseOrderStatusFilter,
} from "../src/lib/order-status";

describe("status guards", () => {
  it("only allows proof upload while PENDING_PAYMENT", () => {
    expect(canUploadProof("PENDING_PAYMENT")).toBe(true);
    expect(canUploadProof("RESERVED")).toBe(false);
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

  it("allows cancelling RESERVED (preorder), PENDING_PAYMENT, and AWAITING_CONFIRMATION orders", () => {
    expect(canCancelOrder("RESERVED")).toBe(true);
    expect(canCancelOrder("PENDING_PAYMENT")).toBe(true);
    expect(canCancelOrder("AWAITING_CONFIRMATION")).toBe(true);
  });

  it("does not allow cancelling PAID, EXPIRED, or already-CANCELLED orders", () => {
    expect(canCancelOrder("PAID")).toBe(false);
    expect(canCancelOrder("EXPIRED")).toBe(false);
    expect(canCancelOrder("CANCELLED")).toBe(false);
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

  it("sends the first reminder at exactly 24 hours", () => {
    const now = new Date("2026-01-02T00:00:00Z");
    expect(getReminderAction(createdAt, 0, now)).toBe("SEND_REMINDER");
  });

  it("sends the second reminder at exactly 48 hours", () => {
    const now = new Date("2026-01-03T00:00:00Z");
    expect(getReminderAction(createdAt, 1, now)).toBe("SEND_REMINDER");
  });

  it("expires at exactly 72 hours", () => {
    const now = new Date("2026-01-04T00:00:00Z");
    expect(getReminderAction(createdAt, 2, now)).toBe("EXPIRE");
  });
});

describe("parseOrderStatusFilter", () => {
  it("accepts every real status value", () => {
    expect(parseOrderStatusFilter("RESERVED")).toBe("RESERVED");
    expect(parseOrderStatusFilter("PENDING_PAYMENT")).toBe("PENDING_PAYMENT");
    expect(parseOrderStatusFilter("AWAITING_CONFIRMATION")).toBe("AWAITING_CONFIRMATION");
    expect(parseOrderStatusFilter("PAID")).toBe("PAID");
    expect(parseOrderStatusFilter("EXPIRED")).toBe("EXPIRED");
    expect(parseOrderStatusFilter("CANCELLED")).toBe("CANCELLED");
  });

  it("returns undefined for an unrecognized or empty value instead of throwing", () => {
    expect(parseOrderStatusFilter("paid")).toBeUndefined(); // wrong case
    expect(parseOrderStatusFilter("DROP TABLE orders")).toBeUndefined();
    expect(parseOrderStatusFilter("")).toBeUndefined();
    expect(parseOrderStatusFilter(undefined)).toBeUndefined();
  });
});
