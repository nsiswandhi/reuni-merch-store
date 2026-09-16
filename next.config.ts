import type { NextConfig } from "next";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// The admin "Bukti Transfer" (payment proof) viewer embeds this route's own
// response in a same-origin <iframe> (see payment-proof-dialog.tsx). The
// blanket policy above sends frame-ancestors 'none' + X-Frame-Options: DENY,
// which makes the browser refuse to render the iframe even for same-origin,
// admin-only content — that's the "refused to connect" error in the modal.
// Allow same-origin framing just for this route; it's already access-
// controlled (ADMIN session required for payment-proofs/*) so this doesn't
// reopen the clickjacking risk the blanket policy exists for.
const UPLOADS_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
      {
        // More specific rule matched after the blanket one above, so per
        // Next.js's "last header key wins" merge behavior, these two keys
        // override the DENY / frame-ancestors 'none' set for this path only.
        source: "/api/uploads/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: UPLOADS_CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default nextConfig;