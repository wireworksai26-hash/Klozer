import crypto from "crypto";

/**
 * Validate incoming HMAC-SHA256 Webhook Signature
 * @param {string|Buffer} rawBody 
 * @param {string} incomingSignature 
 * @param {string} secret 
 * @returns {boolean}
 */
export function verifyHmacSignature(rawBody, incomingSignature, secret) {
  if (!rawBody || !incomingSignature || !secret) return false;
  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody))
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(incomingSignature, "utf8"),
      Buffer.from(computedSignature, "utf8")
    );
  } catch (err) {
    console.error("[HMAC Verify Error]", err.message);
    return false;
  }
}
