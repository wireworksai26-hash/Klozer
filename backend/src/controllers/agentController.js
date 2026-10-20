import { audit } from "../services/auditService.js";
import { AGENT_LIMITS, agentLimitFor, agentStats, createAgent, deleteAgent, getAgent, getAgentSettings, listAgents, listRoutingLogs, listToolCalls, setConversationAgent, updateAgent, updateAgentSettings } from "../services/agents/agentRepository.js";
import { TOOL_CATALOG } from "../services/agents/tools/toolCatalog.js";
import { previewRouting } from "../services/agents/agentRouting.js";
import { AGENT_PRESETS } from "../services/agents/presets.js";
import { queryOne } from "../config/db.js";
import { conflict } from "../utils/errors.js";

const idOf = (req) => Number(req.params.id);

const withStats = (agent, stats) => ({ ...agent, stats: stats.get(agent.id) ?? { replies: 0, good: 0, bad: 0, conversations: 0, currentConversations: 0 } });

/** GET /ai/agents: agents with how they are doing, the routing settings and the plan's limit. */
export async function list(req, res) {
  const [agents, stats, settings, inst] = await Promise.all([listAgents(req.tenantId), agentStats(req.tenantId), getAgentSettings(req.tenantId), queryOne("SELECT subscription_tier FROM institutions WHERE id = ?", [req.tenantId])]);
  res.json({ success: true, data: agents.map((a) => withStats(a, stats)), settings, limit: agentLimitFor(inst?.subscription_tier), limits: AGENT_LIMITS });
}

/** GET /ai/agents/:id */
export async function get(req, res) {
  const [agent, stats] = await Promise.all([getAgent(req.tenantId, idOf(req)), agentStats(req.tenantId)]);
  res.json({ success: true, data: withStats(agent, stats) });
}

/** POST /ai/agents */
export async function create(req, res) {
  const agent = await createAgent({ institutionId: req.tenantId, ...req.body });
  await audit(req, "ai_agent.create", { entityType: "ai_agent", entityId: agent.id, metadata: { name: agent.name } });
  res.status(201).json({ success: true, message: "Agen AI dibuat.", data: agent });
}

/** PUT /ai/agents/:id */
export async function update(req, res) {
  const agent = await updateAgent({ institutionId: req.tenantId, id: idOf(req), ...req.body });
  await audit(req, "ai_agent.update", { entityType: "ai_agent", entityId: agent.id, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, data: agent });
}

/** DELETE /ai/agents/:id: conversations it handled go back to automatic choice. */
export async function remove(req, res) {
  await deleteAgent(req.tenantId, idOf(req));
  await audit(req, "ai_agent.delete", { entityType: "ai_agent", entityId: idOf(req) });
  res.json({ success: true, message: "Agen AI dihapus." });
}

/** POST /ai/agents/presets: create the starter set (only into a shop that has no agents yet). */
export async function presets(req, res) {
  if ((await listAgents(req.tenantId)).length) throw conflict("Toko ini sudah punya agen AI. Edit atau hapus yang ada.", { code: "AGENTS_EXIST" });
  const created = [];
  for (const preset of AGENT_PRESETS) created.push(await createAgent({ institutionId: req.tenantId, ...preset }));
  await audit(req, "ai_agent.presets", { entityType: "ai_agent", metadata: { count: created.length } });
  res.status(201).json({ success: true, message: "Agen bawaan dibuat. Sesuaikan petunjuknya dengan toko Anda.", data: created });
}

/** GET /ai/agents/settings and PUT /ai/agents/settings */
export async function getSettings(req, res) {
  res.json({ success: true, data: await getAgentSettings(req.tenantId) });
}
export async function putSettings(req, res) {
  const data = await updateAgentSettings(req.tenantId, req.body);
  await audit(req, "ai_agent.settings", { entityType: "agent_settings", entityId: req.tenantId, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, data });
}

/** POST /ai/agents/route-preview: which agent a message would go to, without sending anything. */
export async function preview(req, res) {
  res.json({ success: true, data: await previewRouting({ institutionId: req.tenantId, ...req.body }) });
}

/** GET /ai/agents/routing-log */
export async function routingLog(req, res) {
  res.json({ success: true, data: await listRoutingLogs(req.tenantId, req.query) });
}

/** GET /ai/agents/tools: what an agent can be allowed to do (for the screen where the owner picks). */
export async function tools(req, res) {
  res.json({ success: true, data: TOOL_CATALOG });
}

/** GET /ai/agents/tool-calls: what agents did besides answering, and how it went. */
export async function toolCalls(req, res) {
  res.json({ success: true, data: await listToolCalls(req.tenantId, req.query) });
}

/** PUT /leads/:id/agent: put a conversation with an agent (pinned: automatic choice stops), or null to release it. */
export async function putConversationAgent(req, res) {
  const data = await setConversationAgent({ institutionId: req.tenantId, leadId: idOf(req), agentId: req.body.agentId, pinned: req.body.pinned });
  res.json({ success: true, data });
}
