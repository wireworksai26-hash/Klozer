import { query } from "../../../config/db.js";
import { logger } from "../../../config/logger.js";
import { DEFAULT_SKIP_KEYS, deepSanitize } from "../../../utils/sanitize.js";
import { tenantFeatures } from "../../featureFlags.js";
import { listAgents } from "../agentRepository.js";
import { AGENT_TOOLS, TOOL_NAMES } from "./toolCatalog.js";
import { ToolError } from "./toolError.js";
import { buildToolsBlock, formatToolResults } from "./toolProtocol.js";
import { TOOLS } from "./registry.js";

/**
 * What an agent really gets to do in one reply. The owner picks the tools per agent (none by default); this decides which
 * of them work right now (package switches, other agents existing), runs each request after checking it, caps how much
 * one reply can do, and writes every attempt down.
 */

/** Rounds of "model asks, tool answers" in one reply, and tool requests in all of them. */
export const MAX_ROUNDS = 3;
export const MAX_CALLS_PER_TURN = 6;

const compact = (value) => {
  const json = JSON.stringify(value ?? null);
  return json.length > 2000 ? JSON.stringify({ truncated: true, preview: json.slice(0, 300) }) : json;
};

async function logCall({ institutionId, leadId, agentId, tool, args, result, ok, error, durationMs }) {
  try {
    await query(
      "INSERT INTO agent_tool_calls (institution_id, lead_id, agent_id, tool, args_json, result_json, ok, error, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [institutionId, leadId, agentId, String(tool).slice(0, 40), compact(args), result === undefined ? null : compact(result), ok ? 1 : 0, error ? String(error).slice(0, 240) : null, durationMs]
    );
  } catch (err) {
    logger.warn({ err: err.message, tool }, "Tool call was not recorded");
  }
}

const describeIssues = (error) => (error.issues ?? []).map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("; ") || "argumen tidak valid";

/**
 * @returns {Promise<null | { block: string, maxRounds: number, effects: object, execute: Function, summary: Function }>} null when this agent has no tool that works right now
 */
export async function createToolSession({ ctx, agent }) {
  const wanted = (agent?.capabilities?.tools ?? []).filter((name) => TOOL_NAMES.includes(name));
  if (!wanted.length) return null;

  const features = await tenantFeatures(ctx.institutionId);
  if (features.agentTools === false) return null;

  let names = wanted.filter((name) => !(name === "create_task" && features.tasks === false));
  let others = [];
  if (names.some((name) => AGENT_TOOLS.includes(name))) {
    others = features.multiAgent === false ? [] : (await listAgents(ctx.institutionId, { activeOnly: true })).filter((a) => a.id !== agent.id);
    if (!others.length) names = names.filter((name) => !AGENT_TOOLS.includes(name));
  }
  if (!names.length) return null;

  const effects = { handoffReason: null, transferredTo: null };
  const tctx = { institutionId: ctx.institutionId, leadId: ctx.leadId, channelId: ctx.channelId ?? null, agent, others, effects, counters: { consult: 0 } };
  const made = [];

  async function runOne(call) {
    const started = Date.now();
    const finish = async (ok, payload) => {
      const durationMs = Date.now() - started;
      made.push({ name: call.name, ok });
      await logCall({ institutionId: ctx.institutionId, leadId: ctx.leadId, agentId: agent.id, tool: call.name, args: call.args, result: ok ? payload : undefined, ok, error: ok ? null : payload, durationMs });
      return ok ? { name: call.name, ok: true, data: payload } : { name: call.name, ok: false, error: payload };
    };

    if (made.length >= MAX_CALLS_PER_TURN) return finish(false, "Batas pemakaian alat untuk balasan ini sudah tercapai.");
    const tool = TOOLS[call.name];
    if (!tool || !names.includes(call.name)) return finish(false, "Alat ini tidak tersedia untukmu.");

    const parsed = tool.schema.safeParse(deepSanitize(call.args, DEFAULT_SKIP_KEYS));
    if (!parsed.success) return finish(false, `Argumen tidak valid (${describeIssues(parsed.error)}).`);
    try {
      return await finish(true, await tool.run(parsed.data, tctx));
    } catch (err) {
      if (err instanceof ToolError) return finish(false, err.message);
      logger.warn({ err: err.message, tool: call.name, institutionId: ctx.institutionId }, "Agent tool failed");
      return finish(false, "Alat gagal dijalankan. Jawab pelanggan tanpa hasil ini dan jangan mengarang.");
    }
  }

  return {
    block: buildToolsBlock(names),
    maxRounds: MAX_ROUNDS,
    effects,
    /** @param {{ calls: { name: string, args: object }[], problems: string[] }} parsed from parseToolCalls */
    async execute({ calls, problems = [] }) {
      const results = [];
      for (const call of calls) results.push(await runOne(call)); // in order: a later call may depend on an earlier one's effect
      return formatToolResults(results, problems);
    },
    summary: () => made.slice(),
  };
}
