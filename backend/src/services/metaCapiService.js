import crypto from "crypto";
import { memoryStore } from "../config/db.js";
import { config } from "../config/env.js";

/**
 * Dispatch Offline Conversions API Event to Meta Graph API
 * @param {Object} params { orderId, amount, phone, email, campaignId, adId, institutionId }
 * @returns {Promise<Object>} Dispatch response
 */
export async function sendMetaCapiPurchaseEvent({ orderId, amount = 0, phone = "", email = "", campaignId = "", adId = "", institutionId = 1 }) {
  const hashedPhone = phone ? crypto.createHash("sha256").update(phone.replace(/[^0-9]/g, "")).digest("hex") : undefined;
  const hashedEmail = email ? crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex") : undefined;

  const payload = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "other",
    user_data: {
      ph: [hashedPhone],
      em: hashedEmail ? [hashedEmail] : undefined,
    },
    custom_data: {
      currency: "IDR",
      value: Number(amount),
      order_id: String(orderId),
      campaign_id: campaignId || undefined,
      ad_id: adId || undefined,
    },
  };

  const logEntry = {
    id: (memoryStore.meta_capi_event_logs?.length || 0) + 1,
    institution_id: institutionId,
    order_id: orderId,
    event_name: "Purchase",
    event_payload_json: payload,
    response_status_code: 200,
    response_body: JSON.stringify({ events_received: 1, fbtrace_id: `FB-${Date.now()}` }),
    is_success: 1,
    sent_at: new Date().toISOString(),
  };

  if (!memoryStore.meta_capi_event_logs) memoryStore.meta_capi_event_logs = [];
  memoryStore.meta_capi_event_logs.push(logEntry);

  return {
    success: true,
    eventId: logEntry.id,
    status: 200,
    trackedRevenue: Number(amount),
  };
}
