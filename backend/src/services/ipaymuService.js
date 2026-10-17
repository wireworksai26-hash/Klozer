import crypto from "crypto";
import { query, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError, serviceUnavailable, unauthorized } from "../utils/errors.js";
import { verifyIpaymuSignature } from "../utils/hmacValidator.js";
import { claimIdempotencyKey, markIdempotentFailed, markIdempotentSuccess } from "./idempotencyService.js";
import { afterPaid, markOrderPaid } from "./orderService.js";

const SANDBOX_URL = "https://sandbox.ipaymu.com/api/v2";
const PRODUCTION_URL = "https://my.ipaymu.com/api/v2";
// Estimate shown before the gateway reports the real fee; QRIS fee is charged to the merchant.
const QRIS_MDR = 0.007;
// iPaymu fixes the QRIS lifetime at 5 minutes; `expired` cannot be customised for it.
const QRIS_TTL_MINUTES = 5;
const FALLBACK_BUYER_EMAIL = "no-reply@klozer.id";
const FALLBACK_BUYER_PHONE = "08000000000";

export const isGatewayConfigured = () => Boolean(config.ipaymu.va && config.ipaymu.apiKey);

/** iPaymu timestamp header: YYYYMMDDhhmmss in Jakarta time (UTC+7). */
function ipaymuTimestamp(now = new Date()) {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

/**
 * Signed headers for an iPaymu v2 request:
 *   signature = HMAC-SHA256(`POST:VA:sha256hex(body):APIKEY`, APIKEY)
 * The body string signed here must be exactly the string that is sent.
 */
export function signIpaymuRequest(bodyString, { va, apiKey }, method = "POST") {
  const bodyHash = crypto.createHash("sha256").update(bodyString).digest("hex");
  const stringToSign = `${method}:${va}:${bodyHash}:${apiKey}`;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    va,
    signature: crypto.createHmac("sha256", apiKey).update(stringToSign).digest("hex"),
    timestamp: ipaymuTimestamp(),
  };
}

/**
 * Create a dynamic QRIS charge (iPaymu "direct payment", method qris / channel mpm) for an existing order.
 * `order.total_amount` is the only amount ever charged. In production a missing
 * key is an error; the simulator is for development only and a real gateway
 * failure is surfaced instead of silently falling back to it.
 */
