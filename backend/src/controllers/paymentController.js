import { createMidtransQrisCharge, handleMidtransWebhook } from "../services/midtransService.js";

/**
 * Generate Dynamic QRIS Payment via Midtrans Sandbox / Production
 * POST /api/v1/payments/qris
 */
export async function createQrisPayment(req, res, next) {
  try {
    const institutionId = req.tenantId || req.institutionId || 1;
    const { order_id, amount, customer_name, customer_phone } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ success: false, message: "Order ID dan nominal pembayaran wajib diisi." });
    }

    const qrisResult = await createMidtransQrisCharge({
      orderId: order_id,
      amount: Number(amount),
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
 * Webhook Payment Settlement (Midtrans / Sandbox Notification) with Idempotency
 * POST /api/v1/payments/webhook
 */
export async function paymentWebhookHandler(req, res, next) {
  try {
    const payload = req.body;
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: "Payload webhook tidak boleh kosong." });
    }

    const result = await handleMidtransWebhook(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
