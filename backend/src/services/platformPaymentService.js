import { query, queryOne } from "../config/db.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { validateUploadedBuffer } from "../utils/fileValidator.js";
import { buildDynamicQris, inspectQris } from "../utils/qris.js";
import { decodeQrFromImage } from "../utils/qrisDecode.js";

/**
 * Where Klozer itself is paid: the QRIS merchant, a bank account, an e-wallet. The superadmin manages them; the payment
 * page and the token top up page show the active ones. A QRIS method is only shown once its image is uploaded, because a
 * QRIS entry without the code cannot be used to pay.
 */

export const QRIS_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_QRIS_IMAGE_BYTES = 1_500_000;

const toMethod = (r) => {
  // the merchant's code text itself never leaves the server; only whether dynamic codes can be made, and for whom
  const inspected = r.qris_payload ? inspectQris(r.qris_payload) : null;
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    accountName: r.account_name,
    accountNumber: r.account_number,
    instructions: r.instructions,
    hasQris: Boolean(r.has_image),
    // a hidden method's picture is only served to the superadmin, so its preview comes from the platform route
    qrisUrl: r.has_image ? (r.is_active ? `/api/v1/public/payment-methods/${r.id}/qris` : `/api/v1/platform/payment-methods/${r.id}/qris`) : null,
    isActive: Boolean(r.is_active),
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
    dynamicQris: Boolean(inspected?.ok),
    merchantName: inspected?.ok ? inspected.merchantName : null,
  };
};

const SELECT = "SELECT id, kind, label, account_name, account_number, instructions, qris_image IS NOT NULL AS has_image, qris_payload, is_active, sort_order, updated_at FROM platform_payment_methods";

/** @param {{ activeOnly?: boolean }} [opts] the public list shows only what can actually be used to pay */
export async function listMethods({ activeOnly = false } = {}) {
  const rows = await query(`${SELECT} ${activeOnly ? "WHERE is_active = 1 AND (kind <> 'qris' OR qris_image IS NOT NULL)" : ""} ORDER BY sort_order ASC, id ASC`);
  return rows.map(toMethod);
}

async function load(id) {
  const row = await queryOne(`${SELECT} WHERE id = ?`, [id]);
  if (!row) throw notFound("Metode pembayaran tidak ditemukan.");
  return row;
}

function assertComplete(kind, { accountName, accountNumber }) {
  if (kind !== "qris" && (!accountName || !accountNumber)) throw badRequest("Nama pemilik dan nomor rekening atau akun wajib diisi.", { code: "ACCOUNT_REQUIRED" });
}

export async function createMethod({ kind, label, accountName = null, accountNumber = null, instructions = null, sortOrder = 100, isActive = true }) {
  assertComplete(kind, { accountName, accountNumber });
  // a QRIS method starts hidden: it is switched on after its image is uploaded
  const active = kind === "qris" ? false : isActive;
  const result = await query("INSERT INTO platform_payment_methods (kind, label, account_name, account_number, instructions, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)", [kind, label, accountName, accountNumber, instructions, sortOrder, active ? 1 : 0]);
  return toMethod(await load(result.insertId));
}

