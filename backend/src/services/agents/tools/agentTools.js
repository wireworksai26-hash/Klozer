import { z } from "zod";
import { queryOne } from "../../../config/db.js";
import { generateAiCsResponse } from "../../aiBrainService.js";
import { normalizeForMatch } from "../../handoff/handoffPolicy.js";
import { recordTokenUsage } from "../../tokenService.js";
import { getAgentSettings } from "../agentRepository.js";
import { applySwitch } from "../agentSwitch.js";
import { ToolError } from "./toolError.js";

/** Asking another agent, or handing the chat to it. Both only see the shop's own active agents other than the caller. */

export const MAX_CONSULTS_PER_TURN = 2;

function findAgent(others, name) {
  const wanted = normalizeForMatch(name);
  const found = others.find((a) => normalizeForMatch(a.name) === wanted);
  if (!found) throw new ToolError(`Tidak ada agen bernama "${name}". Yang ada: ${others.map((a) => a.name).join(", ")}.`);
  return found;
}

/** Another agent answers a question for the caller (with its own role and documents, and without tools of its own). The customer never sees this. */
export const consultAgent = {
  name: "consult_agent",
  schema: z.object({ agent: z.string().trim().min(1).max(80), question: z.string().trim().min(3).max(500) }),
  async run({ agent: name, question }, { institutionId, others, counters }) {
    if (counters.consult >= MAX_CONSULTS_PER_TURN) throw new ToolError("Sudah terlalu sering bertanya ke agen lain untuk balasan ini.");
    const target = findAgent(others, name);
    counters.consult++;
    const answer = await generateAiCsResponse({ institutionId, messageText: question, history: [], agent: target, consult: true });
    if (answer.usage && (answer.usage.promptTokens || answer.usage.completionTokens)) {
      await recordTokenUsage({ institutionId, model: answer.modelUsed || "unknown", usageType: "agent_consult", promptTokens: answer.usage.promptTokens ?? 0, completionTokens: answer.usage.completionTokens ?? 0, latencyMs: answer.latencyMs ?? 0 }).catch(() => {});
    }
    if (!answer.replyText || answer.needsEscalation) throw new ToolError(`${target.name} tidak bisa menjawab pertanyaan itu.`);
    return { agent: target.name, answer: answer.replyText.slice(0, 800) };
  },
};

/** The conversation continues with another agent from the customer's next message, unless staff fixed it on one. */
export const transferToAgent = {
  name: "transfer_to_agent",
  schema: z.object({ agent: z.string().trim().min(1).max(80), reason: z.string().trim().max(120).optional() }),
  async run({ agent: name, reason }, { institutionId, leadId, channelId, agent, others, effects }) {
    if (effects.transferredTo) throw new ToolError("Chat ini sudah dipindahkan pada balasan ini.");
    const lead = await queryOne("SELECT id, ai_agent_id, ai_agent_pinned FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
    if (!lead) throw new ToolError("Chat tidak ditemukan.");
    if (lead.ai_agent_pinned) throw new ToolError("Chat ini dikunci staf pada agen tertentu, tidak bisa dipindahkan.");
    const target = findAgent(others, name);
    const settings = await getAgentSettings(institutionId);
    await applySwitch({ institutionId, channelId, lead, fromAgent: agent, toAgent: target, method: "tool", reason: `dipindahkan oleh ${agent.name}${reason ? `: ${reason}` : ""}`, announce: settings.announceSwitch });
    effects.transferredTo = target.name;
    return { message: `Chat dipindahkan ke ${target.name}; pesan berikutnya ditangani agen itu. Beri tahu pelanggan singkat bahwa rekan kami akan membantu.` };
  },
};
