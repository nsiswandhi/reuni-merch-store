import { describe, it, expect } from "vitest";
import { validateFileSignature } from "../src/lib/blobs";

describe("validateFileSignature", () => {
  it("accepts a buffer whose real bytes match its declared JPEG type", () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(validateFileSignature(jpegBuffer, "image/jpeg")).toBeNull();
  });

  it("accepts a buffer whose real bytes match its declared PNG type", () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(validateFileSignature(pngBuffer, "image/png")).toBeNull();
  });

  it("accepts a buffer whose real bytes match its declared PDF type", () => {
    const pdfBuffer = Buffer.from("%PDF-1.4\n...");
    expect(validateFileSignature(pdfBuffer, "application/pdf")).toBeNull();
  });

  it("rejects a file whose declared type doesn't match its real bytes (spoofed Content-Type)", () => {
    // A plain-text/script file relabeled as image/jpeg — this is exactly the
    // attack the magic-byte check exists to catch, since the browser-sent
    // Content-Type alone is trivially spoofable.
    const fakeJpeg = Buffer.from("<script>alert(1)</script>");
    expect(validateFileSignature(fakeJpeg, "image/jpeg")).not.toBeNull();
  });

  it("rejects an empty buffer", () => {
    expect(validateFileSignature(Buffer.from([]), "image/jpeg")).not.toBeNull();
  });

  it("rejects an unrecognized declared type", () => {
    expect(validateFileSignature(Buffer.from([0xff, 0xd8, 0xff]), "application/octet-stream")).not.toBeNull();
  });
});
