import crypto from "crypto";
import { query } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { matchesSubscription } from "./eventCatalog.js";

/**
 * The one place the rest of the system says "this happened". Each event is written to the outbox
 * (webhook_deliveries) for every endpoint that subscribed to it; a worker delivers them (webhookDispatcher.js).
 * Emitting never throws and costs one cached lookup for a tenant with no webhooks, so it is safe on any code path.
 */

const MAX_PAYLOAD_BYTES = 256 * 1024;
const CACHE_MS = 10_000;
const cache = new Map(); // institutionId -> { at, endpoints }

async function activeEndpoints(institutionId) {
  const hit = cache.get(institutionId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.endpoints;
  const rows = await query("SELECT id, events_json FROM webhook_endpoints WHERE institution_id = ? AND is_active = 1", [institutionId]);
  const endpoints = rows.map((r) => ({ id: r.id, events: parseJsonColumn(r.events_json, []) }));
  cache.set(institutionId, { at: Date.now(), endpoints });
  return endpoints;
}

/** Forget what is cached for a tenant (after its endpoints change, in this process). */
export const invalidateEndpoints = (institutionId) => cache.delete(institutionId);

export const newEventId = () => `evt_${crypto.randomBytes(12).toString("hex")}`;

/** The shape every receiver gets. */
export function buildEnvelope({ id = newEventId(), type, institutionId, data, now = new Date() }) {
  return { id, type, created_at: now.toISOString(), institution_id: institutionId, data };
}

/**
 * @param {object} p
 * @param {number} p.institutionId
 * @param {string} p.type one of EVENT_TYPES
 * @param {object|(() => Promise<object>|object)} p.data the event's data, or a function that builds it (called only when someone is listening)
 * @returns {Promise<number>} how many deliveries were queued
 */
export async function emitEvent({ institutionId, type, data }) {
  try {
    const targets = (await activeEndpoints(institutionId)).filter((e) => matchesSubscription(e.events, type));
    if (!targets.length) return 0;

    const built = typeof data === "function" ? await data() : data;
    if (built === null || built === undefined) return 0;
    let envelope = buildEnvelope({ type, institutionId, data: built });
    if (Buffer.byteLength(JSON.stringify(envelope)) > MAX_PAYLOAD_BYTES) envelope = { ...envelope, data: { truncated: true, note: "Data terlalu besar; ambil lewat API." } };

    const payload = JSON.stringify(envelope);
    await query(
      "INSERT INTO webhook_deliveries (institution_id, endpoint_id, event_id, event_type, payload_json, status, next_attempt_at) VALUES ?",
      [targets.map((t) => [institutionId, t.id, envelope.id, type, payload, "pending", new Date()])]
    );
    return targets.length;
  } catch (err) {
    logger.warn({ err: err.message, type, institutionId }, "Event could not be queued for webhooks");
    return 0;
  }
}
