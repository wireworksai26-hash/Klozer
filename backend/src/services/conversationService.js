import { query, queryOne, retryOnDeadlock } from "../config/db.js";
import { isTest } from "../config/env.js";
import { logger } from "../config/logger.js";
import { parseJsonColumn } from "../utils/jsonColumn.js";
import { emitToTenant } from "../realtime.js";
import { generateAiCsResponse } from "./aiBrainService.js";
import { getAdapter } from "./channels/adapters/index.js";
import { downloadMedia, lookupProfileName, markRead, sendText } from "./channels/channelService.js";
import { detectHandoff, handoffReply, isHumanHolding } from "./handoff/handoffPolicy.js";
import { handBack, startHandoff } from "./handoff/handoffService.js";
import { handleCustomerPaymentProof } from "./paymentProofService.js";
import { handleCommerceTurn } from "./commerce/chatCommerceService.js";
import { onCustomerActivity } from "./followup/followupService.js";
import { recordAdReferral } from "./ads/attribution.js";
import { routeConversation } from "./agents/agentRouting.js";
import { emitEvent } from "./integrations/eventBus.js";
import { loadContactPayload, messagePayload } from "./integrations/eventPayloads.js";
import { recordOptOutFromChat } from "./broadcast/consentService.js";
import { markBroadcastReply } from "./broadcast/deliveryStatus.js";
import { isOptOut } from "./commerce/purchaseIntent.js";
import { optOutText } from "./commerce/messages.js";
import { ensureAssigned } from "./routing/assignmentService.js";
import { getRoutingSettings } from "./routing/routingSettings.js";
import { assertTokenQuota, estimateTokens, recordTokenUsage } from "./tokenService.js";

/**
 * What happens when a customer writes, on any channel: find or create the contact, keep the message, give the
 * conversation to an agent, and decide who answers (the AI, or a person when the customer asked for one, the AI is
 * switched off, or someone already took over). Channel specifics (how to send, how to fetch media) stay in the
 * channel adapters.
 */

/**
 * Human-like delay before an automated reply. Instant uniform replies are a
 * known WhatsApp spam signal. 3.0s - 6.8s depending on reply length.
 */
