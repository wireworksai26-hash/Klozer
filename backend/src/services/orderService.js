import { conflict, notFound } from "../utils/errors.js";
import { recordCsCommission } from "./commissionService.js";
import { sendPurchaseEvent } from "./metaCapiService.js";
import { notifyOrderPaid } from "./orderNotifications.js";

/**
 * Move a waiting_payment order to paid inside the caller's transaction.
 * Locks the order row, so concurrent webhook + manual confirmation cannot
 * both pay it (and cannot both create a commission).
 * Returns `{ order, changed }`; call `afterPaid` once the transaction commits.
 */
export async function markOrderPaid(tx, orderId, institutionId) {
  const order = await tx.queryOne("SELECT * FROM orders WHERE id = ? AND institution_id = ? FOR UPDATE", [orderId, institutionId]);
  if (!order) throw notFound("Pesanan tidak ditemukan.");
  if (order.status !== "waiting_payment") return { order, changed: false };

  await tx.query("UPDATE orders SET status = 'paid' WHERE id = ?", [order.id]);
  await tx.query("UPDATE proactive_followup_jobs SET status = 'cancelled_by_payment' WHERE order_id = ? AND status = 'pending'", [order.id]);
  await recordCsCommission(tx, {
    institutionId,
    csUserId: order.cs_user_id,
    orderId: order.id,
    orderTotal: order.total_amount,
  });
  return { order: { ...order, status: "paid" }, changed: true };
}

/**
 * Fire-and-forget side effects that must only run after the payment transaction committed.
 * `notify: false` when the customer has already been answered by the flow that confirmed the payment (a proof they sent).
 */
export function afterPaid({ order }, { notify = true } = {}) {
  sendPurchaseEvent({ institutionId: order.institution_id, orderId: order.id });
  if (notify) notifyOrderPaid(order).catch(() => {});
}

/** Return reserved stock to inventory and drop an unsettled commission when an order is cancelled. */
export async function releaseOrderResources(tx, order) {
  const items = await tx.query("SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL", [order.id]);
  for (const item of items) {
    await tx.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND institution_id = ?", [
      item.quantity,
      item.product_id,
      order.institution_id,
    ]);
  }
  await tx.query("DELETE FROM cs_commission_ledgers WHERE order_id = ? AND is_settled = 0", [order.id]);
  await tx.query("UPDATE proactive_followup_jobs SET status = 'cancelled' WHERE order_id = ? AND status = 'pending'", [order.id]);
}

export function assertTransition(from, to, transitions) {
  if (!(transitions[from] || []).includes(to)) {
    throw conflict(`Status pesanan tidak dapat diubah dari '${from}' ke '${to}'.`);
  }
}
