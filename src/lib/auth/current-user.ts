import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/session";

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
