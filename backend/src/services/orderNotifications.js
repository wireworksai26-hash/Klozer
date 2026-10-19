import { query, queryOne } from "../config/db.js";
import { logger } from "../config/logger.js";
import { emitToTenant } from "../realtime.js";
import { sendText } from "./channels/channelService.js";
import { getCommerceSettings } from "./commerce/commerceSettings.js";
import { paymentReceivedText, shippedText } from "./commerce/messages.js";
import { withinMessagingWindow } from "./followup/followupPolicy.js";

/**
 * Messages the customer did not ask for but expects about their order: payment received, order shipped. They are
 * sent only for tenants that turned chat commerce on, only where the platform still allows a free-form message
 * (inside the 24-hour window), and they are kept in the conversation like any other reply.
 */

/** @returns {Promise<{ sent: boolean, reason?: string }>} */
export async function notifyCustomer({ institutionId, leadId, text, kind }) {
  try {
    const settings = await getCommerceSettings(institutionId);
    if (!settings.enabled || !settings.notifyCustomer) return { sent: false, reason: "disabled" };

    const lead = await queryOne("SELECT channel_id, channel_type, external_id, phone_number, last_inbound_at FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
    if (!lead) return { sent: false, reason: "no_contact" };
    // a web chat visitor has no messaging window: the message waits in the conversation until they are back
    const allowed = lead.channel_type === "webchat" || withinMessagingWindow(lead.channel_type, lead.last_inbound_at);
    if (!allowed) return { sent: false, reason: "window_closed" };

    const sent = await sendText({ institutionId, channelId: lead.channel_id, type: lead.channel_type, to: lead.external_id ?? lead.phone_number, text });
    await query(
      `INSERT INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, message_type, content_text, is_delivered, delivery_error, meta_json)
       VALUES (?, ?, ?, ?, 'ai_agent', 'text', ?, ?, ?, ?)`,
      [institutionId, leadId, lead.channel_id, sent.messageId ?? null, text, sent.success ? 1 : 0, sent.success ? null : String(sent.error).slice(0, 250), JSON.stringify({ notification: kind })]
    );
    if (sent.success) emitToTenant(institutionId, "chat:message", { leadId, direction: "outbound", text, sender: "ai_agent" });
    return sent.success ? { sent: true } : { sent: false, reason: "send_failed" };
  } catch (err) {
    logger.warn({ err: err.message, kind }, "Customer notification failed");
    return { sent: false, reason: "error" };
  }
}

export const notifyOrderPaid = (order) =>
  notifyCustomer({ institutionId: order.institution_id, leadId: order.lead_id, kind: "order_paid", text: paymentReceivedText({ orderNumber: order.order_number, total: order.total_amount }) });

export const notifyOrderShipped = ({ order, courier, service, awb }) =>
  notifyCustomer({ institutionId: order.institution_id, leadId: order.lead_id, kind: "order_shipped", text: shippedText({ orderNumber: order.order_number, courier, service, awb }) });

export const notifyOrderCancelled = (order, text) => notifyCustomer({ institutionId: order.institution_id, leadId: order.lead_id, kind: "order_cancelled", text });
