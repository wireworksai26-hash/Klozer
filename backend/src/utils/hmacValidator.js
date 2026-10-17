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

const INTEGER_FIELDS = ["trx_id", "status_code", "transaction_status_code", "paid_off"];

function normalizeIpaymuCallback(body) {
  const out = { ...body };
  for (const key of INTEGER_FIELDS) {
    if (out[key] !== undefined && out[key] !== null && out[key] !== "" && Number.isFinite(Number(out[key]))) out[key] = Number(out[key]);
  }
  if (out.is_escrow !== undefined) out.is_escrow = out.is_escrow === true || String(out.is_escrow).toLowerCase() === "true";
  if (out.additional_info === undefined || out.additional_info === null || out.additional_info === "") out.additional_info = [];
  return out;
}

/**
 * iPaymu callback signature (X-Signature): HMAC-SHA256 over the JSON of the callback
 * (integer fields normalised, keys sorted A-Z), keyed with the merchant VA number.
 * iPaymu's page leaves two details open (plain vs. locale key ordering, and whether
 * "/" is escaped as a backslash plus "/"), so every combination is tried; each one still requires
 * the VA secret, so accepting any of them does not weaken the check.
 */
export function verifyIpaymuSignature(body, incomingSignature, va) {
  if (!body || typeof body !== "object" || !incomingSignature || !va) return false;
  const provided = String(incomingSignature).trim().toLowerCase();
  const normalized = normalizeIpaymuCallback(body);
  const sorters = [(a, b) => (a < b ? -1 : a > b ? 1 : 0), (a, b) => a.localeCompare(b)];

  const candidates = new Set();
  for (const sorter of sorters) {
    const sorted = Object.fromEntries(Object.keys(normalized).sort(sorter).map((k) => [k, normalized[k]]));
    const json = JSON.stringify(sorted);
    candidates.add(json);
    candidates.add(json.replaceAll("/", "\\/"));
  }
  for (const json of candidates) {
    const expected = crypto.createHmac("sha256", va).update(json).digest("hex");
    if (safeEqual(provided, expected)) return true;
  }
  return false;
}
