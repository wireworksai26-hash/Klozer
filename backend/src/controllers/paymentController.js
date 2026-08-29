import { generateDynamicQris, processPaymentSettlement } from "../services/qrisService.js";
import { memoryStore } from "../config/db.js";

/**
 * Generate Dynamic QRIS Payment
 * POST /api/v1/payments/qris
 */
export async function createQrisPayment(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const { order_id, amount, customer_name, customer_phone } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ success: false, message: "Order ID dan nominal wajib diisi." });
    }

    const qrisResult = await generateDynamicQris({
      orderId: order_id,
      amount,
      customerName: customer_name,
      customerPhone: customer_phone,
      institutionId,
    });

    res.status(201).json(qrisResult);
  } catch (err) {
    next(err);
  }
}

/**
 * Webhook Payment Settlement (Xendit / Midtrans)
 * POST /api/v1/payments/webhook
 */
export async function paymentWebhookHandler(req, res, next) {
  try {
    const { payment_reference, status = "paid" } = req.body;
    if (!payment_reference) {
      return res.status(400).json({ success: false, message: "payment_reference diperlukan." });
    }

    const result = await processPaymentSettlement(payment_reference, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
