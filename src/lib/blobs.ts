import { getStore } from "@netlify/blobs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "File harus berformat JPG, PNG, atau PDF.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Ukuran file maksimal 5MB.";
  }
  return null;
}

export async function uploadBufferToBlobs(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const store = getStore("uploads");
  // `@netlify/blobs`'s BlobInput type is `string | ArrayBuffer | Blob`; Node's Buffer
  // (a Uint8Array view) satisfies it at runtime (it exposes byteLength and works as a
  // fetch body) but isn't structurally assignable under the installed type defs.
  await store.set(key, buffer as unknown as ArrayBuffer, { metadata: { contentType } });
  return `/api/uploads/${encodeURIComponent(key)}`;
}
