import { config } from "../config/env.js";
import { normalizePhone } from "../utils/helpers.js";
import { processInboundAiReply } from "../services/whatsappService.js";

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
 * WhatsApp Inbound Message Ingestion Webhook (Meta Official Cloud API)
 * POST /api/v1/webhooks/whatsapp
 */
export async function handleWhatsAppInbound(req, res) {
  try {
    const body = req.body;
    console.log("[WhatsApp Inbound Webhook Received]", JSON.stringify(body).slice(0, 200));

    // Instant 200 OK acknowledgment to Meta (Prevents webhook timeout retries)
    res.status(200).json({ status: "EVENT_RECEIVED" });

    // Process asynchronous in background with anti-ban human delay
    if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value?.messages) {
      const changeVal = body.entry[0].changes[0].value;
      const msg = changeVal.messages[0];
      const contact = changeVal.contacts?.[0];
      const fromPhone = normalizePhone(msg.from);
      const textBody = msg.text?.body || "";
      const customerName = contact?.profile?.name || "Pelanggan";

      // Trigger Autonomous AI CS with anti-ban pacing
      processInboundAiReply({
        fromPhone,
        customerName,
        text: textBody,
        messageId: msg.id,
        institutionId: 1, // Default tenant or resolve via recipient phone
      }).catch((err) => {
        console.error("[WhatsApp Auto-CS Process Error]", err.message);
      });
    }
  } catch (err) {
    console.error("[WhatsApp Inbound Error]", err.message);
  }
}

/**
 * Simulate Inbound WhatsApp Message (Simulator & Sandbox Testing)
 * POST /api/v1/webhooks/whatsapp/simulate
 */
export async function simulateWhatsAppInbound(req, res, next) {
  try {
    const {
      phone = "+62 812-9876-5432",
      name = "Calon Pembeli",
      message = "Halo min, kemeja batik tulis sutra apakah masih ready?",
      institution_id = 1,
    } = req.body;

    const result = await processInboundAiReply({
      fromPhone: phone,
      customerName: name,
      text: message,
      messageId: `sim_${Date.now()}`,
      institutionId: parseInt(institution_id, 10),
    });

    res.json({
      success: true,
      message: "Simulasi pesan WhatsApp berhasil diproses oleh AI CS.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
