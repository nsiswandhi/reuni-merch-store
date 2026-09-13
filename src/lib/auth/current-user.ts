import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/session";

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// Render-time gating (middleware matcher, admin/layout.tsx guard) does NOT protect a
// Server Action's own POST invocation — each admin Server Action must check for itself.
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Tidak diizinkan.");
  }
  return session;
}
