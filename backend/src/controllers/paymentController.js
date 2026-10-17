import { queryOne } from "../config/db.js";
import { config } from "../config/env.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { createQrisCharge, handleIpaymuNotification, settlePayment } from "../services/ipaymuService.js";
import { audit } from "../services/auditService.js";

/** POST /payments/qris — the charged amount is always the order's stored total. */
export async function createQrisPayment(req, res) {
  const ref = req.body.order_id;
  const order = await queryOne(
    "SELECT * FROM orders WHERE institution_id = ? AND (id = ? OR order_number = ?) LIMIT 1",
    [req.tenantId, Number.isInteger(ref) ? ref : 0, String(ref)]
  );
  if (!order) throw notFound("Pesanan tidak ditemukan.");
  if (order.status !== "waiting_payment") {
    throw conflict(`Pesanan berstatus '${order.status}' dan tidak menunggu pembayaran.`);
  }
  if (Number(order.total_amount) < 1500) throw badRequest("Nominal pesanan terlalu kecil untuk pembayaran QRIS.");

  const lead = await queryOne("SELECT name, phone_number FROM leads WHERE id = ?", [order.lead_id]);
  const charge = await createQrisCharge({
    institutionId: req.tenantId,
    order,
    customerName: lead?.name,
    customerPhone: lead?.phone_number,
  });

  await audit(req, "payment.qris_created", { entityType: "order", entityId: order.id, metadata: { reference: charge.paymentReference, amount: charge.amount } });
  res.status(201).json(charge);
}

/**
 * POST /payments/webhook — iPaymu callback (public, authenticated by the X-Signature header).
 * Responds 200 once the notification is verified, so iPaymu does not retry
 * events we have deliberately ignored.
 */
export async function paymentWebhookHandler(req, res) {
  const result = await handleIpaymuNotification(req.body || {}, req.get("x-signature"));
  res.json(result);
}

/** POST /payments/simulate-settlement — development only; never exposed in production. */
export async function simulateSettlement(req, res) {
  if (config.isProduction) throw notFound();
  const payment = await queryOne("SELECT payment_reference FROM payments WHERE payment_reference = ? AND institution_id = ?", [
    req.body.payment_reference,
    req.tenantId,
  ]);
  if (!payment) throw notFound("Referensi pembayaran tidak ditemukan.");
  const outcome = await settlePayment(payment.payment_reference);
  res.json({ success: true, changed: Boolean(outcome.changed) });
}
