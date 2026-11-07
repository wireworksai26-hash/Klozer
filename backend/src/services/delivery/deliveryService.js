import { query, queryOne, transaction } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { badRequest, conflict, forbidden, notFound } from "../../utils/errors.js";
import { normalizePhone } from "../../utils/helpers.js";
import { ORDER_TRANSITIONS } from "../../utils/constants.js";
import { emitToTenant, emitToUser } from "../../realtime.js";
import { sendText } from "../channels/channelService.js";
import { assertTransition } from "../orderService.js";
import { announceOrder } from "../stockEvents.js";
import { ACTIVE_STATUSES, assignmentMessage, canAssignOrder, canMove, noticeOutcome, orderPathFor } from "./deliveryModel.js";

/**
 * Hand an order to a delivery PIC, let the PIC work it, and tell people. A PIC has their own login and sees only the
 * deliveries given to them. Every change checks the shop (institution_id) and, for a PIC, that the delivery is theirs.
 */

const COLUMNS = `d.id, d.order_id, d.pic_user_id, d.assigned_by, d.status, d.recipient_name, d.recipient_phone, d.address_text,
  d.manager_note, d.result_note, d.notify_status, d.notify_detail, d.notified_at, d.assigned_at, d.picked_up_at, d.finished_at,
  o.order_number, o.status AS order_status, o.payment_method, o.total_amount, p.name AS pic_name, p.phone_number AS pic_phone`;
const FROM = `FROM deliveries d JOIN orders o ON o.id = d.order_id JOIN users p ON p.id = d.pic_user_id`;

async function withItems(rows) {
  if (!rows.length) return rows;
  const items = await query("SELECT order_id, item_name, quantity FROM order_items WHERE order_id IN (?) ORDER BY id", [[...new Set(rows.map((r) => r.order_id))]]);
  return rows.map((r) => ({
    ...r,
    cod_amount: r.payment_method === "cod" && r.order_status === "waiting_payment" ? Number(r.total_amount) : 0,
    items: items.filter((i) => i.order_id === r.order_id).map((i) => ({ name: i.item_name, quantity: Number(i.quantity) })),
  }));
}

/** Deliveries of a shop. A PIC (`picUserId`) only ever gets their own. */
export async function listDeliveries({ institutionId, picUserId = null, status = null, orderId = null, active = false, limit = 100 }) {
  const where = ["d.institution_id = ?"];
  const params = [institutionId];
  if (picUserId) (where.push("d.pic_user_id = ?"), params.push(picUserId));
  if (orderId) (where.push("d.order_id = ?"), params.push(orderId));
  if (status) (where.push("d.status = ?"), params.push(status));
  if (active) where.push(`d.status IN (${ACTIVE_STATUSES.map(() => "?").join(",")})`), params.push(...ACTIVE_STATUSES);
  const rows = await query(`SELECT ${COLUMNS} ${FROM} WHERE ${where.join(" AND ")} ORDER BY d.assigned_at DESC, d.id DESC LIMIT ?`, [...params, Math.min(Number(limit) || 100, 200)]);
  return withItems(rows);
}

export async function getDelivery(institutionId, id) {
  const [row] = await withItems(await query(`SELECT ${COLUMNS} ${FROM} WHERE d.id = ? AND d.institution_id = ?`, [id, institutionId]));
  if (!row) throw notFound("Pengantaran tidak ditemukan.");
  return row;
}

/** The active delivery PICs of a shop, with how many deliveries each has open. */
export async function listPics(institutionId) {
  return query(
    `SELECT u.id, u.name, u.phone_number,
            (SELECT COUNT(*) FROM deliveries d WHERE d.pic_user_id = u.id AND d.status IN ('assigned', 'picked_up')) AS open_deliveries
       FROM users u WHERE u.institution_id = ? AND u.role = 'pic_delivery' AND u.is_active = 1 ORDER BY u.name`,
    [institutionId]
  );
}

/** Walk an order through the statuses between where it is and `target`; leaves it alone when it cannot get there. */
async function advanceOrder(tx, order, target) {
  let current = order.status;
  for (const step of orderPathFor(order.status, target)) {
    assertTransition(current, step, ORDER_TRANSITIONS);
    await tx.query("UPDATE orders SET status = ? WHERE id = ?", [step, order.id]);
    current = step;
  }
  return current;
}

