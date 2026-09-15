"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";
import { checkLoginLockout, clearLoginAttempts, recordLoginFailure } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email dan password wajib diisi dengan benar." };
  }

  const { email, password } = parsed.data;

  // Checked before touching any password hash, so a locked-out attacker
  // can't keep guessing — and before the DB lookups below, so a lockout on
  // one email doesn't cost extra queries either.
  const lockout = await checkLoginLockout(email);
  if (lockout.lockedOut) {
    const minutes = Math.max(1, Math.ceil((lockout.retryAfterSeconds ?? 0) / 60));
    return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.` };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (admin && (await verifyPassword(password, admin.passwordHash))) {
    await clearLoginAttempts(email);
    const token = await createSessionToken({ sub: admin.id, role: "ADMIN" });
    (await cookies()).set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/admin");
  }

  const vendor = await prisma.vendor.findUnique({ where: { email } });
  if (vendor && vendor.isActive && (await verifyPassword(password, vendor.passwordHash))) {
    await clearLoginAttempts(email);
    const token = await createSessionToken({ sub: vendor.id, role: "VENDOR", vendorId: vendor.id });
    (await cookies()).set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/vendor");
  }

  // Recorded for both "wrong password" and "no such account" alike, so the
  // lockout counter can't be used to tell the two apart via unlimited
  // attempts against an email that doesn't exist.
  await recordLoginFailure(email);
  return { error: "Email atau password salah." };
}

export async function logout(): Promise<void> {
  (await cookies()).delete("session");
  redirect("/login");
}
