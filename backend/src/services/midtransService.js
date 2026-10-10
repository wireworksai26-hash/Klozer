import crypto from "crypto";
import { query, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError, serviceUnavailable, unauthorized } from "../utils/errors.js";
import { verifyMidtransSignature } from "../utils/hmacValidator.js";
import { claimIdempotencyKey, markIdempotentFailed, markIdempotentSuccess } from "./idempotencyService.js";
import { afterPaid, markOrderPaid } from "./orderService.js";

const SANDBOX_URL = "https://api.sandbox.midtrans.com/v2";
const PRODUCTION_URL = "https://api.midtrans.com/v2";
const QRIS_MDR = 0.007;
const QRIS_TTL_MINUTES = 15;

export const isGatewayConfigured = () => Boolean(config.midtrans.serverKey);

/**
 * Create a dynamic QRIS charge for an existing order.
 * `order.total_amount` is the only amount ever charged. In production a missing
 * server key is an error; the sandbox simulator is for development only and a
 * real gateway failure is surfaced instead of silently falling back to it.
 */
export async function createQrisCharge({ institutionId, order, customerName, customerPhone }) {
  const amount = Math.round(Number(order.total_amount));
  const paymentRef = `KLZ-${institutionId}-${order.id}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const feeAmount = Math.round(amount * QRIS_MDR);
  const expiresAt = new Date(Date.now() + QRIS_TTL_MINUTES * 60 * 1000);

  let qrString;
  let qrImageUrl;
  let transactionId = null;
  let mode;

  if (isGatewayConfigured()) {
    mode = config.midtrans.isProduction ? "midtrans_production" : "midtrans_sandbox";
    const baseUrl = config.midtrans.isProduction ? PRODUCTION_URL : SANDBOX_URL;
    let data;
    try {
      const response = await fetch(`${baseUrl}/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Basic " + Buffer.from(`${config.midtrans.serverKey}:`).toString("base64"),
        },
        body: JSON.stringify({
          payment_type: "qris",
          transaction_details: { order_id: paymentRef, gross_amount: amount },
          customer_details: { first_name: customerName || "Pelanggan", phone: customerPhone || undefined },
          qris: { acquirer: "gopay" },
          custom_expiry: { expiry_duration: QRIS_TTL_MINUTES, unit: "minute" },
        }),
        signal: AbortSignal.timeout(15000),
      });
      data = await response.json();
    } catch (err) {
      logger.error({ err: err.message, paymentRef }, "Midtrans charge request failed");
      throw new AppError(502, "Gateway pembayaran tidak dapat dihubungi. Coba lagi sebentar.", { code: "GATEWAY_UNREACHABLE" });
    }

    if (String(data.status_code) !== "201") {
      logger.error({ status: data.status_code, message: data.status_message, paymentRef }, "Midtrans rejected charge");
      throw new AppError(502, `Gateway menolak pembuatan QRIS: ${data.status_message || "kesalahan tidak diketahui"}`, { code: "GATEWAY_REJECTED" });
    }

    const qrAction = (data.actions || []).find((a) => a.name === "generate-qr-code");
    qrString = data.qr_string || null;
    qrImageUrl = qrAction?.url || null;
    transactionId = data.transaction_id || null;
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
       VALUES (?, ?, ?, ?, 'midtrans', 'qris', ?, ?, ?, ?, 'pending', ?)`,
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

/**
 * Process a Midtrans HTTP notification.
 * Order of checks matters: authenticate the sender first, then de-duplicate,
 * then validate the amount, and only then change any state.
 */
export async function handleMidtransNotification(payload) {
  if (!isGatewayConfigured()) throw serviceUnavailable("Payment gateway belum dikonfigurasi.");
  if (!verifyMidtransSignature(payload, config.midtrans.serverKey)) {
    throw unauthorized("Signature notifikasi tidak valid.");
  }

  const { order_id: paymentRef, transaction_status: txStatus, transaction_id: transactionId, status_code: statusCode, fraud_status: fraudStatus } = payload;
  const key = `MIDTRANS:${paymentRef}:${txStatus}:${statusCode}`;

  const claim = await claimIdempotencyKey({ key, provider: "midtrans", eventType: `payment.${txStatus}`, payload });
  if (!claim.claimed) return { success: true, duplicateIgnored: true };

  try {
    const [payment] = await query("SELECT * FROM payments WHERE payment_reference = ?", [paymentRef]);
    if (!payment) {
      logger.warn({ paymentRef }, "Midtrans notification for unknown payment reference");
      await markIdempotentSuccess(key, { ignored: "unknown_reference" });
      return { success: true, ignored: true };
    }

    if (Math.abs(Number(payload.gross_amount) - Number(payment.amount)) > 0.5) {
      logger.error({ paymentRef, expected: payment.amount, received: payload.gross_amount }, "Midtrans amount mismatch");
      await markIdempotentFailed(key, "amount_mismatch");
      return { success: true, ignored: true, reason: "amount_mismatch" };
    }

    let result;
    const isPaid = txStatus === "settlement" || (txStatus === "capture" && (!fraudStatus || fraudStatus === "accept"));
    if (isPaid) {
      const outcome = await settlePayment(paymentRef, { providerTransactionId: transactionId });
      result = { status: "paid", changed: Boolean(outcome.changed) };
    } else if (txStatus === "expire" || txStatus === "cancel") {
      await query("UPDATE payments SET status = 'expired' WHERE id = ? AND status = 'pending'", [payment.id]);
      result = { status: "expired" };
    } else if (txStatus === "deny" || txStatus === "failure") {
      await query("UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'pending'", [payment.id]);
      result = { status: "failed" };
    } else {
      result = { status: txStatus || "pending" };
    }

    await markIdempotentSuccess(key, result);
    return { success: true, paymentReference: paymentRef, ...result };
  } catch (err) {
    await markIdempotentFailed(key, err.message);
    throw err;
  }
}