export async function updateMethod(id, patch) {
  const current = await load(id);
  const next = { accountName: patch.accountName === undefined ? current.account_name : patch.accountName, accountNumber: patch.accountNumber === undefined ? current.account_number : patch.accountNumber };
  assertComplete(current.kind, next);
  if (patch.isActive === true && current.kind === "qris" && !current.has_image) throw conflict("Unggah gambar QRIS dulu sebelum mengaktifkan.", { code: "QRIS_IMAGE_REQUIRED" });

  const sets = [];
  const values = [];
  const set = (column, value) => (sets.push(`${column} = ?`), values.push(value));
  if (patch.label !== undefined) set("label", patch.label);
  if (patch.accountName !== undefined) set("account_name", patch.accountName);
  if (patch.accountNumber !== undefined) set("account_number", patch.accountNumber);
  if (patch.instructions !== undefined) set("instructions", patch.instructions);
  if (patch.sortOrder !== undefined) set("sort_order", patch.sortOrder);
  if (patch.isActive !== undefined) set("is_active", patch.isActive ? 1 : 0);
  if (sets.length) await query(`UPDATE platform_payment_methods SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  return toMethod(await load(id));
}

export async function deleteMethod(id) {
  const result = await query("DELETE FROM platform_payment_methods WHERE id = ?", [id]);
  if (!result.affectedRows) throw notFound("Metode pembayaran tidak ditemukan.");
}

/** Store the QRIS picture after checking the bytes really are a PNG, JPEG or WebP of a sensible size. */
export async function setQrisImage(id, { buffer, fileName }) {
  const current = await load(id);
  if (current.kind !== "qris") throw badRequest("Gambar hanya untuk metode QRIS.", { code: "NOT_QRIS" });
  const checked = validateUploadedBuffer({ buffer, declaredFileName: fileName, allowedMimes: QRIS_IMAGE_MIMES, maxSizeBytes: MAX_QRIS_IMAGE_BYTES });
  // read the merchant's code out of the picture, so each bill can get a code with its own amount
  const text = decodeQrFromImage(buffer, checked.mimeType);
  const read = text ? inspectQris(text) : { ok: false, reason: checked.mimeType === "image/webp" ? "Gambar WebP tidak bisa dibaca otomatis. Tempel isi kode QRIS-nya, atau unggah PNG atau JPG." : "Kode QR tidak terbaca dari gambar ini. Coba gambar yang lebih jelas, atau tempel isi kode QRIS-nya." };
  await query("UPDATE platform_payment_methods SET qris_image = ?, qris_mime = ?, qris_payload = ? WHERE id = ?", [buffer, checked.mimeType, read.ok ? text.trim() : null, id]);
  return { ...toMethod(await load(id)), qrisRead: read.ok ? { ok: true } : { ok: false, reason: read.reason } };
}

/** The text of the merchant's static QRIS, pasted by hand when it cannot be read from a picture. */
export async function setQrisPayload(id, payload) {
  const current = await load(id);
  if (current.kind !== "qris") throw badRequest("Kode QRIS hanya untuk metode QRIS.", { code: "NOT_QRIS" });
  const checked = inspectQris(payload);
  if (!checked.ok) throw badRequest(checked.reason, { code: "INVALID_QRIS_CODE" });
  await query("UPDATE platform_payment_methods SET qris_payload = ? WHERE id = ?", [String(payload).trim(), id]);
  return toMethod(await load(id));
}

export async function removeQrisPayload(id) {
  await load(id);
  await query("UPDATE platform_payment_methods SET qris_payload = NULL WHERE id = ? AND kind = 'qris'", [id]);
  return toMethod(await load(id));
}

/**
 * The code a payer scans for one amount: the first active QRIS method that has its code text, made dynamic. Null when no
 * method can do it, and the pay screens then show the static picture and the accounts instead.
 */
export async function dynamicQrisFor(amountIdr) {
  const row = await queryOne("SELECT qris_payload FROM platform_payment_methods WHERE kind = 'qris' AND is_active = 1 AND qris_payload IS NOT NULL ORDER BY sort_order ASC, id ASC LIMIT 1");
  if (!row) return null;
  const checked = inspectQris(row.qris_payload);
  if (!checked.ok) return null;
  return { payload: buildDynamicQris(row.qris_payload, amountIdr), merchantName: checked.merchantName };
}

export async function removeQrisImage(id) {
  await load(id);
  // a QRIS method without its image cannot be used to pay, so it goes hidden with it
  await query("UPDATE platform_payment_methods SET qris_image = NULL, qris_mime = NULL, qris_payload = NULL, is_active = 0 WHERE id = ? AND kind = 'qris'", [id]);
  return toMethod(await load(id));
}

/** The picture of a QRIS method whether or not it is shown, so the superadmin can check it before switching it on. */
export async function adminQris(id) {
  const row = await queryOne("SELECT qris_image, qris_mime FROM platform_payment_methods WHERE id = ? AND kind = 'qris' AND qris_image IS NOT NULL", [id]);
  if (!row) throw notFound("Gambar QRIS belum diunggah.");
  return { buffer: row.qris_image, mime: row.qris_mime };
}

/** The picture of an active QRIS method, for the public pages. */
export async function publicQris(id) {
  const row = await queryOne("SELECT qris_image, qris_mime FROM platform_payment_methods WHERE id = ? AND kind = 'qris' AND is_active = 1 AND qris_image IS NOT NULL", [id]);
  if (!row) throw notFound("QRIS tidak tersedia.");
  return { buffer: row.qris_image, mime: row.qris_mime };
}
