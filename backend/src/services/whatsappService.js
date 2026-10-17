import { query, queryOne } from "../config/db.js";
import { config, isTest } from "../config/env.js";
import { logger } from "../config/logger.js";
import { decryptSecret } from "../utils/crypto.js";
import { normalizePhone } from "../utils/helpers.js";
import { parseJsonColumn } from "../utils/jsonColumn.js";
import { emitToTenant } from "../realtime.js";
import { generateAiCsResponse } from "./aiBrainService.js";
import { MAX_PROOF_BYTES, PROOF_MIME_TYPES, handleCustomerPaymentProof } from "./paymentProofService.js";
import { assertTokenQuota, estimateTokens, recordTokenUsage } from "./tokenService.js";

const HUMAN_TAKEOVER_MINUTES = 10;

/**
 * Human-like delay before an automated reply. Instant uniform replies are a
 * known WhatsApp spam signal. 3.0s - 6.8s depending on reply length.
 */
export function calculateHumanPacingDelay(text = "") {
  const reading = 1200 + Math.floor(Math.random() * 800);
  const typing = (text.length || 20) * (18 + Math.floor(Math.random() * 12));
  const jitter = Math.floor(Math.random() * 1000);
  return Math.min(6800, Math.max(3000, reading + typing + jitter));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Per-tenant WhatsApp Cloud API credentials (token decrypted on demand). */
export async function getChannel(institutionId) {
  const row = await queryOne(
    "SELECT phone_number_id, display_phone, encrypted_access_token, is_active FROM whatsapp_channels WHERE institution_id = ? AND is_active = 1",
    [institutionId]
  );
  if (!row) return null;
  return { phoneNumberId: row.phone_number_id, displayPhone: row.display_phone, accessToken: decryptSecret(row.encrypted_access_token) };
}

/** Resolve which tenant owns an inbound WhatsApp number. Unknown numbers resolve to null. */
export async function findChannelByPhoneNumberId(phoneNumberId) {
  const row = await queryOne("SELECT institution_id FROM whatsapp_channels WHERE phone_number_id = ? AND is_active = 1", [phoneNumberId]);
  return row ? row.institution_id : null;
}

async function graphPost(channel, body) {
  const url = `https://graph.facebook.com/${config.meta.graphVersion}/${encodeURIComponent(channel.phoneNumberId)}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${channel.accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export async function markWhatsAppMessageRead({ institutionId, messageId }) {
  try {
    const channel = await getChannel(institutionId);
    if (!channel) return { success: false };
    const { ok } = await graphPost(channel, { status: "read", message_id: messageId });
    return { success: ok };
  } catch (err) {
    logger.warn({ err: err.message }, "WhatsApp mark-read failed");
    return { success: false };
  }
}

// Meta serves media from its own hosts only; anything else is refused before a token is sent to it.
const MEDIA_HOST = /(^|\.)(facebook\.com|fbcdn\.net|whatsapp\.net|fbsbx\.com)$/i;

/**
 * Download a media file a customer sent (two calls: the media id gives a short-lived URL, the URL gives the bytes).
 * Returns { buffer, mimeType } or null when the file is missing, too large or not a supported type.
 */
export async function downloadWhatsAppMedia({ institutionId, mediaId }) {
  const channel = await getChannel(institutionId);
  if (!channel || !mediaId) return null;
  const auth = { Authorization: `Bearer ${channel.accessToken}` };

  const metaRes = await fetch(`https://graph.facebook.com/${config.meta.graphVersion}/${encodeURIComponent(mediaId)}`, { headers: auth, signal: AbortSignal.timeout(15000) });
  if (!metaRes.ok) return null;
  const meta = await metaRes.json().catch(() => ({}));
  const mimeType = String(meta.mime_type || "").split(";")[0].trim().toLowerCase();
  if (!PROOF_MIME_TYPES.has(mimeType) || !meta.url) return null;
  if (Number(meta.file_size) > MAX_PROOF_BYTES) return null;

  let host;
  try {
    const url = new URL(meta.url);
    if (url.protocol !== "https:") return null;
    host = url.hostname;
  } catch {
    return null;
  }
  if (!MEDIA_HOST.test(host)) return null;

  const fileRes = await fetch(meta.url, { headers: auth, signal: AbortSignal.timeout(30000) });
  if (!fileRes.ok) return null;
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_PROOF_BYTES) return null;
  return { buffer, mimeType };
}

