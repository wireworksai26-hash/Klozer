import crypto from "crypto";
import { query, queryOne } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { decryptSecret } from "../utils/crypto.js";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

/**
 * Send a Purchase event to Meta Conversions API using the tenant's own pixel.
 * Returns `{ skipped: true }` when the tenant has not configured CAPI, and
 * never throws: attribution reporting must not break payment handling.
 */
export async function sendPurchaseEvent({ institutionId, orderId }) {
  try {
    const inst = await queryOne(
      "SELECT meta_pixel_id, encrypted_meta_capi_token, features_json FROM institutions WHERE id = ?",
      [institutionId]
    );
    if (!inst?.meta_pixel_id || !inst.encrypted_meta_capi_token) return { skipped: true, reason: "not_configured" };
    if (inst.features_json && inst.features_json.metaCapi === false) return { skipped: true, reason: "feature_disabled" };

    const order = await queryOne(
      `SELECT o.id, o.order_number, o.total_amount, l.phone_number, l.meta_ad_id, l.meta_campaign_id
         FROM orders o JOIN leads l ON l.id = o.lead_id
        WHERE o.id = ? AND o.institution_id = ?`,
      [orderId, institutionId]
    );
    if (!order) return { skipped: true, reason: "order_not_found" };

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.order_number,
          action_source: "chat",
          user_data: { ph: [sha256(String(order.phone_number).replace(/\D/g, ""))] },
          custom_data: {
            currency: "IDR",
            value: Number(order.total_amount),
            order_id: order.order_number,
            ...(order.meta_ad_id ? { ad_id: order.meta_ad_id } : {}),
            ...(order.meta_campaign_id ? { campaign_id: order.meta_campaign_id } : {}),
          },
        },
      ],
    };

    const token = decryptSecret(inst.encrypted_meta_capi_token);
    const url = `https://graph.facebook.com/${config.meta.graphVersion}/${encodeURIComponent(inst.meta_pixel_id)}/events`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const bodyText = await response.text();

    await query(
      `INSERT INTO meta_capi_event_logs (institution_id, order_id, event_name, event_payload_json, response_status_code, response_body, is_success)
       VALUES (?, ?, 'Purchase', ?, ?, ?, ?)`,
      [institutionId, orderId, JSON.stringify(payload), response.status, bodyText.slice(0, 2000), response.ok ? 1 : 0]
    );
    return { success: response.ok, status: response.status };
  } catch (err) {
    logger.warn({ err: err.message, institutionId, orderId }, "Meta CAPI dispatch failed");
    return { success: false, error: err.message };
  }
}
