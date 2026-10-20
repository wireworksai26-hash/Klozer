import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";

/**
 * The data inside events and the public API's contact and order responses, in one place so both show the same thing.
 * Field names are part of the contract with receivers (n8n workflows and other code depend on them): add fields freely,
 * never rename or remove one.
 */

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** @param {object} lead a leads row */
export const contactPayload = (lead) => ({
  id: lead.id,
  name: lead.name,
  phone: lead.phone_number ?? null,
  channel_type: lead.channel_type,
  channel_id: lead.channel_id ?? null,
  city: lead.city ?? null,
  status: lead.status,
  source: lead.source ?? null,
  handled_by: lead.handled_by ?? null,
  assigned_cs_id: lead.assigned_cs_id ?? null,
  marketing_consent: lead.marketing_consent ?? "unknown",
  ad_id: lead.meta_ad_id ?? null,
  created_at: iso(lead.created_at),
  last_contacted_at: iso(lead.last_contacted_at),
});

export async function loadContactPayload(institutionId, leadId) {
  const lead = await queryOne("SELECT * FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  return lead ? contactPayload(lead) : null;
}

/** An order with its items and the contact it belongs to. */
export async function loadOrderPayload(institutionId, orderId) {
  const order = await queryOne(
    `SELECT o.*, l.name AS contact_name, l.phone_number AS contact_phone, l.channel_type AS contact_channel
       FROM orders o JOIN leads l ON l.id = o.lead_id WHERE o.id = ? AND o.institution_id = ?`,
    [orderId, institutionId]
  );
  if (!order) return null;
  const [items, shipment] = await Promise.all([
    query("SELECT product_id, item_name, quantity, unit_price, subtotal FROM order_items WHERE order_id = ? ORDER BY id", [order.id]),
    queryOne("SELECT courier_code, service_name, awb_number, shipping_status FROM shipping_shipments WHERE order_id = ?", [order.id]),
  ]);
  const chat = parseJsonColumn(order.chat_details_json, null);
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_method: order.payment_method,
    fulfillment_type: order.fulfillment_type,
    created_via: order.created_via,
    subtotal: Number(order.subtotal_amount),
    discount: Number(order.discount_amount),
    shipping_fee: Number(order.shipping_fee),
    total: Number(order.total_amount),
    currency: "IDR",
    notes: order.notes ?? null,
    contact: { id: order.lead_id, name: order.contact_name, phone: order.contact_phone ?? null, channel_type: order.contact_channel },
    recipient: chat?.recipient ?? null,
    items: items.map((i) => ({ product_id: i.product_id, name: i.item_name, quantity: i.quantity, unit_price: Number(i.unit_price), subtotal: Number(i.subtotal) })),
    shipment: shipment ? { courier: shipment.courier_code, service: shipment.service_name, awb: shipment.awb_number, status: shipment.shipping_status } : null,
    created_at: iso(order.created_at),
  };
}

/** @param {{ contactId: number, channelType: string, direction: "inbound"|"outbound", sender: "customer"|"ai"|"cs"|"api", type?: string, text?: string|null, externalId?: string|null }} m */
export const messagePayload = (m) => ({
  contact_id: m.contactId,
  channel_type: m.channelType,
  direction: m.direction,
  sender: m.sender,
  type: m.type ?? "text",
  text: m.text ?? null,
  external_id: m.externalId ?? null,
  created_at: new Date().toISOString(),
});
