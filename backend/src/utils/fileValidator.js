/**
 * KLOZER FILE UPLOAD VALIDATOR (BE-05)
 * Magic-number based MIME type detector & size boundary validator.
 * Protects against Malicious Script Uploads and File Extension Spoofing.
 */

import { AppError } from "./errors.js";

export const MAX_PROOF_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_CATALOG_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const ALLOWED_CATALOG_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
]);

/**
 * Detect real MIME type from binary buffer using magic numbers.
 * @param {Buffer} buffer
 * @returns {string|null} Detected MIME type or null if unrecognized
 */
export function detectMimeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  // 1. Check for Executable & Script Signatures (Instant Blacklist)
  // Windows MZ header (EXE / DLL / COM)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) return "application/x-dosexec";
  // Linux ELF binary
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return "application/x-elf";
  // Shell script / PHP / HTML header
  const headerSlice = buffer.slice(0, Math.min(buffer.length, 128)).toString("utf8").toLowerCase();
  if (
    headerSlice.startsWith("#!") ||
    headerSlice.includes("<?php") ||
    headerSlice.includes("<script") ||
    headerSlice.includes("<!doctype html")
  ) {
    return "text/x-script";
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // 4. WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // 5. PDF: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }

  // 6. XLSX (ZIP archive PK..): 50 4B 03 04 / 50 4B 05 06 / 50 4B 07 08
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  // 7. XLS (Legacy Microsoft OLE Compound File): D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return "application/vnd.ms-excel";
  }

  // 8. CSV / Plain Text (Safe text only, no binary null characters)
  if (!buffer.includes(0x00)) {
    return "text/csv";
  }

  return null;
}

/**
 * Validate an uploaded file buffer against magic-number MIME and size boundaries.
 * @param {Object} options
 * @param {Buffer} options.buffer File data buffer
 * @param {string} [options.declaredFileName] File name sent by client
 * @param {Set<string>|Array<string>} options.allowedMimes Permitted MIME types
 * @param {number} options.maxSizeBytes Maximum allowable size in bytes
 * @returns {{ valid: boolean, mimeType: string, size: number }}
 */
export function validateUploadedBuffer({ buffer, declaredFileName = "", allowedMimes, maxSizeBytes }) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError(400, "File upload kosong atau tidak ditemukan.", { code: "EMPTY_FILE" });
  }

  // 1. Size constraint check
  if (buffer.length > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new AppError(413, `Ukuran file (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimum (${maxMb} MB).`, {
      code: "PAYLOAD_TOO_LARGE",
    });
  }

  // 2. Magic-number inspection
  const detectedMime = detectMimeFromBuffer(buffer);

  if (!detectedMime) {
    throw new AppError(415, "Tipe konten file tidak dikenali atau format tidak didukung.", {
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }

  if (detectedMime === "application/x-dosexec" || detectedMime === "application/x-elf" || detectedMime === "text/x-script") {
    throw new AppError(400, `File '${declaredFileName || "upload"}' ditolak: Terdeteksi file biner atau skrip berbahaya (Magic Number Disallowed).`, {
      code: "MALICIOUS_FILE_BLOCKED",
    });
  }

  const allowedSet = allowedMimes instanceof Set ? allowedMimes : new Set(allowedMimes);
  if (!allowedSet.has(detectedMime)) {
    throw new AppError(415, `Tipe file '${detectedMime}' tidak diizinkan. Hanya file yang valid (${[...allowedSet].join(", ")}) yang diterima.`, {
      code: "INVALID_FILE_TYPE",
    });
  }

  return {
    valid: true,
    mimeType: detectedMime,
    size: buffer.length,
  };
}
