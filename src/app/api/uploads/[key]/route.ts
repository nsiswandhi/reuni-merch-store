import { NextRequest } from "next/server";
import { getStore } from "@netlify/blobs";
import { getCurrentSession } from "@/lib/auth/current-user";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  if (decodedKey.startsWith("payment-proofs/")) {
    const session = await getCurrentSession();
    if (!session || session.role !== "ADMIN") {
      return new Response("Tidak diizinkan.", { status: 403 });
    }
  }

  const store = getStore("uploads");
  const blob = await store.get(decodedKey, { type: "arrayBuffer" });
  if (!blob) {
    return new Response("Not found", { status: 404 });
  }
  const metadata = await store.getMetadata(decodedKey);
  const contentType = (metadata?.metadata?.contentType as string) ?? "application/octet-stream";
  return new Response(blob, {
    headers: { "Content-Type": contentType, "X-Content-Type-Options": "nosniff" },
  });
}
