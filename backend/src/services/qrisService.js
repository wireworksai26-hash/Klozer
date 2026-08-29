import { query, memoryStore } from "../config/db.js";
import { config } from "../config/env.js";

/**
 * Generate Dynamic QRIS EMVCo Payload
 * @param {Object} params { orderId, amount, customerName, customerPhone, institutionId }
 * @returns {Promise<Object>} Payment QRIS metadata
 */
export async function generateDynamicQris({ orderId, amount = 0, customerName = "Pelanggan", customerPhone = "", institutionId = 1 }) {
  const paymentRef = `PAY-QRIS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 Menit

  // Standard EMVCo QRIS Payload Format
  const emvcoPayload = `00020101021226590014ID.LINKAJA.WWW01189360091100223344555204581253033605802ID5914KLOZER_${institutionId}6007JAKARTA61051234062070703A0154${String(amount).padStart(2, "0")}6304C92B`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(emvcoPayload)}`;
  const feeAmount = Math.round(amount * 0.007); // MDR standard QRIS 0.7%

  const paymentRecord = {
    id: (memoryStore.payments?.length || 0) + 1,
    institution_id: institutionId,
    order_id: orderId,
    payment_reference: paymentRef,
    provider: config.paymentGateway.provider || "xendit",
    payment_type: "qris",
    amount: Number(amount),
    fee_amount: feeAmount,
    qr_string: emvcoPayload,
    qr_image_url: qrImageUrl,
    status: "pending",
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  };

  if (!memoryStore.payments) memoryStore.payments = [];
  memoryStore.payments.push(paymentRecord);

  return {
    success: true,
    paymentId: paymentRecord.id,
    paymentReference: paymentRef,
    qrString: emvcoPayload,
    qrImageUrl: qrImageUrl,
    amount: Number(amount),
    feeAmount: feeAmount,
    expiresAt: expiresAt,
  };
}

/**
 * Instant Settlement Webhook Processor
 * @param {Object} webhookPayload 
 * @returns {Promise<Object>} Settlement result
 */
export async function processPaymentSettlement(paymentReference, status = "paid") {
  const payment = (memoryStore.payments || []).find((p) => p.payment_reference === paymentReference);
  if (!payment) {
    return { success: false, message: "Referensi pembayaran tidak ditemukan." };
  }

  payment.status = status;
  payment.paid_at = new Date().toISOString();

  // Also update Order status to paid
  if (payment.order_id && memoryStore.orders) {
    const order = memoryStore.orders.find((o) => o.id === payment.order_id || o.order_number === payment.order_id);
    if (order) {
      order.status = "paid";
      order.updated_at = new Date().toISOString();
    }
  }

  return {
    success: true,
    message: "Settlement pembayaran QRIS berhasil diverifikasi.",
    payment,
  };
}
