"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";

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

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (admin && (await verifyPassword(password, admin.passwordHash))) {
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
  if (vendor && (await verifyPassword(password, vendor.passwordHash))) {
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

  return { error: "Email atau password salah." };
}

export async function logout(): Promise<void> {
  (await cookies()).delete("session");
  redirect("/login");
}
