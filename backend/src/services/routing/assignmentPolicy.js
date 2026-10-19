/**
 * Who gets the next conversation. Pure functions so the fairness rules can be tested without a database.
 */

export const OPEN_LEAD_STATUSES = Object.freeze(["new", "in_progress", "closing"]);
export const ROUTING_MODES = Object.freeze(["least_busy", "round_robin", "manual"]);

/**
 * May this agent receive conversations right now?
 * An agent who switched themselves to "away" never does; with `onlineOnly` they must also be connected.
 */
export function isEligible(agent, settings) {
  if (!agent.isActive || !agent.isAvailable) return false;
  return settings.onlineOnly ? agent.isOnline : true;
}

const time = (value) => (value ? new Date(value).getTime() : 0); // never assigned sorts first

/**
 * Choose an agent for a new conversation.
 *  - least_busy: fewest open conversations; ties go to whoever was assigned longest ago
 *  - round_robin: whoever was assigned longest ago
 *  - manual: nobody (a manager assigns by hand)
 * Agents already at `maxOpenChats` are skipped. Returns the agent's id, or null when nobody can take it.
 * @param {{ id: number, openChats: number, lastAssignedAt: string|Date|null, isOnline: boolean, isAvailable: boolean, isActive: boolean }[]} agents
 * @param {{ mode: string, onlineOnly: boolean, maxOpenChats: number }} settings
 */
export function pickAgent(agents, settings) {
  if (settings.mode === "manual") return null;
  const candidates = agents.filter((a) => isEligible(a, settings) && a.openChats < settings.maxOpenChats);
  if (candidates.length === 0) return null;

  const byFairness = (a, b) => time(a.lastAssignedAt) - time(b.lastAssignedAt) || a.id - b.id;
  const ordered =
    settings.mode === "round_robin" ? [...candidates].sort(byFairness) : [...candidates].sort((a, b) => a.openChats - b.openChats || byFairness(a, b));
  return ordered[0].id;
}
