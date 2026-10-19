import { query } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { emitToTenant } from "../../realtime.js";
import { drainQueue } from "./assignmentService.js";

/**
 * Who is online. A user is online while at least one dashboard socket is connected; a short grace period covers
 * page reloads and flaky networks. Separately, an agent can switch themselves to "away" (is_available = 0) to stop
 * receiving new conversations without logging out.
 *
 * Socket counts live in this process. Running several backend instances would need a shared store (Redis); one
 * instance, as deployed now, is exact.
 */

export const OFFLINE_GRACE_MS = Number(process.env.PRESENCE_GRACE_MS) || 20_000;

const connections = new Map(); // userId -> open sockets
const offlineTimers = new Map(); // userId -> pending "mark offline"

async function setOnline({ id, institution_id: institutionId }, online) {
  try {
    await query("UPDATE users SET is_online = ?, last_seen_at = UTC_TIMESTAMP() WHERE id = ?", [online ? 1 : 0, id]);
    emitToTenant(institutionId, "presence:changed", { userId: id, online });
    if (online) await drainQueue(institutionId);
  } catch (err) {
    logger.warn({ err: err.message, userId: id }, "Could not update presence");
  }
}

/** A dashboard socket opened for this user. */
export async function userConnected(user) {
  clearTimeout(offlineTimers.get(user.id));
  offlineTimers.delete(user.id);
  const open = (connections.get(user.id) || 0) + 1;
  connections.set(user.id, open);
  if (open === 1) await setOnline(user, true);
}

/** A dashboard socket closed. The user goes offline only after the grace period without a new connection. */
export function userDisconnected(user) {
  const open = Math.max(0, (connections.get(user.id) || 1) - 1);
  if (open > 0) {
    connections.set(user.id, open);
    return;
  }
  connections.delete(user.id);
  const timer = setTimeout(() => {
    offlineTimers.delete(user.id);
    if (!connections.has(user.id)) setOnline(user, false);
  }, OFFLINE_GRACE_MS);
  timer.unref?.();
  offlineTimers.set(user.id, timer);
}

/** An agent switches themselves to available or away. Becoming available hands them waiting conversations. */
export async function setAvailability({ institutionId, userId, available }) {
  await query("UPDATE users SET is_available = ? WHERE id = ? AND institution_id = ?", [available ? 1 : 0, userId, institutionId]);
  emitToTenant(institutionId, "presence:changed", { userId, available });
  if (available) await drainQueue(institutionId);
  return { userId, available };
}

/** At start-up nobody is connected yet: clear flags left behind by a restart or crash. */
export async function resetPresence() {
  await query("UPDATE users SET is_online = 0 WHERE is_online = 1");
}
