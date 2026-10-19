import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { emptyDraft } from "./draftModel.js";

/** Storage for order drafts. A contact has at most one open draft (`active = 1`); closing it sets `active` to NULL. */

function fromRow(row) {
  return {
    id: row.id,
    institutionId: row.institution_id,
    leadId: row.lead_id,
    channelId: row.channel_id,
    status: row.status,
    items: parseJsonColumn(row.items_json, []).map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
    fulfillmentType: row.fulfillment_type,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    addressText: row.address_text,
    city: row.city,
    postalCode: row.postal_code,
    shippingOptions: parseJsonColumn(row.shipping_options_json, null),
    courierCode: row.courier_code,
    courierService: row.courier_service,
    shippingFee: row.shipping_fee === null ? null : Number(row.shipping_fee),
    shippingEta: row.shipping_eta,
    paymentMethod: row.payment_method,
    notes: row.notes,
    orderId: row.order_id,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
  };
}

export async function getActiveDraft(institutionId, leadId) {
  const row = await queryOne("SELECT * FROM order_drafts WHERE institution_id = ? AND lead_id = ? AND active = 1", [institutionId, leadId]);
  return row ? fromRow(row) : null;
}

export async function getDraft(institutionId, id) {
  const row = await queryOne("SELECT * FROM order_drafts WHERE institution_id = ? AND id = ?", [institutionId, id]);
  return row ? fromRow(row) : null;
}

/** Open a new draft, or return the one that is already open (two quick messages can race here). */
export async function openDraft({ institutionId, leadId, channelId = null }) {
  await query(
    `INSERT INTO order_drafts (institution_id, lead_id, channel_id, active, status, items_json)
     VALUES (?, ?, ?, 1, 'collecting', JSON_ARRAY())
     ON DUPLICATE KEY UPDATE last_activity_at = UTC_TIMESTAMP()`,
    [institutionId, leadId, channelId]
  );
  return { ...emptyDraft(), ...(await getActiveDraft(institutionId, leadId)) };
}

/** Write the whole draft back. */
export async function saveDraft(draft, status = draft.status) {
  await query(
    `UPDATE order_drafts SET status = ?, items_json = ?, fulfillment_type = ?, recipient_name = ?, recipient_phone = ?, address_text = ?, city = ?,
            postal_code = ?, shipping_options_json = ?, courier_code = ?, courier_service = ?, shipping_fee = ?, shipping_eta = ?, payment_method = ?,
            notes = ?, last_activity_at = UTC_TIMESTAMP()
      WHERE id = ? AND institution_id = ? AND active = 1`,
    [
      status,
      JSON.stringify(draft.items),
      draft.fulfillmentType,
      draft.recipientName,
      draft.recipientPhone,
      draft.addressText,
      draft.city,
      draft.postalCode,
      draft.shippingOptions ? JSON.stringify(draft.shippingOptions) : null,
      draft.courierCode,
      draft.courierService,
      draft.shippingFee,
      draft.shippingEta,
      draft.paymentMethod,
      draft.notes,
      draft.id,
      draft.institutionId,
    ]
  );
  return { ...draft, status };
}

/** The draft is over: placed as an order, cancelled by the customer or staff, handed to the team, or expired. */
export async function closeDraft(institutionId, id, status, orderId = null) {
  await query("UPDATE order_drafts SET active = NULL, status = ?, order_id = ?, last_activity_at = UTC_TIMESTAMP() WHERE id = ? AND institution_id = ?", [status, orderId, id, institutionId]);
}

/** Close carts nobody came back to. @returns {Promise<number>} how many were closed */
export async function expireStaleDrafts({ hours = 48 } = {}) {
  const result = await query("UPDATE order_drafts SET active = NULL, status = 'expired' WHERE active = 1 AND last_activity_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)", [hours]);
  return result.affectedRows;
}

/** Open drafts, newest activity first, for the dashboard. */
export async function listOpenDrafts(institutionId, { limit = 50 } = {}) {
  const rows = await query(
    `SELECT d.*, l.name AS lead_name FROM order_drafts d JOIN leads l ON l.id = d.lead_id
      WHERE d.institution_id = ? AND d.active = 1 ORDER BY d.last_activity_at DESC LIMIT ?`,
    [institutionId, limit]
  );
  return rows.map((r) => ({ ...fromRow(r), leadName: r.lead_name }));
}
