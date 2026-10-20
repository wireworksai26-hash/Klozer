import { query, queryOne } from "../../config/db.js";
import { emitToTenant, emitToUser } from "../../realtime.js";
import { emitEvent } from "../integrations/eventBus.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { OPEN_LEAD_STATUSES, isEligible, pickAgent } from "./assignmentPolicy.js";
import { getRoutingSettings } from "./routingSettings.js";

/**
 * Sharing conversations among agents: automatic assignment, manual assignment, claiming, and handing out the
 * queue when someone comes online. The decision itself is in assignmentPolicy (pure); this file does the
 * database work and the notifications.
 */

const OPEN = OPEN_LEAD_STATUSES.map((s) => `'${s}'`).join(", "); // constants, not user input
const QUEUE_WINDOW_DAYS = 3;
const STAFF_ROLES_FOR_MANUAL_ASSIGNMENT = ["cs", "supervisor", "owner"];

function agentFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    isActive: Boolean(r.is_active),
    isOnline: Boolean(r.is_online),
    isAvailable: Boolean(r.is_available),
    lastAssignedAt: r.last_assigned_at,
    openChats: Number(r.open_chats),
  };
}

/** CS agents of a tenant with how many open conversations each has right now. */
export async function loadAgents(institutionId) {
  const rows = await query(
    `SELECT u.id, u.name, u.is_active, u.is_online, u.is_available, u.last_assigned_at,
            (SELECT COUNT(*) FROM leads l WHERE l.assigned_cs_id = u.id AND l.institution_id = u.institution_id AND l.status IN (${OPEN})) AS open_chats
       FROM users u WHERE u.institution_id = ? AND u.role = 'cs' AND u.is_active = 1 ORDER BY u.id`,
    [institutionId]
  );
  return rows.map(agentFromRow);
}

/** Set the assignee, but only if nobody changed it since we looked (two inbound messages can race). */
async function writeAssignment({ institutionId, leadId, previous, userId, reason }) {
  const result = await query(
    "UPDATE leads SET assigned_cs_id = ?, assigned_at = UTC_TIMESTAMP() WHERE id = ? AND institution_id = ? AND assigned_cs_id <=> ?",
    [userId, leadId, institutionId, previous ?? null]
  );
  if (result.affectedRows === 0) return false;
  await query("UPDATE users SET last_assigned_at = UTC_TIMESTAMP() WHERE id = ? AND institution_id = ?", [userId, institutionId]);
  const payload = { leadId, userId, reason };
  emitToTenant(institutionId, "lead:assigned", payload);
  emitToUser(userId, "lead:assigned", payload);
  emitEvent({ institutionId, type: "conversation.assigned", data: { contact_id: leadId, user_id: userId, reason } });
  return true;
}

/**
 * Make sure a conversation has an agent who can take it.
 *  - a current assignee who is still eligible keeps it
 *  - otherwise the next agent per the tenant's rule is chosen
 *  - nobody available: it waits in the queue (and is handed out when an agent comes online)
 * @param {{ id: number, assigned_cs_id: number|null }} lead
 * @returns {Promise<{ assigned: boolean, userId: number|null, kept?: boolean, queued?: boolean, reason?: string }>}
 */
export async function ensureAssigned({ institutionId, lead }) {
  const settings = await getRoutingSettings(institutionId);
  const current = lead.assigned_cs_id ?? null;
  if (settings.mode === "manual") return { assigned: Boolean(current), userId: current, reason: "manual_mode" };

  const agents = await loadAgents(institutionId);
  if (current) {
    const agent = agents.find((a) => a.id === current);
    if (agent && isEligible(agent, settings)) return { assigned: true, userId: current, kept: true };
    if (!agent) {
      // assigned by hand to a supervisor or owner: that is a decision, not something to override
      const staff = await queryOne("SELECT id FROM users WHERE id = ? AND institution_id = ? AND is_active = 1 AND role <> 'cs'", [current, institutionId]);
      if (staff) return { assigned: true, userId: current, kept: true };
    }
  }

  const userId = pickAgent(agents.filter((a) => a.id !== current), settings);
  if (!userId) {
    emitToTenant(institutionId, "lead:queued", { leadId: lead.id });
    return { assigned: Boolean(current), userId: current, queued: true };
  }
  const written = await writeAssignment({ institutionId, leadId: lead.id, previous: current, userId, reason: current ? "reassigned" : "auto" });
  if (!written) {
    const fresh = await queryOne("SELECT assigned_cs_id FROM leads WHERE id = ? AND institution_id = ?", [lead.id, institutionId]);
    return { assigned: Boolean(fresh?.assigned_cs_id), userId: fresh?.assigned_cs_id ?? null, kept: true };
  }
  lead.assigned_cs_id = userId;
  return { assigned: true, userId };
}

