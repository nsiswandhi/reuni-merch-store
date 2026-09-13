import { NextRequest } from "next/server";
import { getStore } from "@netlify/blobs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const store = getStore("uploads");
  const blob = await store.get(decodeURIComponent(key), { type: "arrayBuffer" });
  if (!blob) {
    return new Response("Not found", { status: 404 });
  }
  const metadata = await store.getMetadata(decodeURIComponent(key));
  const contentType = (metadata?.metadata?.contentType as string) ?? "application/octet-stream";
  return new Response(blob, { headers: { "Content-Type": contentType } });
}
