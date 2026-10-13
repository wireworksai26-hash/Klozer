/**
 * KLOZER FILE UPLOAD CONTROLLER (BE-05)
 * Handles secure file uploads with strict magic-number MIME validation
 * and payload size limits for Payment Proofs and Product Catalog imports.
 */

import crypto from "crypto";
import {
  ALLOWED_CATALOG_MIMES,
  ALLOWED_IMAGE_MIMES,
  MAX_CATALOG_FILE_SIZE,
  MAX_PROOF_IMAGE_SIZE,
  validateUploadedBuffer,
} from "../utils/fileValidator.js";
import { badRequest } from "../utils/errors.js";
import { audit } from "../services/auditService.js";

function parseBufferFromRequest(req) {
  if (req.body?.fileBase64) {
    const rawBase64 = String(req.body.fileBase64).replace(/^data:[^;]+;base64,/, "");
    return {
      buffer: Buffer.from(rawBase64, "base64"),
      fileName: req.body.fileName || "upload_file",
    };
  }

  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    return {
      buffer: req.rawBody,
      fileName: req.headers["x-file-name"] || "raw_upload",
    };
  }

  throw badRequest("Payload upload wajib menyertakan 'fileBase64' dan 'fileName'.");
}

/**
 * POST /uploads/receipt
 * Validates payment transfer proof image/PDF (max 5 MB).
 */
export async function uploadReceiptProof(req, res) {
  const { buffer, fileName } = parseBufferFromRequest(req);

  const result = validateUploadedBuffer({
    buffer,
    declaredFileName: fileName,
    allowedMimes: ALLOWED_IMAGE_MIMES,
    maxSizeBytes: MAX_PROOF_IMAGE_SIZE,
  });

  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const storedName = `proof_${Date.now()}_${fileHash.slice(0, 12)}.${result.mimeType.split("/")[1] || "bin"}`;

  await audit(req, "upload.receipt_proof", {
    entityType: "payment_proof",
    metadata: { fileName, detectedMime: result.mimeType, sizeBytes: result.size, fileHash },
  });

  res.status(201).json({
    success: true,
    message: "Bukti transfer valid dan berhasil diunggah.",
    data: {
      fileName,
      storedName,
      mimeType: result.mimeType,
      sizeBytes: result.size,
      checksumSha256: fileHash,
      verifiedMagicNumber: true,
    },
  });
}

/**
 * POST /uploads/catalog
 * Validates product catalog / inventory spreadsheet (XLSX, XLS, CSV - max 10 MB).
 */
export async function uploadCatalogFile(req, res) {
  const { buffer, fileName } = parseBufferFromRequest(req);

  const result = validateUploadedBuffer({
    buffer,
    declaredFileName: fileName,
    allowedMimes: ALLOWED_CATALOG_MIMES,
    maxSizeBytes: MAX_CATALOG_FILE_SIZE,
  });

  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const storedName = `catalog_${Date.now()}_${fileHash.slice(0, 12)}.${fileName.endsWith(".csv") ? "csv" : "xlsx"}`;

  await audit(req, "upload.catalog_import", {
    entityType: "product_catalog",
    metadata: { fileName, detectedMime: result.mimeType, sizeBytes: result.size, fileHash },
  });

  res.status(201).json({
    success: true,
    message: "File katalog valid dan siap diimpor.",
    data: {
      fileName,
      storedName,
      mimeType: result.mimeType,
      sizeBytes: result.size,
      checksumSha256: fileHash,
      verifiedMagicNumber: true,
    },
  });
}
