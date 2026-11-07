import crypto from "crypto";
import QRCode from "qrcode";
import { query, queryOne } from "../config/db.js";
import { config } from "../config/env.js";
import { notFound } from "../utils/errors.js";
import { validateUploadedBuffer } from "../utils/fileValidator.js";
import { buildDynamicQris, inspectQris } from "../utils/qris.js";
import { decodeQrFromImage } from "../utils/qrisDecode.js";
import { MAX_QRIS_IMAGE_BYTES, QRIS_IMAGE_MIMES } from "./platformPaymentService.js";

/**
 * A tenant's own static QRIS merchant (GoPay Merchant and the like). The picture is stored on the bank_accounts row
 * that the owner added, and is served from a public URL so it can be shown in the dashboard and sent to a customer.
 * A row with a picture is a QRIS destination; it is never listed as a bank transfer.
 */

const BASE_URL = config.appUrl.replace(/\/+$/, "");
export const tenantQrisUrl = (id) => `${BASE_URL}/api/v1/public/bank-accounts/${id}/qris`;

const COLUMNS = "id, bank_code, account_number, account_holder, qris_mime, qris_image IS NOT NULL AS has_qris, qris_payload IS NOT NULL AS qris_readable";

const toAccount = (row) =>
  row ? { ...row, has_qris: Boolean(row.has_qris), qris_readable: Boolean(row.qris_readable), qrisUrl: row.has_qris ? tenantQrisUrl(row.id) : null } : row;

async function loadAccount(institutionId, id) {
  const row = await queryOne(`SELECT ${COLUMNS} FROM bank_accounts WHERE id = ? AND institution_id = ?`, [id, institutionId]);
  if (!row) throw notFound("Rekening tidak ditemukan.");
  return row;
}

/** Store the picture after checking its bytes. The merchant code inside it is read when possible, but not required. */
export async function setQrisImage({ institutionId, id, buffer, fileName }) {
  await loadAccount(institutionId, id);
  const checked = validateUploadedBuffer({
    buffer,
    declaredFileName: fileName,
    allowedMimes: QRIS_IMAGE_MIMES,
    maxSizeBytes: MAX_QRIS_IMAGE_BYTES,
  });
  const text = checked.mimeType === "image/webp" ? null : decodeQrFromImage(buffer, checked.mimeType);
  const read = text
    ? inspectQris(text)
    : {
        ok: false,
        reason:
          checked.mimeType === "image/webp"
            ? "Gambar WebP tidak bisa dibaca otomatis. Unggah PNG atau JPG agar kode QRIS bisa diperiksa."
            : "Kode QR tidak terbaca dari gambar ini. Pastikan gambar QRIS jelas dan tidak terpotong.",
      };
  await query(
    "UPDATE bank_accounts SET qris_image = ?, qris_mime = ?, qris_payload = ? WHERE id = ? AND institution_id = ?",
    [buffer, checked.mimeType, read.ok ? text.trim() : null, id, institutionId]
  );
  const account = toAccount(await loadAccount(institutionId, id));
  return { ...account, qrisRead: read.ok ? { ok: true, merchantName: read.merchantName } : { ok: false, reason: read.reason } };
}

export async function removeQrisImage({ institutionId, id }) {
  await loadAccount(institutionId, id);
  await query(
    "UPDATE bank_accounts SET qris_image = NULL, qris_mime = NULL, qris_payload = NULL WHERE id = ? AND institution_id = ?",
    [id, institutionId]
  );
  return toAccount(await loadAccount(institutionId, id));
}

/** The picture for the dashboard. Works while the account is active or not. */
export async function getQrisImage({ institutionId, id }) {
  const row = await queryOne(
    "SELECT qris_image, qris_mime FROM bank_accounts WHERE id = ? AND institution_id = ? AND qris_image IS NOT NULL",
    [id, institutionId]
  );
  if (!row) throw notFound("Gambar QRIS belum diunggah.");
  return { buffer: row.qris_image, mime: row.qris_mime || "image/png" };
}

