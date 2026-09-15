import { getStore } from "@netlify/blobs";

// Login brute-force protection backed by Netlify Blobs — chosen instead of
// in-memory rate limiting because Netlify Functions are stateless per
// invocation, so an in-process counter wouldn't survive between requests.
// This reuses the same Blobs infrastructure already used for file uploads
// (src/lib/blobs.ts's "uploads" store), just a separate "login-attempts"
// store, so no new third-party service is introduced.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttemptState {
  count: number;
  firstAttemptAt: number; // epoch ms — start of the current attempt window
  lockedUntil: number | null; // epoch ms — set once count reaches MAX_ATTEMPTS
}

function keyFor(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Call before verifying a password. If locked out, the caller should refuse
 * the login attempt without touching the password hash at all.
 */
export async function checkLoginLockout(
  email: string
): Promise<{ lockedOut: boolean; retryAfterSeconds?: number }> {
  const store = getStore("login-attempts");
  const state = (await store.get(keyFor(email), { type: "json" })) as LoginAttemptState | null;
  if (!state?.lockedUntil) {
    return { lockedOut: false };
  }
  const now = Date.now();
  if (state.lockedUntil > now) {
    return { lockedOut: true, retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000) };
  }
  // Lock has expired — treat as not locked out; recordLoginFailure/
  // clearLoginAttempts will reset the window on the next attempt.
  return { lockedOut: false };
}

/**
 * Call after a failed password check (wrong password, or account/email not
 * found — callers should record a failure either way so this can't be used
 * to enumerate valid emails via unlimited attempts on a nonexistent one).
 */
export async function recordLoginFailure(email: string): Promise<void> {
  const store = getStore("login-attempts");
  const key = keyFor(email);
  const now = Date.now();
  const existing = (await store.get(key, { type: "json" })) as LoginAttemptState | null;

  const windowValid = existing !== null && now - existing.firstAttemptAt < LOCKOUT_MS;
  const count = windowValid ? existing!.count + 1 : 1;
  const firstAttemptAt = windowValid ? existing!.firstAttemptAt : now;
  const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null;

  await store.setJSON(key, { count, firstAttemptAt, lockedUntil } satisfies LoginAttemptState);
}

/** Call after a successful login to reset the counter for that email. */
export async function clearLoginAttempts(email: string): Promise<void> {
  const store = getStore("login-attempts");
  await store.delete(keyFor(email));
}