export function calculateHumanPacingDelay(text = "", channelType = "whatsapp") {
  const reading = 1200 + Math.floor(Math.random() * 800);
  const typing = (text.length || 20) * (18 + Math.floor(Math.random() * 12));
  const jitter = Math.floor(Math.random() * 1000);
  const total = reading + typing + jitter;
  // a visitor watching a chat window on a website expects an answer sooner than someone waiting in a messaging app
  return channelType === "webchat" ? Math.min(3500, Math.max(1500, total)) : Math.min(6800, Math.max(3000, total));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** How the assistant refers to the place it is chatting on. */
const CHANNEL_LABELS = { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", telegram: "Telegram", webchat: "live chat website" };

/**
 * Create the contact or refresh it. A contact is one person on one channel type (their number, handle or chat id).
 * @returns {Promise<{ leadId: number, created: boolean }>}
 */
async function upsertLead({ institutionId, channelId, channelType, contactId, name }) {
  const phone = channelType === "whatsapp" ? contactId : null;
  const known = await queryOne("SELECT id FROM leads WHERE institution_id = ? AND channel_type = ? AND external_id = ?", [institutionId, channelType, contactId]);
  const result = await retryOnDeadlock(() => query(
    `INSERT INTO leads (institution_id, channel_id, channel_type, external_id, phone_number, name, source, status, last_contacted_at, last_inbound_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE last_contacted_at = UTC_TIMESTAMP(), last_inbound_at = UTC_TIMESTAMP(),
                             channel_id = COALESCE(VALUES(channel_id), channel_id),
                             external_id = COALESCE(external_id, VALUES(external_id)),
                             id = LAST_INSERT_ID(id)`,
    [institutionId, channelId, channelType, contactId, phone, name, channelType]
  ));
  return { leadId: result.insertId, created: !known && result.affectedRows === 1 };
}

/** A new contact on a platform that knows their name: replace the placeholder once the platform answers. */
function refreshContactName({ institutionId, channelId, channelType, contactId, leadId }) {
  lookupProfileName({ institutionId, channelId, type: channelType, contactId })
    .then((name) => name && query("UPDATE leads SET name = ? WHERE id = ? AND institution_id = ?", [name.slice(0, 150), leadId, institutionId]))
    .catch((err) => logger.warn({ err: err.message }, "Could not store the customer's name"));
}

/** Keep the AI's or system's outgoing message in the conversation. */
function storeOutgoing({ institutionId, leadId, channelId, sent, text, senderType = "ai_agent", tokens = 0, model = null, meta = null, agentId = null }) {
  return query(
    `INSERT INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, message_type, content_text, tokens_used, model_used, is_delivered, delivery_error, meta_json, ai_agent_id)
     VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?, ?, ?, ?, ?)`,
    [
      institutionId,
      leadId,
      channelId,
      sent.messageId ?? null,
      senderType,
      text,
      tokens,
      model,
      sent.success ? 1 : 0,
      sent.success ? null : String(sent.error).slice(0, 250),
      meta ? JSON.stringify(meta) : null,
      agentId,
    ]
  );
}

/** Send an automated reply the way a person would (after a pause), then record it and tell the dashboards. */
async function reply({ ctx, text, tokens = 0, model = null, meta = null }) {
  if (!isTest) await sleep(calculateHumanPacingDelay(text, ctx.channelType));
  const sent = await sendText({ institutionId: ctx.institutionId, channelId: ctx.channelId, type: ctx.channelType, to: ctx.contactId, text });
  await storeOutgoing({ institutionId: ctx.institutionId, leadId: ctx.leadId, channelId: ctx.channelId, sent, text, tokens, model, meta, agentId: ctx.agentId ?? null });
  emitToTenant(ctx.institutionId, "chat:message", { leadId: ctx.leadId, direction: "outbound", text, sender: "ai_agent" });
  emitEvent({ institutionId: ctx.institutionId, type: "message.sent", data: messagePayload({ contactId: ctx.leadId, channelType: ctx.channelType, direction: "outbound", sender: "ai", text, externalId: sent.messageId ?? null }) });
  return sent;
}

function flagForHuman(ctx, reason) {
  emitToTenant(ctx.institutionId, "chat:needs_human", { leadId: ctx.leadId, reason });
  return { success: true, leadId: ctx.leadId, replied: false, reason };
}

async function agentReachable(userId) {
  if (!userId) return false;
  const agent = await queryOne("SELECT is_online, is_available FROM users WHERE id = ? AND is_active = 1", [userId]);
  return Boolean(agent?.is_online && agent?.is_available);
}

/** Pass the conversation to a person and tell the customer (fixed text, never produced by the model). */
async function handOffWithReply(ctx, reason, assignedTo) {
  await startHandoff({ institutionId: ctx.institutionId, leadId: ctx.leadId, channelId: ctx.channelId, reason });
  const text = handoffReply({ agentAvailable: await agentReachable(assignedTo) });
  const sent = await reply({ ctx, text });
  return { success: true, leadId: ctx.leadId, replied: true, delivered: sent.success, intent: "human_escalation", reason: "handoff" };
}

/**
 * A customer sent a photo or PDF. If the AI is on and no human is already handling the chat, read it as a payment
 * proof and answer with the fixed "thank you" text; the case goes to the dashboard for a person unless it could be
 * verified safely. Otherwise it is only flagged for a person.
 */
async function handlePaymentProofMessage(ctx, { messageId, mediaId, aiAllowed, humanHolding }) {
  if (!aiAllowed || humanHolding) return flagForHuman(ctx, "non_text_message");
  try {
    await assertTokenQuota(ctx.institutionId);
  } catch {
    return flagForHuman(ctx, "token_quota_exhausted");
  }

  let file = null;
  try {
    file = await downloadMedia({ institutionId: ctx.institutionId, channelId: ctx.channelId, type: ctx.channelType, mediaId });
  } catch (err) {
    logger.warn({ err: err.message, institutionId: ctx.institutionId }, "Could not download the customer's media");
  }

  const result = await handleCustomerPaymentProof({ institutionId: ctx.institutionId, leadId: ctx.leadId, mediaId, messageId, file });
  const sent = await reply({
    ctx,
    text: result.replyText,
    tokens: (result.usage?.promptTokens ?? 0) + (result.usage?.completionTokens ?? 0),
    model: result.modelUsed ?? null,
  });

  // A proof that needs checking is a task for a person: mark it as theirs so the AI does not keep chatting meanwhile.
  if (result.outcome !== "auto_approve") await startHandoff({ institutionId: ctx.institutionId, leadId: ctx.leadId, channelId: ctx.channelId, reason: "payment_proof" });

  return { success: true, leadId: ctx.leadId, replied: true, delivered: sent.success, intent: `payment_proof_${result.outcome}`, outcome: result.outcome, reasons: result.reasons };
}

async function answerWithAi(ctx, { customerName, text, lead }) {
  const historyRows = await query(
    `SELECT sender_type, content_text FROM chat_messages
      WHERE lead_id = ? AND institution_id = ? AND content_text IS NOT NULL AND sender_type <> 'system' ORDER BY id DESC LIMIT 10`,
    [ctx.leadId, ctx.institutionId]
  );
  const history = historyRows
    .reverse()
    .slice(0, -1) // the current message is passed separately
    .map((m) => ({ role: m.sender_type === "customer" ? "user" : "assistant", content: m.content_text }));

  // Which of the shop's AI agents answers (none when the shop has not set any up: the assistant then works as it always did).
  const routing = await routeConversation({ ctx, lead, text, history }).catch((err) => {
    logger.error({ err: err.message, leadId: ctx.leadId }, "Agent routing failed; answering without an agent");
    return null;
  });
  const agent = routing?.agent ?? null;
  ctx.agentId = agent?.id ?? null;

  // Taking an order is handled by rules, not by the model: totals, shipping and payment steps are fixed (see chatCommerceService).
  const commerce = await handleCommerceTurn({ ctx, lead, text, customerName, history, mode: agent ? agent.capabilities.commerce : "full" }).catch((err) => {
    logger.error({ err: err.message, leadId: ctx.leadId }, "Order handling failed; the normal assistant answers instead");
    return null;
  });
  if (commerce) {
    const sent = await reply({
      ctx,
      text: commerce.replyText,
      tokens: (commerce.nluUsage?.promptTokens ?? 0) + (commerce.nluUsage?.completionTokens ?? 0),
      model: commerce.model ?? null,
      meta: commerce.meta ?? null,
    });
    if (commerce.handoffReason) await startHandoff({ institutionId: ctx.institutionId, leadId: ctx.leadId, channelId: ctx.channelId, reason: commerce.handoffReason });
    return { success: true, leadId: ctx.leadId, replied: true, delivered: sent.success, intent: "commerce", commerce: commerce.meta?.commerce };
  }

  const ai = await generateAiCsResponse({ institutionId: ctx.institutionId, customerName, customerPhone: ctx.channelType === "whatsapp" ? ctx.contactId : "", messageText: text, history, channelLabel: CHANNEL_LABELS[ctx.channelType], agent });

  if (ai.usage && (ai.usage.promptTokens !== 0 || ai.usage.completionTokens !== 0 || ai.replyText)) {
    await recordTokenUsage({
      institutionId: ctx.institutionId,
      model: ai.modelUsed || "unknown",
      usageType: `${ctx.channelType}_cs`,
      promptTokens: ai.usage?.promptTokens ?? estimateTokens(text) + 400,
      completionTokens: ai.usage?.completionTokens ?? estimateTokens(ai.replyText || ""),
      latencyMs: ai.latencyMs ?? 0,
    }).catch((err) => logger.warn({ err: err.message }, "Token usage not recorded"));
  }

  // No model available: nothing is improvised and nothing is sent. A person is told; the AI is not switched off,
  // so it answers again as soon as a provider is back.
  if (!ai.replyText) return flagForHuman(ctx, ai.intent);

  const sent = await reply({
    ctx,
    text: ai.replyText,
    tokens: (ai.usage?.promptTokens ?? 0) + (ai.usage?.completionTokens ?? 0),
    model: ai.modelUsed ?? null,
    meta: { provider: ai.provider ?? null, fallbackUsed: Boolean(ai.fallbackUsed), sources: ai.sources ?? [], correctionIds: ai.correctionIds ?? [], agent: agent ? { id: agent.id, name: agent.name } : null },
  });

  // The model's own reply already told the customer a person will follow up; now the conversation really goes to one.
  if (ai.needsEscalation) await startHandoff({ institutionId: ctx.institutionId, leadId: ctx.leadId, channelId: ctx.channelId, reason: "guardrail" });

  return { success: true, leadId: ctx.leadId, replied: true, delivered: sent.success, modelUsed: ai.modelUsed, intent: ai.intent };
}

/**
 * Process one incoming customer message.
 * @param {object} p
 * @param {number} p.institutionId
 * @param {{ id: number, aiEnabled: boolean }|null} [p.channel] the account it arrived on (null: the tenant's default of that type)
 * @param {string} [p.channelType]
 * @param {string} p.contactId the customer's id on that channel (a phone number for WhatsApp)
 * @param {string} [p.messageType] text | image | document_receipt | voice_note
 * @param {object|null} [p.referral] the Click-to-WhatsApp ad this first message came from, when there is one
 */
export async function handleInbound({ institutionId, channel = null, channelType = "whatsapp", contactId, contactName = "Pelanggan", text = "", messageId = null, messageType = "text", mediaId = null, referral = null }) {
  const contact = getAdapter(channelType).normalizeContactId(contactId);
  if (!contact) return { success: false, reason: "invalid_phone" };
  const channelId = channel?.id ?? null;

  const { leadId, created } = await upsertLead({ institutionId, channelId, channelType, contactId: contact, name: contactName });
  const ctx = { institutionId, leadId, channelId, channelType, contactId: contact };

  if (created && contactName === "Pelanggan") refreshContactName({ institutionId, channelId, channelType, contactId: contact, leadId });

  const stored = await query(
    `INSERT IGNORE INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, message_type, content_text)
     VALUES (?, ?, ?, ?, 'customer', ?, ?)`,
    [institutionId, leadId, channelId, messageId, messageType, text || null]
  );
  if (stored.affectedRows === 0) {
    logger.warn(
      { event: "WEBHOOK_DUPLICATE_IGNORED", provider: channelType, messageId, institutionId, leadId },
      "[SECURITY] Duplicate incoming message ignored (message id already stored)."
    );
    return { success: true, duplicate: true, leadId };
  }

  emitToTenant(institutionId, "chat:message", { leadId, direction: "inbound", text, messageType });
  if (created) emitEvent({ institutionId, type: "contact.created", data: () => loadContactPayload(institutionId, leadId) });
  emitEvent({ institutionId, type: "message.received", data: messagePayload({ contactId: leadId, channelType, direction: "inbound", sender: "customer", type: messageType, text: text || null, externalId: messageId }) });
  if (messageId) markRead({ institutionId, channelId, type: channelType, messageId }).catch(() => {});

  const lead = await queryOne("SELECT id, name, status, channel_id, assigned_cs_id, handled_by, handoff_at, ai_agent_id, ai_agent_pinned FROM leads WHERE id = ?", [leadId]);
  ctx.channelId = ctx.channelId ?? lead.channel_id; // replies leave from the account the conversation is on

  // Bookkeeping that must never get in the way of answering: which ad brought them, and whether this answers a campaign.
  if (referral) await recordAdReferral({ institutionId, leadId, referral, leadIsNew: created }).catch((err) => logger.warn({ err: err.message, leadId }, "Ad attribution failed"));
  await markBroadcastReply({ leadId, institutionId }).catch((err) => logger.warn({ err: err.message, leadId }, "Broadcast reply not recorded"));

  // The customer is talking: reminders planned earlier are moot (and restart from now if something is still open).
  await onCustomerActivity({ institutionId, leadId }).catch((err) => logger.warn({ err: err.message, leadId }, "Reminder bookkeeping failed"));
  const settings = await getRoutingSettings(institutionId);

  // Every conversation gets an agent (or waits in the queue), whoever ends up answering the customer.
  const assignment = await ensureAssigned({ institutionId, lead }).catch((err) => {
    logger.error({ err: err.message, institutionId, leadId }, "Assignment failed");
    return { userId: lead.assigned_cs_id };
  });

  // A person who stopped replying hands the conversation back to the AI after the hold time.
  const humanHolding = isHumanHolding(lead, settings.humanHoldMinutes);
  if (lead.handled_by === "human" && !humanHolding) await handBack({ institutionId, leadId, reason: "expired" });

  const inst = await queryOne("SELECT features_json FROM institutions WHERE id = ? AND is_active = 1", [institutionId]);
  const aiAllowed = Boolean(inst) && parseJsonColumn(inst.features_json).personaAi !== false && channel?.aiEnabled !== false;

  // Media / non-text. A photo or PDF may be a payment proof: read it. Anything else (voice notes, ...) goes to a person.
  if (messageType !== "text" || !text.trim()) {
    if ((messageType === "image" || messageType === "document_receipt") && mediaId) {
      return handlePaymentProofMessage(ctx, { messageId, mediaId, aiAllowed, humanHolding });
    }
    emitToTenant(institutionId, "chat:needs_human", { leadId, reason: "non_text_message" });
    return { success: true, leadId, replied: false, reason: "non_text" };
  }

  // "stop" ends reminders and promotions for good, whoever is answering and whatever else is going on
  if (isOptOut(text)) {
    await recordOptOutFromChat({ institutionId, leadId });
    if (!aiAllowed || humanHolding) return { success: true, leadId, replied: false, reason: "opted_out" };
    const sent = await reply({ ctx, text: optOutText() });
    return { success: true, leadId, replied: true, delivered: sent.success, intent: "opt_out" };
  }

  if (!aiAllowed) return { success: true, leadId, replied: false, reason: "ai_disabled" };
  if (humanHolding) return { success: true, leadId, replied: false, reason: "human_active" };

  const keyword = detectHandoff(text, settings.handoffKeywords);
  if (keyword) return handOffWithReply(ctx, `keyword:${keyword}`, assignment.userId);

  try {
    await assertTokenQuota(institutionId);
  } catch {
    return flagForHuman(ctx, "token_quota_exhausted");
  }

  return answerWithAi(ctx, { customerName: contactName, text, lead });
}
