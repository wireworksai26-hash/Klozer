import { query, queryOne, transaction } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { COMMERCE_MODES, DEFAULT_CAPABILITIES, normalizeTriggers } from "./agentModel.js";
import { TOOL_NAMES } from "./tools/toolCatalog.js";

/** Storage for AI agents, their knowledge scope, the routing settings and the routing log. */

export const AGENT_LIMITS = Object.freeze({ starter: 2, pro: 6, enterprise: 20 });
export const agentLimitFor = (tier) => AGENT_LIMITS[String(tier || "").toLowerCase()] ?? AGENT_LIMITS.starter;

function toAgent(row, knowledgeDocumentIds = []) {
  const capabilities = { ...DEFAULT_CAPABILITIES, ...parseJsonColumn(row.capabilities_json, {}) };
  if (!COMMERCE_MODES.includes(capabilities.commerce)) capabilities.commerce = "off";
  capabilities.tools = Array.isArray(capabilities.tools) ? [...new Set(capabilities.tools.filter((name) => TOOL_NAMES.includes(name)))] : [];
  return {
    id: row.id,
    institutionId: row.institution_id,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    botName: row.bot_name,
    tone: row.tone,
    greeting: row.greeting,
    capabilities,
    triggers: normalizeTriggers(parseJsonColumn(row.triggers_json, {})),
    priority: row.priority,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    knowledgeDocumentIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function knowledgeByAgent(agentIds) {
  if (!agentIds.length) return new Map();
  const rows = await query("SELECT agent_id, document_id FROM ai_agent_knowledge WHERE agent_id IN (?)", [agentIds]);
  const map = new Map();
  for (const r of rows) map.set(r.agent_id, [...(map.get(r.agent_id) || []), r.document_id]);
  return map;
}

export async function listAgents(institutionId, { activeOnly = false } = {}) {
  const rows = await query(`SELECT * FROM ai_agents WHERE institution_id = ? ${activeOnly ? "AND is_active = 1" : ""} ORDER BY priority DESC, id ASC`, [institutionId]);
  const knowledge = await knowledgeByAgent(rows.map((r) => r.id));
  return rows.map((r) => toAgent(r, knowledge.get(r.id) || []));
}

export async function getAgent(institutionId, id) {
  const row = await queryOne("SELECT * FROM ai_agents WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Agen AI tidak ditemukan.");
  return toAgent(row, (await knowledgeByAgent([row.id])).get(row.id) || []);
}

async function assertDocumentsBelong(tx, institutionId, documentIds) {
  if (!documentIds.length) return;
  const found = await tx.query("SELECT id FROM knowledge_documents WHERE institution_id = ? AND id IN (?)", [institutionId, documentIds]);
  if (found.length !== new Set(documentIds).size) throw badRequest("Ada dokumen pengetahuan yang tidak ditemukan.", { code: "UNKNOWN_DOCUMENT" });
}

async function writeKnowledge(tx, agentId, documentIds) {
  await tx.query("DELETE FROM ai_agent_knowledge WHERE agent_id = ?", [agentId]);
  const unique = [...new Set(documentIds)];
  if (unique.length) await tx.query("INSERT INTO ai_agent_knowledge (agent_id, document_id) VALUES ?", [unique.map((d) => [agentId, d])]);
}

/** The shop has one default agent; making another the default takes it from the first. */
async function clearOtherDefaults(tx, institutionId, exceptId) {
  await tx.query("UPDATE ai_agents SET is_default = 0 WHERE institution_id = ? AND id <> ?", [institutionId, exceptId]);
}

export async function createAgent({ institutionId, name, description, instructions, botName = null, tone = null, greeting = null, capabilities = {}, triggers = {}, priority = 100, isDefault = false, isActive = true, knowledgeDocumentIds = [] }) {
  const inst = await queryOne("SELECT subscription_tier FROM institutions WHERE id = ?", [institutionId]);
  const limit = agentLimitFor(inst?.subscription_tier);

  const id = await transaction(async (tx) => {
    const count = await tx.queryOne("SELECT COUNT(*) AS n FROM ai_agents WHERE institution_id = ?", [institutionId]);
    if (Number(count.n) >= limit) throw conflict(`Paket ${inst?.subscription_tier} dibatasi ${limit} agen AI.`, { code: "AGENT_LIMIT", details: { limit } });
    if (await tx.queryOne("SELECT id FROM ai_agents WHERE institution_id = ? AND name = ?", [institutionId, name])) throw conflict("Sudah ada agen dengan nama ini.", { code: "AGENT_NAME_TAKEN" });
    await assertDocumentsBelong(tx, institutionId, knowledgeDocumentIds);

    const result = await tx.query(
      `INSERT INTO ai_agents (institution_id, name, description, instructions, bot_name, tone, greeting, capabilities_json, triggers_json, priority, is_default, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, name, description, instructions, botName, tone, greeting, JSON.stringify({ ...DEFAULT_CAPABILITIES, ...capabilities }), JSON.stringify(normalizeTriggers(triggers)), priority, isDefault ? 1 : 0, isActive ? 1 : 0]
    );
    await writeKnowledge(tx, result.insertId, knowledgeDocumentIds);
    if (isDefault) await clearOtherDefaults(tx, institutionId, result.insertId);
    return result.insertId;
  });
  return getAgent(institutionId, id);
}

export async function updateAgent({ institutionId, id, ...patch }) {
  await transaction(async (tx) => {
    const row = await tx.queryOne("SELECT * FROM ai_agents WHERE id = ? AND institution_id = ? FOR UPDATE", [id, institutionId]);
    if (!row) throw notFound("Agen AI tidak ditemukan.");

    const sets = [];
    const values = [];
    const set = (column, value) => (sets.push(`${column} = ?`), values.push(value));
    if (patch.name !== undefined) {
      const taken = await tx.queryOne("SELECT id FROM ai_agents WHERE institution_id = ? AND name = ? AND id <> ?", [institutionId, patch.name, id]);
      if (taken) throw conflict("Sudah ada agen dengan nama ini.", { code: "AGENT_NAME_TAKEN" });
      set("name", patch.name);
    }
    for (const [key, column] of [["description", "description"], ["instructions", "instructions"], ["botName", "bot_name"], ["tone", "tone"], ["greeting", "greeting"], ["priority", "priority"]]) {
      if (patch[key] !== undefined) set(column, patch[key]);
    }
    if (patch.capabilities !== undefined) set("capabilities_json", JSON.stringify({ ...DEFAULT_CAPABILITIES, ...parseJsonColumn(row.capabilities_json, {}), ...patch.capabilities }));
    if (patch.triggers !== undefined) set("triggers_json", JSON.stringify(normalizeTriggers(patch.triggers)));
    if (patch.isActive !== undefined) set("is_active", patch.isActive ? 1 : 0);
    if (patch.isDefault !== undefined) set("is_default", patch.isDefault ? 1 : 0);
    if (sets.length) await tx.query(`UPDATE ai_agents SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);

    if (patch.knowledgeDocumentIds !== undefined) {
      await assertDocumentsBelong(tx, institutionId, patch.knowledgeDocumentIds);
      await writeKnowledge(tx, id, patch.knowledgeDocumentIds);
    }
    if (patch.isDefault === true) await clearOtherDefaults(tx, institutionId, id);
  });
  return getAgent(institutionId, id);
}

export async function deleteAgent(institutionId, id) {
  const result = await query("DELETE FROM ai_agents WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!result.affectedRows) throw notFound("Agen AI tidak ditemukan.");
}

/** Replies, ratings and live conversations per agent over the last `days` days. */
export async function agentStats(institutionId, days = 30) {
  const [replies, active] = await Promise.all([
    query(
      `SELECT ai_agent_id AS agent_id, COUNT(*) AS replies, COALESCE(SUM(feedback = 'good'), 0) AS good, COALESCE(SUM(feedback = 'bad'), 0) AS bad, COUNT(DISTINCT lead_id) AS conversations
         FROM chat_messages WHERE institution_id = ? AND ai_agent_id IS NOT NULL AND sender_type = 'ai_agent' AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY) GROUP BY ai_agent_id`,
      [institutionId, days]
    ),
    query("SELECT ai_agent_id AS agent_id, COUNT(*) AS n FROM leads WHERE institution_id = ? AND ai_agent_id IS NOT NULL GROUP BY ai_agent_id", [institutionId]),
  ]);
  const stats = new Map();
  for (const r of replies) stats.set(r.agent_id, { replies: Number(r.replies), good: Number(r.good), bad: Number(r.bad), conversations: Number(r.conversations), currentConversations: 0 });
  for (const a of active) stats.set(a.agent_id, { replies: 0, good: 0, bad: 0, conversations: 0, ...(stats.get(a.agent_id) || {}), currentConversations: Number(a.n) });
  return stats;
}

// ---------------------------------------------------------------- routing settings
export const AGENT_SETTINGS_DEFAULTS = Object.freeze({ routerMode: "rules", switchConfidence: 70, announceSwitch: true });

export async function getAgentSettings(institutionId) {
  const row = await queryOne("SELECT * FROM agent_settings WHERE institution_id = ?", [institutionId]);
  return row ? { routerMode: row.router_mode, switchConfidence: Number(row.switch_confidence), announceSwitch: Boolean(row.announce_switch) } : { ...AGENT_SETTINGS_DEFAULTS };
}

export async function updateAgentSettings(institutionId, patch) {
  const next = { ...(await getAgentSettings(institutionId)) };
  for (const key of Object.keys(AGENT_SETTINGS_DEFAULTS)) if (patch[key] !== undefined) next[key] = patch[key];
  await query(
    `INSERT INTO agent_settings (institution_id, router_mode, switch_confidence, announce_switch) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE router_mode = VALUES(router_mode), switch_confidence = VALUES(switch_confidence), announce_switch = VALUES(announce_switch)`,
    [institutionId, next.routerMode, next.switchConfidence, next.announceSwitch ? 1 : 0]
  );
  return getAgentSettings(institutionId);
}

// ---------------------------------------------------------------- who handles which conversation
/** Staff put a conversation with an agent (`agentId: null` returns it to automatic choice). */
export async function setConversationAgent({ institutionId, leadId, agentId, pinned }) {
  const lead = await queryOne("SELECT id, ai_agent_id FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
  if (agentId !== null) {
    const agent = await queryOne("SELECT id FROM ai_agents WHERE id = ? AND institution_id = ? AND is_active = 1", [agentId, institutionId]);
    if (!agent) throw badRequest("Agen AI tidak ditemukan atau tidak aktif.", { code: "UNKNOWN_AGENT" });
  }
  const isPinned = agentId !== null && Boolean(pinned);
  await query("UPDATE leads SET ai_agent_id = ?, ai_agent_pinned = ? WHERE id = ?", [agentId, isPinned ? 1 : 0, leadId]);
  await logRouting({
    institutionId,
    leadId,
    fromAgentId: lead.ai_agent_id,
    toAgentId: agentId,
    method: "pinned",
    reason: agentId === null ? "dikembalikan ke pemilihan otomatis" : isPinned ? "dikunci oleh staf" : "dipindahkan oleh staf",
  });
  return { leadId, agentId, pinned: isPinned };
}

export async function logRouting({ institutionId, leadId, fromAgentId, toAgentId, method, reason, confidence = null }) {
  await query("INSERT INTO agent_routing_logs (institution_id, lead_id, from_agent_id, to_agent_id, method, reason, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)", [institutionId, leadId, fromAgentId ?? null, toAgentId ?? null, method, String(reason).slice(0, 200), confidence]);
}

export async function listRoutingLogs(institutionId, { leadId = null, limit = 50, offset = 0 } = {}) {
  const rows = await query(
    `SELECT g.*, l.name AS lead_name, a.name AS from_name, b.name AS to_name FROM agent_routing_logs g
       JOIN leads l ON l.id = g.lead_id LEFT JOIN ai_agents a ON a.id = g.from_agent_id LEFT JOIN ai_agents b ON b.id = g.to_agent_id
      WHERE g.institution_id = ? AND (? IS NULL OR g.lead_id = ?) ORDER BY g.id DESC LIMIT ? OFFSET ?`,
    [institutionId, leadId, leadId, limit, offset]
  );
  return rows.map((r) => ({ id: Number(r.id), leadId: r.lead_id, leadName: r.lead_name, from: r.from_name, to: r.to_name, method: r.method, reason: r.reason, confidence: r.confidence, createdAt: r.created_at }));
}

/** What agents did besides answering: each tool request, with what came of it. */
export async function listToolCalls(institutionId, { leadId = null, agentId = null, tool = null, ok = null, limit = 50, offset = 0 } = {}) {
  const rows = await query(
    `SELECT c.*, l.name AS lead_name, a.name AS agent_name FROM agent_tool_calls c
       LEFT JOIN leads l ON l.id = c.lead_id LEFT JOIN ai_agents a ON a.id = c.agent_id
      WHERE c.institution_id = ? AND (? IS NULL OR c.lead_id = ?) AND (? IS NULL OR c.agent_id = ?) AND (? IS NULL OR c.tool = ?) AND (? IS NULL OR c.ok = ?)
      ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    [institutionId, leadId, leadId, agentId, agentId, tool, tool, ok === null ? null : ok ? 1 : 0, ok === null ? null : ok ? 1 : 0, limit, offset]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    leadId: r.lead_id,
    leadName: r.lead_name,
    agentId: r.agent_id,
    agentName: r.agent_name,
    tool: r.tool,
    args: parseJsonColumn(r.args_json, null),
    result: parseJsonColumn(r.result_json, null),
    ok: Boolean(r.ok),
    error: r.error,
    durationMs: r.duration_ms,
    createdAt: r.created_at,
  }));
}
