import { randomBytes } from "crypto";

export function generateOrderToken(): string {
  return randomBytes(24).toString("base64url");
}

export function generateOrderNumber(): string {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `INV-${timestampPart}-${randomPart}`;
}