export async function sendWhatsAppMessage({ institutionId, to, text }) {
  const cleanTo = normalizePhone(to);
  if (!cleanTo || !text) return { success: false, error: "Nomor tujuan dan teks wajib diisi." };

  let channel;
  try {
    channel = await getChannel(institutionId);
  } catch (err) {
    logger.error({ err: err.message, institutionId }, "Cannot read WhatsApp channel credentials");
    return { success: false, error: "Kredensial WhatsApp tidak dapat dibaca." };
  }

  if (!channel) {
    if (config.isProduction) return { success: false, error: "WhatsApp belum dikonfigurasi untuk instansi ini." };
    logger.info({ to: cleanTo }, "[sandbox] WhatsApp message not sent (no channel configured)");
    return { success: true, mode: "sandbox_simulated", to: cleanTo, messageId: null };
  }

  try {
    const { ok, data } = await graphPost(channel, {
      recipient_type: "individual",
      to: cleanTo,
      type: "text",
      text: { preview_url: false, body: text },
    });
    if (!ok) {
      logger.error({ institutionId, error: data?.error }, "WhatsApp Cloud API rejected message");
      return { success: false, error: data?.error?.message || "Ditolak oleh WhatsApp Cloud API." };
    }
    return { success: true, to: cleanTo, messageId: data?.messages?.[0]?.id ?? null };
  } catch (err) {
    logger.error({ err: err.message, institutionId }, "WhatsApp send failed");
    return { success: false, error: "Gagal menghubungi WhatsApp Cloud API." };
  }
}

async function upsertLead(institutionId, phone, name) {
  const result = await query(
    `INSERT INTO leads (institution_id, phone_number, name, source, status, last_contacted_at)
     VALUES (?, ?, ?, 'whatsapp', 'new', UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE last_contacted_at = UTC_TIMESTAMP(), id = LAST_INSERT_ID(id)`,
    [institutionId, phone, name]
  );
  return result.insertId;
}

/**
 * A customer sent a photo or PDF. If the AI is on and no human is already handling the chat, read it as a payment
 * proof and answer with the fixed "thank you" text; the case goes to the dashboard for a person unless it could be
 * verified safely. Otherwise it is only flagged for a person.
 */
async function handlePaymentProofMessage({ institutionId, leadId, phone, messageId, mediaId }) {
  const flagForHuman = (reason) => {
    emitToTenant(institutionId, "chat:needs_human", { leadId, reason });
    return { success: true, leadId, replied: false, reason };
  };

  const inst = await queryOne("SELECT features_json FROM institutions WHERE id = ? AND is_active = 1", [institutionId]);
  if (!inst || parseJsonColumn(inst.features_json).personaAi === false) return flagForHuman("non_text_message");

  const humanActive = await queryOne(
    `SELECT id FROM chat_messages
      WHERE lead_id = ? AND sender_type = 'cs' AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE) LIMIT 1`,
    [leadId, HUMAN_TAKEOVER_MINUTES]
  );
  if (humanActive) return flagForHuman("non_text_message");

  try {
    await assertTokenQuota(institutionId);
  } catch {
    return flagForHuman("token_quota_exhausted");
  }

  let file = null;
  try {
    file = await downloadWhatsAppMedia({ institutionId, mediaId });
  } catch (err) {
    logger.warn({ err: err.message, institutionId }, "Could not download the customer's media");
  }

  const result = await handleCustomerPaymentProof({ institutionId, leadId, mediaId, messageId, file });

  if (!isTest) await sleep(calculateHumanPacingDelay(result.replyText));
  const sent = await sendWhatsAppMessage({ institutionId, to: phone, text: result.replyText });
  await query(
    `INSERT INTO chat_messages (institution_id, lead_id, wa_message_id, sender_type, message_type, content_text, tokens_used, model_used, is_delivered, delivery_error)
     VALUES (?, ?, ?, 'ai_agent', 'text', ?, ?, ?, ?, ?)`,
    [
      institutionId,
      leadId,
      sent.messageId ?? null,
      result.replyText,
      (result.usage?.promptTokens ?? 0) + (result.usage?.completionTokens ?? 0),
      result.modelUsed ?? null,
      sent.success ? 1 : 0,
      sent.success ? null : String(sent.error).slice(0, 250),
    ]
  );
  emitToTenant(institutionId, "chat:message", { leadId, direction: "outbound", text: result.replyText, sender: "ai_agent" });

  return { success: true, leadId, replied: true, delivered: sent.success, intent: `payment_proof_${result.outcome}`, outcome: result.outcome, reasons: result.reasons };
}