export async function createQrisCharge({ institutionId, order, customerName, customerPhone, customerEmail }) {
  const amount = Math.round(Number(order.total_amount));
  const paymentRef = `KLZ-${institutionId}-${order.id}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  let feeAmount = Math.round(amount * QRIS_MDR);
  const expiresAt = new Date(Date.now() + QRIS_TTL_MINUTES * 60 * 1000);

  let qrString;
  let qrImageUrl;
  let transactionId = null;
  let mode;

  if (isGatewayConfigured()) {
    mode = config.ipaymu.isProduction ? "ipaymu_production" : "ipaymu_sandbox";
    const baseUrl = config.ipaymu.isProduction ? PRODUCTION_URL : SANDBOX_URL;
    const body = JSON.stringify({
      name: customerName || "Pelanggan",
      phone: customerPhone || FALLBACK_BUYER_PHONE,
      email: customerEmail || FALLBACK_BUYER_EMAIL,
      amount,
      notifyUrl: `${config.appUrl}/api/v1/payments/webhook`,
      referenceId: paymentRef,
      paymentMethod: "qris",
      paymentChannel: "mpm",
      feeDirection: "MERCHANT",
      comments: `Pesanan ${order.order_number || order.id}`,
    });

    let data;
    try {
      const response = await fetch(`${baseUrl}/payment/direct`, {
        method: "POST",
        headers: signIpaymuRequest(body, config.ipaymu),
        body,
        signal: AbortSignal.timeout(15000),
      });
      data = await response.json();
    } catch (err) {
      logger.error({ err: err.message, paymentRef }, "iPaymu charge request failed");
      throw new AppError(502, "Gateway pembayaran tidak dapat dihubungi. Coba lagi sebentar.", { code: "GATEWAY_UNREACHABLE" });
    }

    const result = data?.Data || {};
    // For QRIS the QR payload comes back in QrString (or PaymentNo, depending on the API version).
    qrString = result.QrString || result.PaymentNo || null;
    if (Number(data?.Status) !== 200 || data?.Success === false || !qrString) {
      logger.error({ status: data?.Status, message: data?.Message, paymentRef }, "iPaymu rejected charge");
      throw new AppError(502, `Gateway menolak pembuatan QRIS: ${data?.Message || "kesalahan tidak diketahui"}`, { code: "GATEWAY_REJECTED" });
    }

    qrImageUrl = result.QrImage || result.QrTemplate || null;
    transactionId = result.TransactionId !== undefined && result.TransactionId !== null ? String(result.TransactionId) : null;
    const reportedFee = Number(result.Fee);
    if (Number.isFinite(reportedFee) && reportedFee >= 0) feeAmount = Math.round(reportedFee);
  } else if (!config.isProduction) {
    mode = "sandbox_simulator";
    qrString = `SIMULATED-QRIS|${paymentRef}|${amount}`;
    qrImageUrl = null;
  } else {
    throw serviceUnavailable("Payment gateway belum dikonfigurasi di server.", { code: "GATEWAY_NOT_CONFIGURED" });
  }

  await transaction(async (tx) => {
    // Only the newest QR for an order stays payable.
    await tx.query("UPDATE payments SET status = 'expired' WHERE order_id = ? AND status = 'pending'", [order.id]);
    await tx.query(
      `INSERT INTO payments
         (institution_id, order_id, payment_reference, provider_transaction_id, provider, payment_type, amount, fee_amount,
          qr_string, qr_image_url, status, expires_at)
       VALUES (?, ?, ?, ?, 'ipaymu', 'qris', ?, ?, ?, ?, 'pending', ?)`,
      [institutionId, order.id, paymentRef, transactionId, amount, feeAmount, qrString, qrImageUrl, expiresAt]
    );
  });

  return {
    success: true,
    mode,
    paymentReference: paymentRef,
    transactionId,
    qrString,
    qrImageUrl,
    amount,
    feeAmount,
    expiresAt: expiresAt.toISOString(),
    ...(mode === "sandbox_simulator" ? { simulatorNotice: "Mode simulator (non-production). Gunakan endpoint simulate-settlement untuk melunasi." } : {}),
  };
}

/**
 * Mark a payment (and its order) as paid. Safe to call repeatedly and
 * concurrently: the payment row is locked and an already-paid payment is a no-op.
 */
export async function settlePayment(paymentReference, { providerTransactionId = null } = {}) {
  const outcome = await transaction(async (tx) => {
    const payment = await tx.queryOne("SELECT * FROM payments WHERE payment_reference = ? FOR UPDATE", [paymentReference]);
    if (!payment) return { found: false };
    if (payment.status === "paid") return { found: true, changed: false, payment };

    await tx.query(
      "UPDATE payments SET status = 'paid', paid_at = UTC_TIMESTAMP(), provider_transaction_id = COALESCE(?, provider_transaction_id) WHERE id = ?",
      [providerTransactionId, payment.id]
    );
    const paid = await markOrderPaid(tx, payment.order_id, payment.institution_id);
    if (!paid.changed) {
      logger.warn(
        { paymentReference, orderId: payment.order_id, orderStatus: paid.order.status },
        "Payment received for an order that was not waiting for payment; needs manual review/refund"
      );
    }
    return { found: true, changed: true, payment, paid };
  });

  if (outcome.paid?.changed) afterPaid(outcome.paid);
  return outcome;
}

/** The callback is accepted if any of its amount fields equals the amount we charged. */
function callbackAmountMatches(payload, expected) {
  return ["amount", "sub_total", "total"].some((field) => {
    const value = Number(payload[field]);
    return Number.isFinite(value) && Math.abs(value - Number(expected)) <= 0.5;
  });
}

/**
 * Process an iPaymu callback (notifyUrl).
 * Order of checks matters: authenticate the sender first, then de-duplicate,
 * then validate the amount, and only then change any state.
 */
export async function handleIpaymuNotification(payload, signature) {
  if (!isGatewayConfigured()) throw serviceUnavailable("Payment gateway belum dikonfigurasi.");
  if (!verifyIpaymuSignature(payload, signature, config.ipaymu.va)) {
    logger.warn({ hasSignature: Boolean(signature), fields: Object.keys(payload || {}).length }, "iPaymu callback signature rejected");
    throw unauthorized("Signature notifikasi tidak valid.");
  }

  const paymentRef = payload.reference_id ?? payload.referenceId;
  const statusCode = Number(payload.status_code);
  const statusText = String(payload.status ?? "").toLowerCase();
  const transactionId = payload.trx_id !== undefined && payload.trx_id !== null ? String(payload.trx_id) : null;
  if (!paymentRef) return { success: true, ignored: true, reason: "missing_reference" };

  const key = `IPAYMU:${paymentRef}:${payload.status_code}:${payload.transaction_status_code ?? ""}`;
  const claim = await claimIdempotencyKey({ key, provider: "ipaymu", eventType: `payment.${statusText || statusCode}`, payload });
  if (!claim.claimed) return { success: true, duplicateIgnored: true };

  try {
    const [payment] = await query("SELECT * FROM payments WHERE payment_reference = ?", [paymentRef]);
    if (!payment) {
      logger.warn({ paymentRef }, "iPaymu callback for unknown payment reference");
      await markIdempotentSuccess(key, { ignored: "unknown_reference" });
      return { success: true, ignored: true };
    }

    if (!callbackAmountMatches(payload, payment.amount)) {
      logger.error({ paymentRef, expected: payment.amount, received: payload.amount }, "iPaymu amount mismatch");
      await markIdempotentFailed(key, "amount_mismatch");
      return { success: true, ignored: true, reason: "amount_mismatch" };
    }

    let result;
    if (statusCode === 1 || statusText === "berhasil") {
      const outcome = await settlePayment(paymentRef, { providerTransactionId: transactionId });
      result = { status: "paid", changed: Boolean(outcome.changed) };
    } else if (statusCode === -2 || statusText === "expired") {
      await query("UPDATE payments SET status = 'expired' WHERE id = ? AND status = 'pending'", [payment.id]);
      result = { status: "expired" };
    } else if (statusCode < 0) {
      await query("UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'pending'", [payment.id]);
      result = { status: "failed" };
    } else {
      result = { status: "pending" };
    }

    await markIdempotentSuccess(key, result);
    return { success: true, paymentReference: paymentRef, ...result };
  } catch (err) {
    await markIdempotentFailed(key, err.message);
    throw err;
  }
}