/**
 * Give an order to a PIC. If the order already has an open delivery it is taken from the earlier PIC (marked cancelled).
 * @returns {Promise<object>} the delivery. The phone notice is sent after the data is saved and never fails the call.
 */
export async function assignDelivery({ institutionId, orderId, picUserId, assignedBy = null, note = null }) {
  const created = await transaction(async (tx) => {
    const order = await tx.queryOne("SELECT * FROM orders WHERE id = ? AND institution_id = ? FOR UPDATE", [orderId, institutionId]);
    if (!order) throw notFound("Pesanan tidak ditemukan.");
    const verdict = canAssignOrder(order);
    if (!verdict.ok) throw conflict(verdict.reason);

    const pic = await tx.queryOne("SELECT id, name FROM users WHERE id = ? AND institution_id = ? AND role = 'pic_delivery' AND is_active = 1", [picUserId, institutionId]);
    if (!pic) throw badRequest("PIC pengantaran tidak ditemukan atau tidak aktif di toko ini.");

    const lead = await tx.queryOne("SELECT name, phone_number, address_full, city FROM leads WHERE id = ? AND institution_id = ?", [order.lead_id, institutionId]);
    const address = [lead?.address_full, lead?.city].filter(Boolean).join(", ");

    const earlier = await tx.query("SELECT id, pic_user_id FROM deliveries WHERE order_id = ? AND status IN ('assigned', 'picked_up') FOR UPDATE", [order.id]);
    if (earlier.length) await tx.query(`UPDATE deliveries SET status = 'cancelled', finished_at = UTC_TIMESTAMP(), result_note = 'Dialihkan ke PIC lain.' WHERE id IN (?)`, [earlier.map((e) => e.id)]);

    const result = await tx.query(
      `INSERT INTO deliveries (institution_id, order_id, pic_user_id, assigned_by, recipient_name, recipient_phone, address_text, manager_note, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [institutionId, order.id, pic.id, assignedBy, lead?.name ?? null, lead?.phone_number ?? null, address || null, note || null]
    );
    return { id: result.insertId, order, earlierPics: earlier.map((e) => e.pic_user_id) };
  });

  const delivery = await getDelivery(institutionId, created.id);
  announceDelivery(institutionId, delivery, "delivery:assigned");
  for (const earlier of created.earlierPics) if (earlier !== delivery.pic_user_id) emitToUser(earlier, "delivery:updated", { id: null, orderId: delivery.order_id, status: "cancelled" });
  await sendNotice(institutionId, delivery);
  return getDelivery(institutionId, created.id);
}

/** Tell the PIC on their phone and record whether it went through, so a manager can see a notice that did not arrive. */
export async function sendNotice(institutionId, delivery) {
  let outcome;
  try {
    const phone = normalizePhone(delivery.pic_phone);
    const shop = await queryOne("SELECT name FROM institutions WHERE id = ?", [institutionId]);
    const result = phone.length >= 8
      ? await sendText({
          institutionId,
          to: phone,
          text: assignmentMessage({
            picName: delivery.pic_name,
            orderNumber: delivery.order_number,
            recipientName: delivery.recipient_name,
            recipientPhone: delivery.recipient_phone,
            address: delivery.address_text,
            items: delivery.items,
            codAmount: delivery.cod_amount,
            note: delivery.manager_note,
            shopName: shop?.name ?? "",
          }),
        })
      : null;
    outcome = noticeOutcome({ hasPhone: phone.length >= 8, result });
  } catch (err) {
    logger.warn({ err: err.message, deliveryId: delivery.id }, "Delivery notice failed");
    outcome = { status: "failed", detail: "Pesan ke PIC gagal dikirim." };
  }
  await query("UPDATE deliveries SET notify_status = ?, notify_detail = ?, notified_at = UTC_TIMESTAMP() WHERE id = ? AND institution_id = ?", [outcome.status, outcome.detail, delivery.id, institutionId]);
  emitToTenant(institutionId, "delivery:updated", { id: delivery.id, orderId: delivery.order_id, status: delivery.status, notifyStatus: outcome.status });
  return outcome;
}

function announceDelivery(institutionId, delivery, event) {
  const payload = { id: delivery.id, orderId: delivery.order_id, orderNumber: delivery.order_number, status: delivery.status };
  emitToUser(delivery.pic_user_id, event, payload); // the PIC's own open dashboards
  emitToTenant(institutionId, "delivery:updated", payload); // managers watching the board
}

/** Load a delivery for an action by a PIC: it must be theirs. Managers (picUserId null) may act on any delivery of the shop. */
async function loadForActor(tx, { institutionId, id, picUserId }) {
  const row = await tx.queryOne("SELECT * FROM deliveries WHERE id = ? AND institution_id = ? FOR UPDATE", [id, institutionId]);
  if (!row) throw notFound("Pengantaran tidak ditemukan.");
  if (picUserId && row.pic_user_id !== picUserId) throw forbidden("Pengantaran ini bukan tugas Anda.");
  return row;
}

/** The PIC took the goods. The order becomes "shipped". */
export async function pickUp({ institutionId, id, picUserId }) {
  await transaction(async (tx) => {
    const row = await loadForActor(tx, { institutionId, id, picUserId });
    if (row.status === "picked_up") throw conflict("Sudah ditandai diambil.");
    if (!canMove(row.status, "picked_up")) throw conflict("Pengantaran ini sudah selesai atau dibatalkan.");
    await tx.query("UPDATE deliveries SET status = 'picked_up', picked_up_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
    const order = await tx.queryOne("SELECT * FROM orders WHERE id = ? FOR UPDATE", [row.order_id]);
    if (order) await advanceOrder(tx, order, "shipped");
  });
  return afterChange(institutionId, id);
}

/** The PIC closes it: handed to the customer (delivered) or not (failed, with the reason). */
export async function finish({ institutionId, id, picUserId, result, note = null }) {
  if (!["delivered", "failed"].includes(result)) throw badRequest("Hasil pengantaran harus 'delivered' atau 'failed'.");
  if (result === "failed" && !String(note || "").trim()) throw badRequest("Tulis alasan kenapa gagal diantar.");
  await transaction(async (tx) => {
    const row = await loadForActor(tx, { institutionId, id, picUserId });
    if (!canMove(row.status, result)) throw conflict("Pengantaran ini sudah selesai atau dibatalkan.");
    await tx.query("UPDATE deliveries SET status = ?, result_note = ?, finished_at = UTC_TIMESTAMP(), picked_up_at = COALESCE(picked_up_at, UTC_TIMESTAMP()) WHERE id = ?", [result, note ? String(note).trim() : null, id]);
    if (result === "delivered") {
      const order = await tx.queryOne("SELECT * FROM orders WHERE id = ? FOR UPDATE", [row.order_id]);
      if (order) await advanceOrder(tx, order, "delivered");
    }
  });
  return afterChange(institutionId, id);
}

/** A manager takes a delivery back (wrong PIC, order cancelled). */
export async function cancel({ institutionId, id }) {
  await transaction(async (tx) => {
    const row = await loadForActor(tx, { institutionId, id, picUserId: null });
    if (!canMove(row.status, "cancelled")) throw conflict("Pengantaran ini sudah selesai atau dibatalkan.");
    await tx.query("UPDATE deliveries SET status = 'cancelled', finished_at = UTC_TIMESTAMP(), result_note = COALESCE(result_note, 'Dibatalkan oleh tim.') WHERE id = ?", [id]);
  });
  return afterChange(institutionId, id);
}

async function afterChange(institutionId, id) {
  const delivery = await getDelivery(institutionId, id);
  announceDelivery(institutionId, delivery, "delivery:updated");
  announceOrder(institutionId, "order:updated", { orderId: delivery.order_id, status: delivery.order_status });
  return delivery;
}

/** Send the phone notice again (it failed, or the PIC changed their number). */
export async function resendNotice({ institutionId, id }) {
  const delivery = await getDelivery(institutionId, id);
  if (!ACTIVE_STATUSES.includes(delivery.status)) throw conflict("Pengantaran ini sudah selesai atau dibatalkan.");
  await sendNotice(institutionId, delivery);
  return getDelivery(institutionId, id);
}
