import { query, queryOne } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { emitToTenant } from "../../realtime.js";
import { callWithFallback } from "../aiBrainService.js";
import { addSystemNote } from "../handoff/handoffService.js";
import { emitEvent } from "../integrations/eventBus.js";
import { recordTokenUsage } from "../tokenService.js";
import { buildClassifierPrompt, decideAgent, parseClassifierAnswer } from "./agentModel.js";
import { getAgentSettings, listAgents, logRouting } from "./agentRepository.js";

/**
 * Choosing which agent answers a message, and keeping a record of every switch. The decision itself is agentModel's
 * (pure); this file gathers the facts it needs, asks the model only when the tenant chose "smart" routing and the rules
 * did not decide, and writes down what happened.
 */

const OPEN_ORDER = "('waiting_payment', 'paid', 'processing', 'shipped')";

/** Facts about the conversation, read only when some agent's rules look at them. */
async function gatherContext({ agents, lead, ctx, text }) {
  const facts = { text, channelType: ctx.channelType, leadStatus: lead.status };
  if (agents.some((a) => a.triggers.labelIds.length)) facts.labelIds = (await query("SELECT label_id FROM leads_labels_map WHERE lead_id = ?", [lead.id])).map((r) => r.label_id);
  if (agents.some((a) => a.triggers.newContact !== null)) facts.isNewContact = (await query("SELECT id FROM chat_messages WHERE lead_id = ? AND sender_type <> 'system' LIMIT 3", [lead.id])).length <= 1;
  if (agents.some((a) => a.triggers.hasOpenOrder !== null)) facts.hasOpenOrder = Boolean(await queryOne(`SELECT id FROM orders WHERE lead_id = ? AND status IN ${OPEN_ORDER} LIMIT 1`, [lead.id]));
  return facts;
}

async function orderInProgress(institutionId, leadId) {
  return Boolean(await queryOne("SELECT id FROM order_drafts WHERE institution_id = ? AND lead_id = ? AND active = 1 AND JSON_LENGTH(items_json) > 0", [institutionId, leadId]));
}

/** Ask the model which agent fits. Null when it cannot answer (the rules' own fallback then applies). */
async function askModel({ agents, current, text, history, institutionId }) {
  const transcript = history.slice(-4).map((m) => `${m.role === "user" ? "Pelanggan" : "Admin"}: ${m.content}`).join("\n");
  const result = await callWithFallback({
    systemPrompt: buildClassifierPrompt({ agents, currentId: current?.id ?? null }),
    userMessage: `${transcript ? `Obrolan sebelumnya:\n${transcript}\n\n` : ""}Pesan pelanggan:\n"""\n${text}\n"""`,
    temperature: 0.1,
    maxTokens: 80,
  });
  if (!result) return null;
  if (result.usage) {
    await recordTokenUsage({
      institutionId,
      model: result.model || "unknown",
      usageType: "agent_router",
      promptTokens: result.usage.promptTokens ?? 300,
      completionTokens: result.usage.completionTokens ?? 20,
      latencyMs: result.latencyMs ?? 0,
    }).catch((err) => logger.warn({ err: err.message }, "Router token usage not recorded"));
  }
  return parseClassifierAnswer(result.text, agents.filter((a) => a.isActive).map((a) => a.id));
}

/**
 * Decide the agent for this message and, when it changed, record and announce the switch.
 * @returns {Promise<{ agent: object|null, decision: object, switched: boolean }>} `agent` is null when the tenant has no agents (the assistant then works as it always did)
 */
export async function routeConversation({ ctx, lead, text, history = [] }) {
  const agents = await listAgents(ctx.institutionId, { activeOnly: true });
  if (!agents.length) return { agent: null, decision: { agent: null, method: "none", reason: "belum ada agen aktif", confidence: null }, switched: false };

  const settings = await getAgentSettings(ctx.institutionId);
  const current = lead.ai_agent_id ? agents.find((a) => a.id === lead.ai_agent_id) ?? null : null;
  const facts = await gatherContext({ agents, lead, ctx, text });
  const base = { agents, current, pinned: Boolean(lead.ai_agent_pinned), orderInProgress: await orderInProgress(ctx.institutionId, lead.id), ctx: facts, switchConfidence: settings.switchConfidence };

  let decision = decideAgent(base);
  // the model is consulted only when the shop chose it, several agents exist, and nothing firmer decided
  if (settings.routerMode === "smart" && agents.length >= 2 && !decision.ruled && ["sticky", "default"].includes(decision.method)) {
    const smartChoice = await askModel({ agents, current, text, history, institutionId: ctx.institutionId }).catch((err) => {
      logger.warn({ err: err.message }, "Agent router model failed");
      return null;
    });
    if (smartChoice) decision = decideAgent({ ...base, smartChoice });
  }

  const agent = decision.agent;
  const switched = (agent?.id ?? null) !== (lead.ai_agent_id ?? null);
  if (switched) {
    await query("UPDATE leads SET ai_agent_id = ? WHERE id = ?", [agent?.id ?? null, lead.id]);
    await logRouting({ institutionId: ctx.institutionId, leadId: lead.id, fromAgentId: lead.ai_agent_id, toAgentId: agent?.id ?? null, method: decision.method, reason: decision.reason, confidence: decision.confidence });
    emitToTenant(ctx.institutionId, "lead:agent_changed", { leadId: lead.id, agentId: agent?.id ?? null });
    emitEvent({ institutionId: ctx.institutionId, type: "conversation.agent_changed", data: { contact_id: lead.id, from_agent: current?.name ?? null, to_agent: agent?.name ?? null, method: decision.method, reason: decision.reason } });
    if (agent && lead.ai_agent_id && settings.announceSwitch) {
      await addSystemNote({ institutionId: ctx.institutionId, leadId: lead.id, channelId: ctx.channelId, text: `Agen AI: ${current?.name ?? "sebelumnya"} → ${agent.name} (${decision.reason}).` });
    }
  }
  return { agent, decision, switched };
}

/**
 * What the routing would do for a made-up message, without sending anything or asking the model. For trying rules
 * out from the dashboard.
 */
export async function previewRouting({ institutionId, text, channelType = "whatsapp", currentAgentId = null, leadStatus = "new", isNewContact = false, hasOpenOrder = false, orderInProgress: draft = false, labelIds = [] }) {
  const agents = await listAgents(institutionId, { activeOnly: true });
  const settings = await getAgentSettings(institutionId);
  const current = agents.find((a) => a.id === currentAgentId) ?? null;
  const decision = decideAgent({ agents, current, orderInProgress: draft, ctx: { text, channelType, leadStatus, isNewContact, hasOpenOrder, labelIds }, switchConfidence: settings.switchConfidence });
  return {
    agent: decision.agent ? { id: decision.agent.id, name: decision.agent.name } : null,
    method: decision.method,
    reason: decision.reason,
    // in smart mode the model would also be asked when no rule decided
    wouldAskModel: settings.routerMode === "smart" && agents.length >= 2 && !decision.ruled && ["sticky", "default"].includes(decision.method),
  };
}
