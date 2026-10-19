import { transaction } from "../config/db.js";
import { emitToTenant } from "../realtime.js";
import { releaseOrderResources } from "./orderService.js";
import { notifyOrderCancelled } from "./orderNotifications.js";

/**
 * The system (not a person) cancels an order nobody paid for: stock goes back, the payment link stops being payable,
 * pending reminders stop, and the customer is told when the platform allows it.
 * @returns {Promise<boolean>} false when the order was no longer waiting for payment
 */
export async function cancelOrderSystem(institutionId, orderId, reason) {
  const order = await transaction(async (tx) => {
    const row = await tx.queryOne("SELECT * FROM orders WHERE id = ? AND institution_id = ? FOR UPDATE", [orderId, institutionId]);
    if (!row || row.status !== "waiting_payment") return null;
    await releaseOrderResources(tx, row);
    await tx.query("UPDATE payments SET status = 'expired' WHERE order_id = ? AND status = 'pending'", [row.id]);
    await tx.query("UPDATE orders SET status = 'cancelled', rejection_reason = ? WHERE id = ?", [reason.slice(0, 250), row.id]);
    return row;
  });
  if (!order) return false;
  emitToTenant(institutionId, "order:updated", { orderId, status: "cancelled" });
  notifyOrderCancelled(order, `Pesanan ${order.order_number} kami batalkan karena belum dibayar sampai batas waktu, dan stoknya sudah kami lepas. Kalau masih mau, chat aku lagi ya kak 🙏`).catch(() => {});
  return true;
}