/** The public picture a customer scans. The account must still exist; check is_active before offering it in chat. */
export async function getPublicQrisImage(id) {
  const row = await queryOne("SELECT qris_image, qris_mime FROM bank_accounts WHERE id = ? AND qris_image IS NOT NULL", [id]);
  if (!row) throw notFound("QRIS tidak tersedia.");
  return { buffer: row.qris_image, mime: row.qris_mime || "image/png" };
}

export async function hasActiveQris(institutionId) {
  const row = await queryOne(
    "SELECT id FROM bank_accounts WHERE institution_id = ? AND is_active = 1 AND qris_image IS NOT NULL LIMIT 1",
    [institutionId]
  );
  return Boolean(row);
}

/** The QRIS merchant a customer should pay, with the bytes ready to send to a chat. */
export async function findActiveQris(institutionId) {
  const row = await queryOne(
    "SELECT id, bank_code, account_number, account_holder, qris_image, qris_mime FROM bank_accounts WHERE institution_id = ? AND is_active = 1 AND qris_image IS NOT NULL ORDER BY id ASC LIMIT 1",
    [institutionId]
  );
  if (!row) return null;
  return {
    id: row.id,
    bankCode: row.bank_code,
    merchantName: row.account_holder,
    merchantId: row.account_number,
    buffer: row.qris_image,
    mimeType: row.qris_mime || "image/png",
    imageUrl: tenantQrisUrl(row.id),
  };
}

// ---------------------------------------------------------------- dynamic QRIS for one order

const orderSig = (orderId) => crypto.createHmac("sha256", config.jwt.secret).update(`order-qris:${orderId}`).digest("base64url").slice(0, 22);

/** The picture of an order's QRIS. The link carries a signature, so only someone who was given it can open it. */
export const orderQrisUrl = (orderId) => `${BASE_URL}/api/v1/public/orders/${orderId}/qris.png?sig=${orderSig(orderId)}`;

export function validOrderQrisSig(orderId, sig) {
  const expected = Buffer.from(orderSig(orderId));
  const given = Buffer.from(String(sig ?? ""));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** The shop's active QRIS merchant whose code Klozer could read (only such a code can be made dynamic). */
async function activeReadableQris(institutionId) {
  return queryOne(
    "SELECT id, account_holder, qris_payload FROM bank_accounts WHERE institution_id = ? AND is_active = 1 AND qris_image IS NOT NULL AND qris_payload IS NOT NULL ORDER BY id ASC LIMIT 1",
    [institutionId]
  );
}

export async function hasActiveOwnQris(institutionId) {
  return Boolean(await activeReadableQris(institutionId));
}

/**
 * The dynamic QRIS for an order: the merchant's own code with the order total inside it, so the customer's app shows the
 * amount already filled in. Null when the shop has no readable QRIS (the caller then uses another way to pay).
 * Paying it reaches the merchant's account directly; Klozer is not told, so a person confirms the payment.
 * @returns {Promise<{ payload: string, amount: number, merchantName: string, accountId: number, imageUrl: string } | null>}
 */
export async function dynamicQrisFor({ institutionId, order }) {
  const merchant = await activeReadableQris(institutionId);
  if (!merchant) return null;
  const amount = Math.round(Number(order.total_amount));
  if (!Number.isInteger(amount) || amount < 1) return null;
  let payload;
  try {
    payload = buildDynamicQris(merchant.qris_payload, amount);
  } catch {
    return null;
  }
  return { payload, amount, merchantName: merchant.account_holder, accountId: merchant.id, imageUrl: orderQrisUrl(order.id) };
}

/** The PNG a customer scans. Only while the order still waits for payment, so a paid or cancelled order shows nothing. */
export async function renderOrderQrisPng({ orderId, sig }) {
  if (!validOrderQrisSig(orderId, sig)) throw notFound("QRIS tidak tersedia.");
  const order = await queryOne("SELECT id, institution_id, total_amount, status FROM orders WHERE id = ?", [orderId]);
  if (!order || order.status !== "waiting_payment") throw notFound("QRIS tidak tersedia.");
  const dynamic = await dynamicQrisFor({ institutionId: order.institution_id, order });
  if (!dynamic) throw notFound("QRIS tidak tersedia.");
  return QRCode.toBuffer(dynamic.payload, { type: "png", errorCorrectionLevel: "M", margin: 4, scale: 8 });
}
