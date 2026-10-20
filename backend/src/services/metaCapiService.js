import crypto from "crypto";
import { query, queryOne } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { parseJsonColumn } from "../utils/jsonColumn.js";
import { decryptSecret } from "../utils/crypto.js";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

/** A failed event is sent again after these waits (minutes), then given up on. Meta accepts purchases for 7 days. */
export const CAPI_RETRY_MINUTES = Object.freeze([2, 10, 60, 360]);
const MAX_AGE_DAYS = 6;

/**
 * The Purchase event for an order. A customer who came from a Click-to-WhatsApp ad is reported with the ad click id
 * and the WhatsApp Business Account (Meta's business-messaging format), which is what lets Meta credit the sale to the
 * ad. Anyone else is matched by a hash of their phone number.
 * Pure: the same order always gives the same event, and `event_id` (the order number) lets Meta ignore a repeat.
 */
export function buildPurchaseEvent({ order, lead, wabaId, now = new Date() }) {
  const base = {
    event_name: "Purchase",
    event_time: Math.floor(now.getTime() / 1000),
    event_id: order.order_number,
  };
  const custom = {
    currency: "IDR",
    value: Number(order.total_amount),
    order_id: order.order_number,
    ...(lead.meta_ad_id ? { ad_id: lead.meta_ad_id } : {}),
    ...(lead.meta_campaign_id ? { campaign_id: lead.meta_campaign_id } : {}),
  };
  if (lead.ctwa_clid && wabaId) {
    return { ...base, action_source: "business_messaging", messaging_channel: "whatsapp", user_data: { whatsapp_business_account_id: String(wabaId), ctwa_clid: lead.ctwa_clid }, custom_data: custom };
  }
  return { ...base, action_source: "chat", user_data: { ph: [sha256(String(lead.phone_number ?? "").replace(/\D/g, ""))] }, custom_data: custom };
}

async function post({ pixelId, token, payload }) {
  const response = await fetch(`https://graph.facebook.com/${config.meta.graphVersion}/${encodeURIComponent(pixelId)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  return { ok: response.ok, status: response.status, body: (await response.text()).slice(0, 2000) };
}

const retryAt = (attempt, now) => (attempt <= CAPI_RETRY_MINUTES.length ? new Date(now.getTime() + CAPI_RETRY_MINUTES[attempt - 1] * 60_000) : null);

/**
 * Send a Purchase event to Meta Conversions API using the tenant's own dataset (pixel).
 * Returns `{ skipped: true }` when the tenant has not configured CAPI, and never throws: attribution reporting must
 * not break payment handling. A failed attempt is logged and sent again later (see retryFailedEvents).
 */
export async function sendPurchaseEvent({ institutionId, orderId }) {
  try {
    const inst = await queryOne("SELECT meta_pixel_id, encrypted_meta_capi_token, features_json FROM institutions WHERE id = ?", [institutionId]);
    if (!inst?.meta_pixel_id || !inst.encrypted_meta_capi_token) return { skipped: true, reason: "not_configured" };
    if (inst.features_json && parseJsonColumn(inst.features_json).metaCapi === false) return { skipped: true, reason: "feature_disabled" };

    const already = await queryOne("SELECT id FROM meta_capi_event_logs WHERE order_id = ? AND event_name = 'Purchase' AND is_success = 1 LIMIT 1", [orderId]);
    if (already) return { skipped: true, reason: "already_sent" };

    const order = await queryOne("SELECT id, order_number, total_amount, lead_id FROM orders WHERE id = ? AND institution_id = ?", [orderId, institutionId]);
    if (!order) return { skipped: true, reason: "order_not_found" };
    const lead = await queryOne(
      `SELECT l.phone_number, l.meta_ad_id, l.meta_campaign_id, l.ctwa_clid, JSON_UNQUOTE(JSON_EXTRACT(c.config_json, '$.wabaId')) AS waba_id
         FROM leads l LEFT JOIN channels c ON c.id = l.channel_id WHERE l.id = ?`,
      [order.lead_id]
    );
    if (!lead) return { skipped: true, reason: "lead_not_found" };

    const event = buildPurchaseEvent({ order, lead, wabaId: lead.waba_id && lead.waba_id !== "null" ? lead.waba_id : null });
    const payload = { data: [event] };
    const now = new Date();

    let outcome;
    try {
      outcome = await post({ pixelId: inst.meta_pixel_id, token: decryptSecret(inst.encrypted_meta_capi_token), payload });
    } catch (err) {
      outcome = { ok: false, status: 0, body: String(err.message).slice(0, 2000) };
    }
    await query(
      `INSERT INTO meta_capi_event_logs (institution_id, order_id, event_name, event_payload_json, response_status_code, response_body, is_success, attempts, next_retry_at)
       VALUES (?, ?, 'Purchase', ?, ?, ?, ?, 1, ?)`,
      [institutionId, orderId, JSON.stringify(payload), outcome.status, outcome.body, outcome.ok ? 1 : 0, outcome.ok ? null : retryAt(1, now)]
    );
    return { success: outcome.ok, status: outcome.status, mode: event.action_source };
  } catch (err) {
    logger.warn({ err: err.message, institutionId, orderId }, "Meta CAPI dispatch failed");
    return { success: false, error: err.message };
  }
}

/**
 * Send again the events that failed and are due. Meta ignores an event id it already has, so a retry that races a
 * success is harmless. Events older than the age limit are given up on (Meta no longer accepts them).
 * @returns {Promise<{ retried: number, succeeded: number }>}
 */
export async function retryFailedEvents({ now = new Date(), limit = 50, institutionId = null } = {}) {
  const rows = await query(
    `SELECT e.*, i.meta_pixel_id, i.encrypted_meta_capi_token FROM meta_capi_event_logs e JOIN institutions i ON i.id = e.institution_id
      WHERE e.is_success = 0 AND e.next_retry_at IS NOT NULL AND e.next_retry_at <= ? AND e.sent_at > ? AND (? IS NULL OR e.institution_id = ?)
      ORDER BY e.next_retry_at LIMIT ?`,
    [now, new Date(now.getTime() - MAX_AGE_DAYS * 86_400_000), institutionId, institutionId, limit]
  );
  let succeeded = 0;
  for (const row of rows) {
    // claim: push the retry time forward so a second worker skips it
    const claim = await query("UPDATE meta_capi_event_logs SET next_retry_at = ? WHERE id = ? AND next_retry_at = ?", [new Date(now.getTime() + 5 * 60_000), row.id, row.next_retry_at]);
    if (!claim.affectedRows) continue;
    let outcome;
    try {
      outcome = await post({ pixelId: row.meta_pixel_id, token: decryptSecret(row.encrypted_meta_capi_token), payload: parseJsonColumn(row.event_payload_json, {}) });
    } catch (err) {
      outcome = { ok: false, status: 0, body: String(err.message).slice(0, 2000) };
    }
    const attempts = row.attempts + 1;
    await query("UPDATE meta_capi_event_logs SET response_status_code = ?, response_body = ?, is_success = ?, attempts = ?, next_retry_at = ? WHERE id = ?", [
      outcome.status,
      outcome.body,
      outcome.ok ? 1 : 0,
      attempts,
      outcome.ok ? null : retryAt(attempts, now),
      row.id,
    ]);
    if (outcome.ok) succeeded++;
  }
  return { retried: rows.length, succeeded };
}
