import { query, queryOne } from "../config/db.js";
import { notFound, serviceUnavailable } from "../utils/errors.js";
import { emitToTenant } from "../realtime.js";
import { generateAiCsResponse, generateLandingAiResponse } from "../services/aiBrainService.js";
import { assertTokenQuota, estimateTokens, recordTokenUsage } from "../services/tokenService.js";
import { sendText } from "../services/channels/channelService.js";
import { noteHumanReply } from "../services/handoff/handoffService.js";
import { emitEvent } from "../services/integrations/eventBus.js";
import { messagePayload } from "../services/integrations/eventPayloads.js";

/** GET /chats/:leadId — most recent 200 messages, oldest first. */
export async function getChatMessages(req, res) {
  const lead = await queryOne("SELECT * FROM leads WHERE id = ? AND institution_id = ?", [req.params.leadId, req.tenantId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");

  const messages = await query(
    `SELECT * FROM (
       SELECT * FROM chat_messages WHERE lead_id = ? AND institution_id = ? ORDER BY id DESC LIMIT 200
     ) recent ORDER BY id ASC`,
    [lead.id, req.tenantId]
  );
  res.json({ success: true, data: { lead, messages } });
}

/** POST /chats/send — a person replies to a customer on the channel the conversation is on. */
export async function sendMessage(req, res) {
  const { lead_id, content_text } = req.body;
  const lead = await queryOne("SELECT id, phone_number, external_id, channel_id, channel_type FROM leads WHERE id = ? AND institution_id = ?", [lead_id, req.tenantId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");

  const sent = await sendText({
    institutionId: req.tenantId,
    channelId: lead.channel_id,
    type: lead.channel_type,
    to: lead.external_id ?? lead.phone_number,
    text: content_text,
  });

  const result = await query(
    `INSERT INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, sender_user_id, message_type, content_text, is_delivered, delivery_error)
     VALUES (?, ?, ?, ?, 'cs', ?, 'text', ?, ?, ?)`,
    [req.tenantId, lead.id, lead.channel_id, sent.messageId ?? null, req.user.id, content_text, sent.success ? 1 : 0, sent.success ? null : String(sent.error).slice(0, 250)]
  );
  await query("UPDATE leads SET last_contacted_at = UTC_TIMESTAMP(), status = IF(status = 'new', 'in_progress', status) WHERE id = ?", [lead.id]);
  // From now on a person holds the conversation: the AI stays quiet until the hold runs out or it is handed back.
  await noteHumanReply({ institutionId: req.tenantId, leadId: lead.id, userId: req.user.id });

  const message = await queryOne("SELECT * FROM chat_messages WHERE id = ?", [result.insertId]);
  emitToTenant(req.tenantId, "chat:message", { leadId: lead.id, direction: "outbound", text: content_text, sender: "cs" });
  emitEvent({ institutionId: req.tenantId, type: "message.sent", data: messagePayload({ contactId: lead.id, channelType: lead.channel_type, direction: "outbound", sender: "cs", text: content_text, externalId: sent.messageId ?? null }) });

  res.status(sent.success ? 201 : 202).json({
    success: sent.success,
    message: sent.success ? "Pesan berhasil dikirim." : `Pesan tersimpan tetapi gagal terkirim: ${sent.error}`,
    data: message,
  });
}

/**
 * POST /ai/chat — AI sandbox for signed-in staff. Grounded in the caller's own
 * tenant data, and metered against the tenant's token quota.
 */
export async function aiChatSimulation(req, res) {
  const b = req.body;
  await assertTokenQuota(req.tenantId);

  const ai = await generateAiCsResponse({
    institutionId: req.tenantId,
    customerName: b.customerName || "Pelanggan",
    customerPhone: b.customerPhone || "",
    messageText: b.message,
    history: b.history || [],
    customProducts: b.products || null,
    promos: b.promos || null,
    institutionName: b.institutionName || null,
    sector: b.sector || null,
    address: b.address || null,
    hours: b.hours || null,
  });

  let tokenDeduction = null;
  if (ai.usage && ai.modelUsed) {
    tokenDeduction = await recordTokenUsage({
      institutionId: req.tenantId,
      userId: req.user.id,
      model: ai.modelUsed,
      usageType: "ai_sandbox",
      promptTokens: ai.usage.promptTokens ?? estimateTokens(b.message) + 400,
      completionTokens: ai.usage.completionTokens ?? estimateTokens(ai.replyText || ""),
      latencyMs: ai.latencyMs ?? 0,
    });
  }

  if (!ai.replyText && ai.intent === "llm_unavailable") {
    throw serviceUnavailable("AI sedang tidak tersedia (belum dikonfigurasi atau penyedia sedang gangguan).", { code: "AI_UNAVAILABLE" });
  }

  res.json({ ...ai, tokenDeduction });
}

/** POST /ai/ask — public landing-page assistant (rate limited, not tenant data). */
export async function publicAskAi(req, res) {
  res.json(await generateLandingAiResponse(req.body.question));
}
