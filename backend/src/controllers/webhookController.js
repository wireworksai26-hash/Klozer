import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { safeEqual } from "../utils/crypto.js";
import { verifyHmacSignature } from "../utils/hmacValidator.js";
import { forbidden, notFound, unauthorized } from "../utils/errors.js";
import { findActiveByExternalId } from "../services/channels/channelRepository.js";
import { processInboundMessage } from "../services/whatsappService.js";

/** GET /webhooks/whatsapp — Meta subscription handshake. */
export function verifyWhatsAppWebhook(req, res) {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
  if (mode === "subscribe" && safeEqual(token, config.meta.verifyToken)) {
    return res.status(200).send(String(challenge ?? ""));
  }
  throw forbidden("Verification token mismatch");
}

function extractMessages(body) {
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      for (const msg of value.messages || []) {
        const contact = (value.contacts || []).find((c) => c.wa_id === msg.from);
        out.push({
          phoneNumberId,
          from: msg.from,
          name: contact?.profile?.name,
          id: msg.id,
          type: msg.type,
          text: msg.type === "text" ? msg.text?.body || "" : "",
          mediaId: msg.image?.id || msg.document?.id || null,
        });
      }
    }
  }
  return out;
}

/**
 * POST /webhooks/whatsapp
 * The signature is verified over the exact raw bytes before anything is
 * parsed. Each message is routed to the tenant that owns the receiving number;
 * numbers we do not know are ignored. Processing happens after the 200 so Meta
 * does not time out and retry.
 */
export async function handleWhatsAppInbound(req, res) {
  if (config.meta.appSecret) {
    if (!verifyHmacSignature(req.rawBody, req.headers["x-hub-signature-256"], config.meta.appSecret)) {
      throw unauthorized("Signature webhook tidak valid.");
    }
  } else if (config.isProduction) {
    // env validation makes this unreachable in production, kept as a hard guard.
    throw unauthorized("META_APP_SECRET belum dikonfigurasi.");
  } else {
    logger.warn("META_APP_SECRET is not set; accepting unsigned WhatsApp webhook (development only)");
  }

  res.status(200).json({ status: "EVENT_RECEIVED" });

  for (const msg of extractMessages(req.body)) {
    (async () => {
      const channel = await findActiveByExternalId("whatsapp", msg.phoneNumberId);
      if (!channel) {
        logger.warn({ phoneNumberId: msg.phoneNumberId }, "WhatsApp message for unknown number ignored");
        return;
      }
      await processInboundMessage({
        institutionId: channel.institutionId,
        channel,
        fromPhone: msg.from,
        customerName: msg.name,
        text: msg.text,
        messageId: msg.id,
        messageType: msg.type === "text" ? "text" : msg.type === "audio" ? "voice_note" : msg.type === "image" ? "image" : msg.type === "document" ? "document_receipt" : "text",
        mediaId: msg.mediaId,
      });
    })().catch((err) => logger.error({ err: err.message, messageId: msg.id }, "Inbound WhatsApp processing failed"));
  }
}

/**
 * POST /webhooks/whatsapp/simulate — development sandbox for the signed-in
 * tenant. Disabled in production.
 */
export async function simulateWhatsAppInbound(req, res) {
  if (config.isProduction) throw notFound();
  const { phone, name, message } = req.body;
  const result = await processInboundMessage({
    institutionId: req.tenantId,
    fromPhone: phone,
    customerName: name,
    text: message,
    messageId: `sim_${Date.now()}`,
  });
  res.json({ success: true, message: "Simulasi pesan WhatsApp diproses.", data: result });
}