export async function processInboundMessage({ institutionId, fromPhone, customerName = "Pelanggan", text = "", messageId = null, messageType = "text", mediaId = null }) {
  const phone = normalizePhone(fromPhone);
  if (!phone) return { success: false, reason: "invalid_phone" };

  const leadId = await upsertLead(institutionId, phone, customerName);

  const stored = await query(
    `INSERT IGNORE INTO chat_messages (institution_id, lead_id, wa_message_id, sender_type, message_type, content_text)
     VALUES (?, ?, ?, 'customer', ?, ?)`,
    [institutionId, leadId, messageId, messageType, text || null]
  );
  if (stored.affectedRows === 0) {
    logger.warn(
      {
        event: "WEBHOOK_DUPLICATE_IGNORED",
        provider: "whatsapp",
        messageId,
        institutionId,
        leadId,
      },
      "[SECURITY] Duplikat pesan WhatsApp diabaikan (wa_message_id sudah ada di database)."
    );
    return { success: true, duplicate: true, leadId };
  }

  emitToTenant(institutionId, "chat:message", { leadId, direction: "inbound", text, messageType });
  if (messageId) markWhatsAppMessageRead({ institutionId, messageId }).catch(() => {});

  // Media / non-text. A photo or PDF may be a payment proof: read it. Anything else (voice notes, ...) goes to a person.
  if (messageType !== "text" || !text.trim()) {
    if ((messageType === "image" || messageType === "document_receipt") && mediaId) {
      return handlePaymentProofMessage({ institutionId, leadId, phone, messageId, mediaId });
    }
    emitToTenant(institutionId, "chat:needs_human", { leadId, reason: "non_text_message" });
    return { success: true, leadId, replied: false, reason: "non_text" };
  }

  const inst = await queryOne("SELECT features_json FROM institutions WHERE id = ? AND is_active = 1", [institutionId]);
  if (!inst || parseJsonColumn(inst.features_json).personaAi === false) return { success: true, leadId, replied: false, reason: "ai_disabled" };

  const humanActive = await queryOne(
    `SELECT id FROM chat_messages
      WHERE lead_id = ? AND sender_type = 'cs' AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE) LIMIT 1`,
    [leadId, HUMAN_TAKEOVER_MINUTES]
  );
  if (humanActive) return { success: true, leadId, replied: false, reason: "human_active" };

  try {
    await assertTokenQuota(institutionId);
  } catch {
    emitToTenant(institutionId, "chat:needs_human", { leadId, reason: "token_quota_exhausted" });
    return { success: true, leadId, replied: false, reason: "token_quota_exhausted" };
  }

  const historyRows = await query(
    `SELECT sender_type, content_text FROM chat_messages
      WHERE lead_id = ? AND institution_id = ? AND content_text IS NOT NULL ORDER BY id DESC LIMIT 10`,
    [leadId, institutionId]
  );
  const history = historyRows
    .reverse()
    .slice(0, -1) // the current message is passed separately
    .map((m) => ({ role: m.sender_type === "customer" ? "user" : "assistant", content: m.content_text }));

  const ai = await generateAiCsResponse({ institutionId, customerName, customerPhone: phone, messageText: text, history });

  if (ai.usage && (ai.usage.promptTokens !== 0 || ai.usage.completionTokens !== 0 || ai.replyText)) {
    await recordTokenUsage({
      institutionId,
      model: ai.modelUsed || "unknown",
      usageType: "whatsapp_cs",
      promptTokens: ai.usage?.promptTokens ?? estimateTokens(text) + 400,
      completionTokens: ai.usage?.completionTokens ?? estimateTokens(ai.replyText || ""),
      latencyMs: ai.latencyMs ?? 0,
    }).catch((err) => logger.warn({ err: err.message }, "Token usage not recorded"));
  }

  if (!ai.replyText) {
    emitToTenant(institutionId, "chat:needs_human", { leadId, reason: ai.intent });
    return { success: true, leadId, replied: false, reason: ai.intent };
  }

  if (!isTest) await sleep(calculateHumanPacingDelay(ai.replyText));
  const sent = await sendWhatsAppMessage({ institutionId, to: phone, text: ai.replyText });

  await query(
    `INSERT INTO chat_messages (institution_id, lead_id, wa_message_id, sender_type, message_type, content_text, tokens_used, model_used, is_delivered, delivery_error)
     VALUES (?, ?, ?, 'ai_agent', 'text', ?, ?, ?, ?, ?)`,
    [
      institutionId,
      leadId,
      sent.messageId ?? null,
      ai.replyText,
      (ai.usage?.promptTokens ?? 0) + (ai.usage?.completionTokens ?? 0),
      ai.modelUsed ?? null,
      sent.success ? 1 : 0,
      sent.success ? null : String(sent.error).slice(0, 250),
    ]
  );
  emitToTenant(institutionId, "chat:message", { leadId, direction: "outbound", text: ai.replyText, sender: "ai_agent" });

  return { success: true, leadId, replied: true, delivered: sent.success, modelUsed: ai.modelUsed, intent: ai.intent };
}
