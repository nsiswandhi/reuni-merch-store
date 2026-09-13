import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

export const config = {
  matcher: ["/admin/:path*", "/vendor/:path*"],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");
  const isVendorPath = request.nextUrl.pathname.startsWith("/vendor");

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAdminPath && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isVendorPath && session.role !== "VENDOR") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
