import { query, queryOne, retryOnDeadlock, transaction } from "../config/db.js";
import { buildPagination, escapeLike, normalizePhone, parsePagination } from "../utils/helpers.js";
import { ORDER_TRANSITIONS } from "../utils/constants.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors.js";
import { afterPaid, assertTransition, markOrderPaid, releaseOrderResources } from "../services/orderService.js";
import { DuplicateOrderRequest, createOrderRecord } from "../services/orderCreationService.js";
import { audit } from "../services/auditService.js";

const ORDER_SELECT = `
  SELECT o.*, l.name AS customer_name, l.phone_number AS customer_phone, l.city AS customer_city, u.name AS cs_name,
         sh.courier_code AS courier, sh.awb_number AS awb
    FROM orders o
    JOIN leads l ON l.id = o.lead_id
    LEFT JOIN users u ON u.id = o.cs_user_id
    LEFT JOIN shipping_shipments sh ON sh.order_id = o.id`;

async function attachItems(orders) {
  if (!orders.length) return orders;
  const items = await query("SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id ASC", [orders.map((o) => o.id)]);
  const byOrder = new Map();
  for (const item of items) {
    if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
    byOrder.get(item.order_id).push(item);
  }
  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) || [] }));
}

/** GET /orders */
export async function getOrders(req, res) {
  const paging = parsePagination(req.query);
  const where = ["o.institution_id = ?"];
  const params = [req.tenantId];

  if (req.query.search) {
    const like = `%${escapeLike(req.query.search)}%`;
    where.push("(o.order_number LIKE ? OR l.name LIKE ? OR l.phone_number LIKE ?)");
    params.push(like, like, like);
  }
  if (req.query.status) {
    where.push("o.status = ?");
    params.push(req.query.status);
  }
  const clause = `WHERE ${where.join(" AND ")}`;

  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM orders o JOIN leads l ON l.id = o.lead_id ${clause}`, params);
  const rows = await query(`${ORDER_SELECT} ${clause} ORDER BY o.id DESC LIMIT ? OFFSET ?`, [...params, paging.limit, paging.offset]);
  const items = await attachItems(rows);

  res.json({ success: true, items, pagination: buildPagination(paging, Number(total)), data: items, orders: items });
}

/**
 * Find or create the customer's lead. Runs before (outside) the order
 * transaction as a single atomic upsert: concurrent orders for the same
 * customer must not collide on the unique (institution_id, phone_number) key.
 */
async function resolveLead({ lead_id, customer_name, customer_phone }, tenantId) {
  if (lead_id) {
    const lead = await queryOne("SELECT id FROM leads WHERE id = ? AND institution_id = ?", [lead_id, tenantId]);
    if (!lead) throw badRequest("lead_id tidak ditemukan pada instansi ini.");
    return lead.id;
  }

  const phone = customer_phone ? normalizePhone(customer_phone) : "0000000000";
  const name = customer_phone ? customer_name || "Pelanggan" : "Pelanggan Umum";
  const result = await retryOnDeadlock(() => query(
    `INSERT INTO leads (institution_id, phone_number, external_id, name, source, status, last_contacted_at)
     VALUES (?, ?, ?, ?, 'manual', 'in_progress', UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE last_contacted_at = UTC_TIMESTAMP(), external_id = COALESCE(external_id, VALUES(external_id)), id = LAST_INSERT_ID(id)`,
    [tenantId, phone, phone, name]
  ));
  return result.insertId;
}

/**
 * POST /orders
 * Prices and HPP come from the database, never from the client. Stock rows are
 * locked in id order, checked, and decremented in the same transaction as the
 * order insert, so concurrent orders cannot oversell.
 */
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,80}$/;

async function sendExistingOrder(res, tenantId, key) {
  const [existing] = await attachItems(await query(`${ORDER_SELECT} WHERE o.institution_id = ? AND o.idempotency_key = ?`, [tenantId, key]));
  if (!existing) return false;
  res.status(200).json({ success: true, message: "Pesanan ini sudah dibuat sebelumnya.", replayed: true, data: existing });
  return true;
}

export async function createOrder(req, res) {
  const b = req.body;
  const tenantId = req.tenantId;

  const idempotencyKey = req.get("idempotency-key") || null;
  if (idempotencyKey && !IDEMPOTENCY_KEY.test(idempotencyKey)) {
    throw badRequest("Header Idempotency-Key tidak valid (8-80 karakter: huruf, angka, - atau _).");
  }
  if (idempotencyKey && (await sendExistingOrder(res, tenantId, idempotencyKey))) return;

  const leadId = await resolveLead(b, tenantId);

  let created;
  try {
    created = await createOrderRecord({
      tenantId,
      leadId,
      csUserId: req.user.id,
      items: b.items,
      shippingFee: b.shipping_fee,
      discountAmount: b.discount_amount,
      paymentMethod: b.payment_method,
      fulfillmentType: b.fulfillment_type,
      notes: b.notes ?? null,
      idempotencyKey,
    });
  } catch (err) {
    if (err instanceof DuplicateOrderRequest && (await sendExistingOrder(res, tenantId, idempotencyKey))) return;
    throw err;
  }

  if (created.paid?.changed) afterPaid(created.paid);
  await audit(req, "order.create", { entityType: "order", entityId: created.orderId });

  const [order] = await attachItems(await query(`${ORDER_SELECT} WHERE o.id = ?`, [created.orderId]));
  res.status(201).json({ success: true, message: "Pesanan berhasil dibuat!", data: order });
}

/**
 * PATCH /orders/:id/status
 * Enforces the allowed state machine. Confirming payment goes through
 * markOrderPaid (commission); cancelling returns stock.
 */
export async function updateOrderStatus(req, res) {
  const { status: next } = req.body;
  const payRoles = ["owner", "supervisor", "finance", "superadmin"];
  if (next === "paid" && !payRoles.includes(req.user.role)) {
    throw forbidden("Hanya owner, supervisor, atau finance yang dapat mengonfirmasi pembayaran.");
  }

  const result = await transaction(async (tx) => {
    const order = await tx.queryOne("SELECT * FROM orders WHERE id = ? AND institution_id = ? FOR UPDATE", [req.params.id, req.tenantId]);
    if (!order) throw notFound("Pesanan tidak ditemukan.");
    assertTransition(order.status, next, ORDER_TRANSITIONS);

    if (next === "paid") return { paid: await markOrderPaid(tx, order.id, req.tenantId) };

    if (next === "cancelled") {
      const open = await tx.queryOne("SELECT id FROM payments WHERE order_id = ? AND status = 'paid' LIMIT 1", [order.id]);
      if (open && req.user.role !== "superadmin") {
        throw conflict("Pesanan sudah dibayar melalui gateway. Lakukan refund terlebih dulu sebelum membatalkan.");
      }
      await releaseOrderResources(tx, order);
      await tx.query("UPDATE payments SET status = 'expired' WHERE order_id = ? AND status = 'pending'", [order.id]);
    }

    await tx.query("UPDATE orders SET status = ?, rejection_reason = ? WHERE id = ?", [next, req.body.rejection_reason ?? null, order.id]);
    return { paid: null };
  });

  if (result.paid?.changed) afterPaid(result.paid);
  await audit(req, "order.status", { entityType: "order", entityId: req.params.id, metadata: { status: next } });

  const [order] = await attachItems(await query(`${ORDER_SELECT} WHERE o.id = ?`, [req.params.id]));
  res.json({ success: true, message: "Status pesanan diperbarui.", data: order });
}

/** GET /orders/:id/invoice — 80mm thermal receipt text plus structured data. */
export async function getOrderInvoice(req, res) {
  const [order] = await attachItems(await query(`${ORDER_SELECT} WHERE o.id = ? AND o.institution_id = ?`, [req.params.id, req.tenantId]));
  if (!order) throw notFound("Pesanan tidak ditemukan.");

  const inst = await queryOne("SELECT name, phone_number, address FROM institutions WHERE id = ?", [req.tenantId]);
  const rp = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  const lines = order.items.map((it) => `${it.item_name}\n  ${it.quantity} x ${rp(it.unit_price)} = ${rp(it.subtotal)}`).join("\n");
  const thermalReceiptText = [
    "========================================",
    `       ${inst?.name || "KLOZER STORE"}`,
    `       Telp: ${inst?.phone_number || "-"}`,
    "========================================",
    `No. Nota  : ${order.order_number}`,
    `Tanggal   : ${new Date(order.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
    `Pelanggan : ${order.customer_name}`,
    "----------------------------------------",
    lines,
    "----------------------------------------",
    `Subtotal  : ${rp(order.subtotal_amount)}`,
    `Ongkir    : ${rp(order.shipping_fee)}`,
    `Diskon    : -${rp(order.discount_amount)}`,
    "========================================",
    `TOTAL     : ${rp(order.total_amount)}`,
    `Metode    : ${String(order.payment_method).toUpperCase()}`,
    `Status    : ${String(order.status).toUpperCase()}`,
    "========================================",
    "      Terima Kasih Atas Pesanan Anda!",
  ].join("\n");

  res.json({ success: true, data: { order, institution: inst, thermalReceiptText } });
}

/** GET /orders/:id */
export async function getOrder(req, res) {
  const [order] = await attachItems(await query(`${ORDER_SELECT} WHERE o.id = ? AND o.institution_id = ?`, [req.params.id, req.tenantId]));
  if (!order) throw notFound("Pesanan tidak ditemukan.");
  res.json({ success: true, data: order });
}
