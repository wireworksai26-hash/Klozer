import crypto from "crypto";
import { safeEqual } from "../../utils/crypto.js";

/**
 * Signing of outgoing webhooks. The receiver can prove a request came from us and was not altered or replayed:
 *   X-Klozer-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the endpoint's secret>
 * The timestamp is inside the signed text, so an old request cannot be replayed with a fresh timestamp.
 */

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function signPayload(secret, rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return { header: `t=${timestamp},v1=${v1}`, timestamp, signature: v1 };
}

/**
 * What a receiver does (also used in tests and shown in the documentation).
 * @returns {boolean}
 */
export function verifySignature(secret, rawBody, header, { toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS, now = Date.now() } = {}) {
  const parts = Object.fromEntries(String(header || "").split(",").map((p) => p.trim().split("=")).filter((p) => p.length === 2));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !parts.v1) return false;
  if (Math.abs(now / 1000 - t) > toleranceSeconds) return false;
  return safeEqual(parts.v1, signPayload(secret, rawBody, t).signature);
}

/** A new secret for an endpoint, shown to the owner once. */
export const generateWebhookSecret = () => `whsec_${crypto.randomBytes(24).toString("hex")}`;
