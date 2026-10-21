import crypto from "node:crypto";
import { config } from "../config/env.js";
import { audit } from "../services/auditService.js";
import { AppError } from "../utils/errors.js";
import { cancelOrder, claimOrderPayment, confirmOrder, createOrder, listAllOrders, listOrders, listPlans, orderPayInfo } from "../services/billing/subscriptionOrderService.js";
import { listNotifications, receivePayment } from "../services/billing/paymentNotificationService.js";
import { addProof, decodeProofBase64, proofFile } from "../services/billing/billProofs.js";
import { billDetail, paymentSummary } from "../services/billing/billDetail.js";

const idOf = (req) => Number(req.params.id);

/** GET /billing/plans: what this shop can buy, priced for it, and where its plan stands. */
export async function plans(req, res) {
  res.json({ success: true, ...(await listPlans(req.tenantId)) });
}

export async function orders(req, res) {
  res.json({ success: true, data: await listOrders(req.tenantId) });
}

/** POST /billing/orders: choose a plan and period; the bill comes back with the exact amount to pay. */
export async function create(req, res) {
  const order = await createOrder({ institutionId: req.tenantId, userId: req.user.id, ...req.body });
  await audit(req, "billing.order_create", { entityType: "platform_order", entityId: order.id, metadata: { plan: order.plan, period: order.period, amountIdr: order.payAmountIdr } });
  res.status(201).json({ success: true, ...(await orderPayInfo({ id: order.id, institutionId: req.tenantId })) });
}

/** GET /billing/orders/:id: the bill, its current status (the pay screen polls this), and the dynamic QRIS. */
export async function show(req, res) {
  res.json({ success: true, ...(await orderPayInfo({ id: idOf(req), institutionId: req.tenantId })) });
}

export async function paid(req, res) {
  const order = await claimOrderPayment({ id: idOf(req), institutionId: req.tenantId, reference: req.body.reference });
  await audit(req, "billing.order_paid_claim", { entityType: "platform_order", entityId: order.id });
  res.json({ success: true, message: "Terima kasih. Tim Klozer akan mengecek pembayaran Anda.", data: order });
}

export async function cancel(req, res) {
  const order = await cancelOrder({ id: idOf(req), institutionId: req.tenantId, userId: req.user.id });
  await audit(req, "billing.order_cancel", { entityType: "platform_order", entityId: order.id });
  res.json({ success: true, data: order });
}

/** GET /billing/orders/admin (superadmin): the queue across every shop. */
export async function adminList(req, res) {
  res.json({ success: true, ...(await listAllOrders(req.query)) });
}

/** POST /billing/orders/:id/confirm (superadmin): payment checked by hand, apply the plan, features and tokens. */
export async function adminConfirm(req, res) {
  const order = await confirmOrder({ id: idOf(req), userId: req.user.id });
  await audit(req, "billing.order_confirm", { entityType: "platform_order", entityId: order.id, institutionId: order.institutionId, metadata: { plan: order.plan, months: order.months, tokens: order.tokensGranted } });
  res.json({ success: true, message: "Paket diaktifkan.", data: order });
}

export async function adminCancel(req, res) {
  const order = await cancelOrder({ id: idOf(req), userId: req.user.id });
  await audit(req, "billing.order_cancel", { entityType: "platform_order", entityId: order.id, institutionId: order.institutionId });
  res.json({ success: true, data: order });
}

export async function notifications(req, res) {
  res.json({ success: true, data: await listNotifications(req.query), notifyEnabled: Boolean(config.platformPay.notifySecret) });
}

const sameSecret = (given, wanted) => {
  const a = crypto.createHash("sha256").update(String(given ?? "")).digest();
  const b = crypto.createHash("sha256").update(wanted).digest();
  return crypto.timingSafeEqual(a, b);
};

/**
 * POST /payments/platform-notify: a payment notice from outside ("Rp 115.037 received"). Only with the shared secret in the
 * X-Notify-Secret header. The amount is matched to the one open bill waiting for it and that bill is settled.
 */
export async function paymentNotice(req, res) {
  if (!config.platformPay.notifySecret) throw new AppError(503, "Penerimaan notifikasi pembayaran belum diaktifkan.", { code: "NOTIFY_DISABLED" });
  if (!sameSecret(req.get("x-notify-secret"), config.platformPay.notifySecret)) throw new AppError(401, "Rahasia notifikasi salah.", { code: "NOTIFY_FORBIDDEN" });
  const result = await receivePayment({ amountIdr: req.body.amount, reference: req.body.reference ?? null, source: req.body.source ?? null, payer: req.body.payer ?? null });
  if (result.status === "matched") await audit(req, "billing.payment_matched", { entityType: result.matchedType === "topup" ? "token_topup" : "platform_order", entityId: result.matchedId, institutionId: result.institutionId, metadata: { amountIdr: req.body.amount, source: req.body.source } });
  res.status(result.status === "duplicate" ? 200 : 201).json({ success: true, ...result });
}

/** POST /ai/topups/:id/proof and POST /billing/orders/:id/proof: the shop uploads a picture of its transfer proof. */
export const uploadProof = (refType) => async (req, res) => {
  const result = await addProof({ refType, refId: idOf(req), institutionId: req.tenantId, userId: req.user.id, buffer: decodeProofBase64(req.body.fileBase64), fileName: req.body.fileName, note: req.body.note ?? null });
  await audit(req, "billing.proof_upload", { entityType: refType === "topup" ? "token_topup" : "platform_order", entityId: idOf(req), metadata: { proofId: result.id } });
  res.status(201).json({ success: true, message: "Bukti pembayaran terunggah.", proofCount: result.count });
};

/** GET /billing/detail/:type/:id (superadmin): one payment with its shop, proofs, notices, history and signals. */
export async function detail(req, res) {
  res.json({ success: true, data: await billDetail(req.params.type, Number(req.params.id)) });
}

/** GET /billing/summary (superadmin): money received in a period, what waits, what deserves a look. */
export async function summary(req, res) {
  res.json({ success: true, data: await paymentSummary(req.query.days) });
}

/** GET /platform/payment-proofs/:id (superadmin): the picture. */
export async function proofImage(req, res) {
  const { buffer, mime } = await proofFile(Number(req.params.id));
  res.set({ "Content-Type": mime, "Content-Length": buffer.length, "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="bukti"', "Cache-Control": "private, no-store" });
  res.end(buffer);
}
