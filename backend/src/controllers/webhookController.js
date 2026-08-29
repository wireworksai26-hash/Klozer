import { config } from "../config/env.js";
import { memoryStore } from "../config/db.js";
import { generateAiCsResponse } from "../services/aiBrainService.js";
import { normalizePhone } from "../utils/helpers.js";

/**
 * WhatsApp Meta Cloud API Webhook Verification
 * GET /api/v1/webhooks/whatsapp
 */
export async function verifyWhatsAppWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.meta.verifyToken) {
    console.log("[WhatsApp Webhook] Challenge Verified Successfully!");
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ error: "Verification token mismatch" });
}

/**
 * WhatsApp Inbound Message Ingestion Webhook
 * POST /api/v1/webhooks/whatsapp
 */
export async function handleWhatsAppInbound(req, res) {
  try {
    const body = req.body;
    console.log("[WhatsApp Inbound Webhook Received]", JSON.stringify(body).slice(0, 200));

    // Instant 200 OK acknowledgment to Meta
    res.status(200).json({ status: "EVENT_RECEIVED" });

    // Process asynchronous in background
    if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value?.messages) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const fromPhone = normalizePhone(msg.from);
      const textBody = msg.text?.body || "";

      // Store in memory chat thread
      if (!memoryStore.chat_messages) memoryStore.chat_messages = [];
      memoryStore.chat_messages.push({
        id: memoryStore.chat_messages.length + 1,
        institution_id: 1,
        lead_id: 1,
        sender_type: "customer",
        message_type: msg.type || "text",
        content_text: textBody,
        is_delivered: 1,
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[WhatsApp Inbound Error]", err.message);
  }
}
