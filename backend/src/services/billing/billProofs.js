import crypto from "node:crypto";
import { query, queryOne } from "../../config/db.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { validateUploadedBuffer } from "../../utils/fileValidator.js";

/**
 * Pictures of proof of payment on Klozer's own bills (a token top up or a package order). The shop uploads them after
 * paying; the team opens them next to the bill. Only pictures (PNG, JPEG, WebP) are accepted and they are checked by their
 * bytes. A bill takes a few, so a bill cannot be made into a place to store files.
 */

export const PROOF_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_PROOF_BYTES = 3_000_000;
export const MAX_PROOFS_PER_BILL = 3;

const BILL_TABLE = { topup: "token_topups", order: "platform_orders" };
const OPEN_STATES = { topup: ["quoted", "credited"], order: ["pending", "paid"] };

const toProof = (r) => ({
  id: r.id,
  refType: r.ref_type,
  refId: r.ref_id,
  mime: r.mime,
  sizeBytes: Number(r.size_bytes),
  sha256: r.sha256,
  note: r.note,
  uploadedByName: r.uploaded_by_name ?? null,
  createdAt: r.created_at,
  url: `/api/v1/platform/payment-proofs/${r.id}`,
});

/** Store a proof on a bill of this shop. The bill must be open or paid (a cancelled bill takes none). */
export async function addProof({ refType, refId, institutionId, userId, buffer, fileName, note = null }) {
  const bill = await queryOne(`SELECT id, status FROM ${BILL_TABLE[refType]} WHERE id = ? AND institution_id = ?`, [refId, institutionId]);
  if (!bill) throw notFound("Tagihan tidak ditemukan.");
  if (!OPEN_STATES[refType].includes(bill.status)) throw conflict("Tagihan ini sudah dibatalkan.", { code: "BILL_CLOSED" });
  const count = await queryOne("SELECT COUNT(*) AS n FROM platform_payment_proofs WHERE ref_type = ? AND ref_id = ?", [refType, refId]);
  if (Number(count.n) >= MAX_PROOFS_PER_BILL) throw conflict(`Maksimal ${MAX_PROOFS_PER_BILL} bukti per tagihan.`, { code: "PROOF_LIMIT" });
  const checked = validateUploadedBuffer({ buffer, declaredFileName: fileName, allowedMimes: PROOF_MIMES, maxSizeBytes: MAX_PROOF_BYTES });
  const result = await query(
    "INSERT INTO platform_payment_proofs (ref_type, ref_id, institution_id, uploaded_by, file, mime, size_bytes, sha256, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [refType, refId, institutionId, userId, buffer, checked.mimeType, buffer.length, crypto.createHash("sha256").update(buffer).digest("hex"), note]
  );
  return { id: result.insertId, count: Number(count.n) + 1 };
}

export async function listProofs(refType, refId) {
  const rows = await query(
    `SELECT p.id, p.ref_type, p.ref_id, p.mime, p.size_bytes, p.sha256, p.note, p.created_at, u.name AS uploaded_by_name
       FROM platform_payment_proofs p LEFT JOIN users u ON u.id = p.uploaded_by WHERE p.ref_type = ? AND p.ref_id = ? ORDER BY p.id`,
    [refType, refId]
  );
  return rows.map(toProof);
}

/** One picture, for the team. */
export async function proofFile(id) {
  const row = await queryOne("SELECT file, mime FROM platform_payment_proofs WHERE id = ?", [id]);
  if (!row) throw notFound("Bukti pembayaran tidak ditemukan.");
  return { buffer: row.file, mime: row.mime };
}

export async function proofCount(refType, refId) {
  return Number((await queryOne("SELECT COUNT(*) AS n FROM platform_payment_proofs WHERE ref_type = ? AND ref_id = ?", [refType, refId])).n);
}

export function decodeProofBase64(text) {
  const raw = String(text).replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) throw badRequest("Isi gambar tidak valid.", { code: "INVALID_BASE64" });
  return Buffer.from(raw, "base64");
}
