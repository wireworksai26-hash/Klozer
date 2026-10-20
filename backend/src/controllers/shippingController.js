import { query, queryOne } from "../config/db.js";
import { calculateShippingRates, calculateCodRiskScore } from "../services/shippingService.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";
import { notifyOrderShipped } from "../services/orderNotifications.js";
import { emitEvent } from "../services/integrations/eventBus.js";
import { loadOrderPayload } from "../services/integrations/eventPayloads.js";

/** POST /shipping/rates — static estimates (see shippingService). */
export async function getRates(req, res) {
  const { originCity, destinationCity, weightGrams } = req.body;
  const rates = await calculateShippingRates({
    originCity: originCity || "Surakarta",
    destinationCity: destinationCity || "Jakarta",
    weightGrams,
  });
  res.json({ success: true, isEstimate: true, rates });
}

/** POST /shipping/cod-risk-score */
export async function checkCodRisk(req, res) {
  const { phone, address, pastReturnRate } = req.body;
  res.json({ success: true, ...calculateCodRiskScore({ phone, address, pastReturnRate }) });
}

/**
 * POST /shipping/book
 * Records a shipment for one of the tenant's orders. No courier API is
 * integrated yet, so the AWB must be supplied by staff after booking with the
 * courier; no tracking number is ever fabricated.
 */
export async function bookShipment(req, res) {
  const b = req.body;
  const order = await queryOne("SELECT id, status, shipping_fee, total_amount FROM orders WHERE id = ? AND institution_id = ?", [b.order_id, req.tenantId]);
  if (!order) throw notFound("Pesanan tidak ditemukan.");
  if (["waiting_payment", "cancelled"].includes(order.status) && !b.is_cod) {
    throw conflict(`Pesanan berstatus '${order.status}' belum dapat dikirim.`);
  }
  if (b.is_cod && b.cod_amount <= 0) throw badRequest("cod_amount wajib diisi untuk pengiriman COD.");

  const existing = await queryOne("SELECT id FROM shipping_shipments WHERE order_id = ?", [order.id]);
  if (existing) throw conflict("Pesanan ini sudah memiliki data pengiriman.");

  const result = await query(
    `INSERT INTO shipping_shipments
       (order_id, courier_code, service_name, awb_number, shipping_fee_customer, is_cod, cod_amount, cod_status, shipping_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.id,
      b.courier_code,
      b.service_name || "REG",
      b.awb_number ?? null,
      order.shipping_fee,
      b.is_cod ? 1 : 0,
      b.is_cod ? b.cod_amount : 0,
      b.is_cod ? "pending_courier" : "none",
      b.awb_number ? "pickup_requested" : "draft",
    ]
  );
  const shipment = await queryOne("SELECT * FROM shipping_shipments WHERE id = ?", [result.insertId]);
  await audit(req, "shipment.create", { entityType: "order", entityId: order.id, metadata: { courier: b.courier_code } });

  res.status(201).json({
    success: true,
    data: shipment,
    awbNumber: shipment.awb_number,
    status: shipment.shipping_status,
    message: shipment.awb_number ? "Data pengiriman tersimpan." : "Draft pengiriman tersimpan. Isi nomor resi setelah booking ke kurir.",
  });
}

/**
 * PUT /shipping/orders/:orderId
 * Staff fill in or correct the courier, the waybill (resi) and the shipping status after booking with the courier.
 * When a waybill is set or changed, the customer is told in their chat (unless `notify_customer` is false); the
 * response says whether that message went out, because outside the platform's 24-hour window it cannot.
 */
export async function updateShipment(req, res) {
  const b = req.body;
  const order = await queryOne("SELECT * FROM orders WHERE id = ? AND institution_id = ?", [req.params.orderId, req.tenantId]);
  if (!order) throw notFound("Pesanan tidak ditemukan.");
  if (order.status === "cancelled") throw conflict("Pesanan ini sudah dibatalkan.");

  let shipment = await queryOne("SELECT * FROM shipping_shipments WHERE order_id = ?", [order.id]);
  if (!shipment) {
    if (!b.courier_code) throw badRequest("courier_code wajib diisi untuk membuat data pengiriman.");
    const isCod = order.payment_method === "cod";
    const created = await query(
      `INSERT INTO shipping_shipments (order_id, courier_code, service_name, awb_number, shipping_fee_customer, is_cod, cod_amount, cod_status, shipping_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order.id, b.courier_code, b.service_name || "REG", b.awb_number ?? null, order.shipping_fee, isCod ? 1 : 0, isCod ? order.total_amount : 0, isCod ? "pending_courier" : "none", b.shipping_status || (b.awb_number ? "pickup_requested" : "draft")]
    );
    shipment = await queryOne("SELECT * FROM shipping_shipments WHERE id = ?", [created.insertId]);
  } else {
    const sets = [];
    const values = [];
    for (const [column, value] of [["courier_code", b.courier_code], ["service_name", b.service_name], ["awb_number", b.awb_number], ["shipping_status", b.shipping_status]]) {
      if (value !== undefined) (sets.push(`${column} = ?`), values.push(value));
    }
    if (b.awb_number !== undefined && b.shipping_status === undefined && shipment.shipping_status === "draft") (sets.push("shipping_status = ?"), values.push("pickup_requested"));
    if (sets.length) await query(`UPDATE shipping_shipments SET ${sets.join(", ")} WHERE id = ?`, [...values, shipment.id]);
    const previous = shipment;
    shipment = await queryOne("SELECT * FROM shipping_shipments WHERE id = ?", [shipment.id]);
    shipment.previousAwb = previous.awb_number;
  }

  const awbChanged = b.awb_number !== undefined && b.awb_number !== (shipment.previousAwb ?? null);
  const notified = awbChanged && b.notify_customer !== false ? await notifyOrderShipped({ order, courier: shipment.courier_code, service: shipment.service_name, awb: shipment.awb_number }) : { sent: false, reason: awbChanged ? "disabled_by_request" : "no_waybill_change" };
  await audit(req, "shipment.update", { entityType: "order", entityId: order.id, metadata: { fields: Object.keys(b).filter((k) => k !== "notify_customer"), notified: notified.sent } });

  emitEvent({ institutionId: req.tenantId, type: "shipment.updated", data: () => loadOrderPayload(req.tenantId, order.id) });

  const { previousAwb, ...clean } = shipment; // eslint-disable-line no-unused-vars
  res.json({ success: true, data: clean, notified });
}
