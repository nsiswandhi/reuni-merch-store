import { getStore } from "@netlify/blobs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Client-declared `file.type` (Content-Type) is just a label the browser
// sent — it's trivial to relabel any file as image/jpeg before uploading.
// These are the real magic-byte signatures for the three allowed formats,
// checked against the actual uploaded bytes as a second, un-spoofable gate.
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // "%PDF"
};

function matchesSignature(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "File harus berformat JPG, PNG, atau PDF.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Ukuran file maksimal 5MB.";
  }
  return null;
}

/**
 * Call after reading the file into a Buffer, using the same `file.type`
 * already accepted by validateUploadFile. Catches files whose real content
 * doesn't match their declared/extension-based type (e.g. a script renamed
 * to .jpg with Content-Type spoofed to image/jpeg).
 */
export function validateFileSignature(buffer: Buffer, declaredType: string): string | null {
  const signatures = FILE_SIGNATURES[declaredType];
  if (!signatures || !signatures.some((sig) => matchesSignature(buffer, sig))) {
    return "Isi file tidak sesuai dengan formatnya. Pastikan file benar-benar JPG, PNG, atau PDF.";
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
