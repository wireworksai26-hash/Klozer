import { query } from "../../config/db.js";
import { emitToTenant } from "../../realtime.js";
import { addSystemNote } from "../handoff/handoffService.js";
import { emitEvent } from "../integrations/eventBus.js";
import { logRouting } from "./agentRepository.js";

/**
 * A conversation moves to another agent: remember it on the contact, in the routing log, tell the dashboards and
 * webhooks, and leave a note in the chat for staff. Shared by the routing rules and by an agent passing a chat on.
 * @param {{ id: number, ai_agent_id: number|null }} p.lead
 * @param {{ id: number, name: string }|null} p.fromAgent
 * @param {{ id: number, name: string }|null} p.toAgent
 * @param {boolean} p.announce whether to write the note in the chat (only when there was a previous agent)
 */
export async function applySwitch({ institutionId, channelId = null, lead, fromAgent, toAgent, method, reason, confidence = null, announce = false }) {
  await query("UPDATE leads SET ai_agent_id = ? WHERE id = ?", [toAgent?.id ?? null, lead.id]);
  await logRouting({ institutionId, leadId: lead.id, fromAgentId: lead.ai_agent_id, toAgentId: toAgent?.id ?? null, method, reason, confidence });
  emitToTenant(institutionId, "lead:agent_changed", { leadId: lead.id, agentId: toAgent?.id ?? null });
  emitEvent({ institutionId, type: "conversation.agent_changed", data: { contact_id: lead.id, from_agent: fromAgent?.name ?? null, to_agent: toAgent?.name ?? null, method, reason } });
  if (toAgent && lead.ai_agent_id && announce) {
    await addSystemNote({ institutionId, leadId: lead.id, channelId, text: `Agen AI: ${fromAgent?.name ?? "sebelumnya"} → ${toAgent.name} (${reason}).` });
  }
}