/**
 * Hand waiting conversations to available agents, oldest first, until nobody has room. Runs when an agent
 * comes online or switches back to "available".
 * @returns {Promise<number>} how many conversations were assigned
 */
export async function drainQueue(institutionId, { limit = 50 } = {}) {
  const settings = await getRoutingSettings(institutionId);
  if (settings.mode === "manual") return 0;

  const waiting = await query(
    `SELECT id FROM leads
      WHERE institution_id = ? AND assigned_cs_id IS NULL AND status IN (${OPEN})
        AND COALESCE(last_contacted_at, created_at) >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${QUEUE_WINDOW_DAYS} DAY)
      ORDER BY COALESCE(last_contacted_at, created_at) ASC LIMIT ?`,
    [institutionId, limit]
  );
  if (waiting.length === 0) return 0;

  const agents = await loadAgents(institutionId);
  let assigned = 0;
  for (const lead of waiting) {
    const userId = pickAgent(agents, settings);
    if (!userId) break;
    if (await writeAssignment({ institutionId, leadId: lead.id, previous: null, userId, reason: "queue" })) {
      assigned++;
      const agent = agents.find((a) => a.id === userId);
      agent.openChats += 1;
      agent.lastAssignedAt = new Date();
    }
  }
  return assigned;
}

async function leadOrThrow(institutionId, leadId) {
  const lead = await queryOne("SELECT id, assigned_cs_id FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
  return lead;
}

/**
 * A manager assigns a conversation. `userId: null` lets the tenant's rule choose (and re-runs it even if
 * someone already has the conversation).
 */
export async function assignLead({ institutionId, leadId, userId }) {
  const lead = await leadOrThrow(institutionId, leadId);

  if (userId === null) {
    const agents = await loadAgents(institutionId);
    const settings = await getRoutingSettings(institutionId);
    const chosen = pickAgent(agents.filter((a) => a.id !== lead.assigned_cs_id), { ...settings, mode: settings.mode === "manual" ? "least_busy" : settings.mode });
    if (!chosen) throw conflict("Tidak ada agen yang tersedia saat ini.", { code: "NO_AGENT_AVAILABLE" });
    await writeAssignment({ institutionId, leadId, previous: lead.assigned_cs_id, userId: chosen, reason: "manager_auto" });
    return { userId: chosen };
  }

  const target = await queryOne("SELECT id, role FROM users WHERE id = ? AND institution_id = ? AND is_active = 1", [userId, institutionId]);
  if (!target || !STAFF_ROLES_FOR_MANUAL_ASSIGNMENT.includes(target.role)) throw badRequest("Pengguna tidak valid untuk penugasan.", { code: "INVALID_ASSIGNEE" });
  await writeAssignment({ institutionId, leadId, previous: lead.assigned_cs_id, userId, reason: "manager" });
  return { userId };
}

/** An agent takes a conversation nobody has (or one that is already theirs). */
export async function claimLead({ institutionId, leadId, userId }) {
  const lead = await leadOrThrow(institutionId, leadId);
  if (lead.assigned_cs_id === userId) return { userId, alreadyMine: true };
  if (lead.assigned_cs_id) throw conflict("Percakapan ini sudah ditangani agen lain.", { code: "ALREADY_ASSIGNED" });
  const written = await writeAssignment({ institutionId, leadId, previous: null, userId, reason: "claimed" });
  if (!written) throw conflict("Percakapan ini baru saja diambil agen lain.", { code: "ALREADY_ASSIGNED" });
  return { userId };
}

/** The picture a manager needs: rules, who is online with how much on their plate, and what is waiting. */
export async function routingOverview(institutionId) {
  const [settings, agents, queue] = await Promise.all([
    getRoutingSettings(institutionId),
    loadAgents(institutionId),
    query(
      `SELECT l.id, l.name, l.phone_number, l.channel_type, l.channel_id, COALESCE(l.last_contacted_at, l.created_at) AS waiting_since
         FROM leads l WHERE l.institution_id = ? AND l.assigned_cs_id IS NULL AND l.status IN (${OPEN})
          AND COALESCE(l.last_contacted_at, l.created_at) >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${QUEUE_WINDOW_DAYS} DAY)
        ORDER BY waiting_since ASC LIMIT 30`,
      [institutionId]
    ),
  ]);
  return {
    settings,
    agents: agents.map((a) => ({ ...a, eligible: isEligible(a, settings), atCapacity: a.openChats >= settings.maxOpenChats })),
    queue: queue.map((q) => ({ leadId: q.id, name: q.name, phone: q.phone_number, channelType: q.channel_type, channelId: q.channel_id, waitingSince: q.waiting_since })),
  };
}
