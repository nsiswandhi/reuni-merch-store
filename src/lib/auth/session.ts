import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  sub: string;
  role: "ADMIN" | "VENDOR";
  vendorId?: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, vendorId: payload.vendorId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub || (payload.role !== "ADMIN" && payload.role !== "VENDOR")) {
      return null;
    }
    return {
      sub: payload.sub,
      role: payload.role,
      vendorId: typeof payload.vendorId === "string" ? payload.vendorId : undefined,
    };
  } catch {
    return null;
  }
}
