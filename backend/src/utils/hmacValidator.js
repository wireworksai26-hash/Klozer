import crypto from "crypto";
import { safeEqual } from "./crypto.js";

/**
 * Verify an HMAC-SHA256 signature over the exact raw request bytes.
 * Accepts the `sha256=<hex>` form used by Meta as well as a bare hex digest.
 */
export function verifyHmacSignature(rawBody, incomingSignature, secret) {
  if (!rawBody || !incomingSignature || !secret) return false;
  const provided = String(incomingSignature).replace(/^sha256=/i, "").trim().toLowerCase();
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(provided, expected);
}

/** Midtrans notification signature: SHA512(order_id + status_code + gross_amount + serverKey). */
export function verifyMidtransSignature({ order_id, status_code, gross_amount, signature_key }, serverKey) {
  if (!order_id || !status_code || gross_amount === undefined || !signature_key || !serverKey) return false;
  const expected = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest("hex");
  return safeEqual(String(signature_key).toLowerCase(), expected);
}
