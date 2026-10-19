import { query, queryOne } from "../config/db.js";
import { badRequest, notFound } from "../utils/errors.js";
import { downloadMedia } from "../services/channels/channelService.js";
import { MAX_PROOF_BYTES, previewPaymentProof } from "../services/paymentProofService.js";
import { assertTokenQuota, estimateTokens, recordTokenUsage } from "../services/tokenService.js";

const MEDIA_PREFIX = "wa-media:";

/** The file's real type, from its first bytes (the claimed mime type is not trusted). */
function sniffMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

/** GET /payment-proofs/:id/image: the customer's proof, fetched from WhatsApp on demand (nothing is stored on our disk). */
export async function getProofImage(req, res) {
  const row = await queryOne(
    `SELECT p.image_url, l.channel_id, l.channel_type FROM payment_proofs p JOIN orders o ON o.id = p.order_id JOIN leads l ON l.id = o.lead_id WHERE p.id = ? AND o.institution_id = ?`,
    [req.params.id, req.tenantId]
  );
  if (!row || !String(row.image_url).startsWith(MEDIA_PREFIX)) throw notFound("Bukti pembayaran tidak ditemukan.");

  // the proof is fetched with the account the customer wrote to (a tenant may have several numbers)
  const file = await downloadMedia({ institutionId: req.tenantId, channelId: row.channel_id, type: row.channel_type, mediaId: row.image_url.slice(MEDIA_PREFIX.length) });
  if (!file) throw notFound("Berkas tidak lagi tersedia di platform asalnya (WhatsApp menyimpan media sekitar 30 hari; alamat file Messenger dan Instagram cepat kedaluwarsa).");

  res.set({
    "Content-Type": file.mimeType,
    "Content-Disposition": "inline",
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  res.send(file.buffer);
}

/** GET /orders/:id/proofs: what the AI read from each proof, newest first. */
export async function listOrderProofs(req, res) {
  const order = await queryOne("SELECT id, review_status FROM orders WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!order) throw notFound("Pesanan tidak ditemukan.");
  const rows = await query(
    `SELECT id, ocr_extracted_amount, ocr_extracted_date, ocr_extracted_bank, is_suspicious, confidence_score, fraud_reasons_json, created_at
       FROM payment_proofs WHERE order_id = ? ORDER BY id DESC LIMIT 20`,
    [order.id]
  );
  const items = rows.map((r) => ({
    id: r.id,
    amount: r.ocr_extracted_amount === null ? null : Number(r.ocr_extracted_amount),
    paidAt: r.ocr_extracted_date,
    bank: r.ocr_extracted_bank,
    suspicious: Boolean(r.is_suspicious),
    confidence: r.confidence_score,
    reasons: typeof r.fraud_reasons_json === "string" ? JSON.parse(r.fraud_reasons_json) : r.fraud_reasons_json || [],
    createdAt: r.created_at,
    imageUrl: `/api/v1/payment-proofs/${r.id}/image`,
  }));
  res.json({ success: true, reviewStatus: order.review_status, items });
}

/**
 * POST /ai/analyze-proof: dry run for the AI simulator. Reads an uploaded proof and reports what the assistant
 * would do. Nothing is saved, no order is touched and no message is sent.
 */
export async function analyzeProofPreview(req, res) {
  const buffer = Buffer.from(req.body.imageBase64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_PROOF_BYTES) throw badRequest("Ukuran berkas maksimal 5 MB.");
  const mimeType = sniffMime(buffer);
  if (!mimeType) throw badRequest("Berkas harus berupa foto JPG, PNG, WebP, atau PDF.");

  await assertTokenQuota(req.tenantId);
  const result = await previewPaymentProof({ institutionId: req.tenantId, file: { buffer, mimeType } });

  if (result.read?.usage) {
    await recordTokenUsage({
      institutionId: req.tenantId,
      userId: req.user.id,
      model: result.read.model || "vision",
      usageType: "ai_sandbox",
      promptTokens: result.read.usage.promptTokens ?? estimateTokens("bukti pembayaran") + 1000,
      completionTokens: result.read.usage.completionTokens ?? 150,
      latencyMs: result.read.latencyMs ?? 0,
    }).catch(() => {});
  }
  res.json({ success: true, ...result });
}
