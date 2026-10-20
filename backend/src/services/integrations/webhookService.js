import { config } from "../../config/env.js";
import { query, queryOne } from "../../config/db.js";
import { decryptSecret, encryptSecret } from "../../utils/crypto.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { EVENT_TYPES } from "./eventCatalog.js";
import { buildEnvelope, invalidateEndpoints } from "./eventBus.js";
import { integrationLimitsFor } from "./integrationPlans.js";
import { attemptDelivery } from "./webhookDispatcher.js";
import { generateWebhookSecret } from "./signing.js";
import { validateWebhookUrl } from "./urlGuard.js";

/** Managing a tenant's webhook endpoints and looking at what was delivered. */

const SUBSCRIBABLE = EVENT_TYPES.filter((t) => t !== "ping");

/** Only the end of a secret is ever shown again. */
const secretHint = (encrypted) => `whsec_…${decryptSecret(encrypted).slice(-4)}`;

const toPublic = (row) => ({
  id: row.id,
  name: row.name,
  url: row.url,
  events: parseJsonColumn(row.events_json, []),
  isActive: Boolean(row.is_active),
  disabledReason: row.disabled_reason,
  failureStreak: row.failure_streak,
  lastSuccessAt: row.last_success_at,
  lastFailureAt: row.last_failure_at,
  secretHint: secretHint(row.encrypted_secret),
  createdAt: row.created_at,
});

const toDelivery = (r) => ({
  id: Number(r.id),
  endpointId: r.endpoint_id,
  eventId: r.event_id,
  eventType: r.event_type,
  status: r.status,
  attempts: r.attempts,
  nextAttemptAt: r.next_attempt_at,
  statusCode: r.last_status_code,
  error: r.last_error,
  responseExcerpt: r.response_excerpt,
  durationMs: r.duration_ms,
  createdAt: r.created_at,
  deliveredAt: r.delivered_at,
});

function checkUrl(url) {
  const result = validateWebhookUrl(url, { allowPrivate: config.webhooks.allowPrivate, isProduction: config.isProduction });
  if (!result.ok) throw badRequest(result.reason, { code: "INVALID_WEBHOOK_URL" });
}

function checkEvents(events) {
  if (events.includes("*")) return ["*"];
  const unknown = events.filter((e) => !SUBSCRIBABLE.includes(e));
  if (unknown.length) throw badRequest(`Event tidak dikenal: ${unknown.join(", ")}`, { code: "UNKNOWN_EVENT" });
  return [...new Set(events)];
}

async function getRow(institutionId, id) {
  const row = await queryOne("SELECT * FROM webhook_endpoints WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Webhook tidak ditemukan.");
  return row;
}

export async function listEndpoints(institutionId) {
  const rows = await query("SELECT * FROM webhook_endpoints WHERE institution_id = ? ORDER BY id DESC", [institutionId]);
  return rows.map(toPublic);
}

/** @returns {Promise<{ endpoint: object, secret: string }>} the secret is shown only here */
export async function createEndpoint({ institutionId, userId, name, url, events }) {
  checkUrl(url);
  const subscribed = checkEvents(events);
  const inst = await queryOne("SELECT subscription_tier FROM institutions WHERE id = ?", [institutionId]);
  const limit = integrationLimitsFor(inst?.subscription_tier).webhooks;
  const count = await queryOne("SELECT COUNT(*) AS n FROM webhook_endpoints WHERE institution_id = ?", [institutionId]);
  if (Number(count.n) >= limit) throw conflict(`Paket ${inst?.subscription_tier} dibatasi ${limit} webhook. Hapus yang tidak dipakai atau naikkan paket.`, { code: "WEBHOOK_LIMIT", details: { limit } });

  const secret = generateWebhookSecret();
  const result = await query("INSERT INTO webhook_endpoints (institution_id, name, url, encrypted_secret, events_json, created_by) VALUES (?, ?, ?, ?, ?, ?)", [
    institutionId,
    name,
    url,
    encryptSecret(secret),
    JSON.stringify(subscribed),
    userId ?? null,
  ]);
  invalidateEndpoints(institutionId);
  return { endpoint: toPublic(await getRow(institutionId, result.insertId)), secret };
}

export async function updateEndpoint({ institutionId, id, name, url, events, isActive }) {
  await getRow(institutionId, id);
  const sets = [];
  const values = [];
  if (name !== undefined) (sets.push("name = ?"), values.push(name));
  if (url !== undefined) (checkUrl(url), sets.push("url = ?"), values.push(url));
  if (events !== undefined) (sets.push("events_json = ?"), values.push(JSON.stringify(checkEvents(events))));
  if (isActive !== undefined) {
    sets.push("is_active = ?");
    values.push(isActive ? 1 : 0);
    // turning an endpoint back on starts it with a clean record
    if (isActive) sets.push("failure_streak = 0", "disabled_reason = NULL");
  }
  if (sets.length) await query(`UPDATE webhook_endpoints SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  invalidateEndpoints(institutionId);
  return toPublic(await getRow(institutionId, id));
}

export async function deleteEndpoint(institutionId, id) {
  await getRow(institutionId, id);
  await query("DELETE FROM webhook_endpoints WHERE id = ?", [id]);
  invalidateEndpoints(institutionId);
}

/** A new secret; the old one stops working at once. */
export async function rotateSecret(institutionId, id) {
  await getRow(institutionId, id);
  const secret = generateWebhookSecret();
  await query("UPDATE webhook_endpoints SET encrypted_secret = ? WHERE id = ?", [encryptSecret(secret), id]);
  return { endpoint: toPublic(await getRow(institutionId, id)), secret };
}

export async function listDeliveries(institutionId, endpointId, { status, limit = 50, offset = 0 } = {}) {
  await getRow(institutionId, endpointId);
  const where = ["endpoint_id = ?"];
  const params = [endpointId];
  if (status) (where.push("status = ?"), params.push(status));
  const rows = await query(`SELECT * FROM webhook_deliveries WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return rows.map(toDelivery);
}

/** What was sent for one delivery, for debugging a receiver. */
export async function getDeliveryDetail(institutionId, deliveryId) {
  const row = await queryOne("SELECT * FROM webhook_deliveries WHERE id = ? AND institution_id = ?", [deliveryId, institutionId]);
  if (!row) throw notFound("Pengiriman tidak ditemukan.");
  return { ...toDelivery(row), payload: parseJsonColumn(row.payload_json, {}) };
}

/** Send a delivery again from the start (a dead one, or one the receiver wants replayed). */
export async function retryDelivery(institutionId, deliveryId) {
  const row = await queryOne("SELECT d.*, e.is_active FROM webhook_deliveries d JOIN webhook_endpoints e ON e.id = d.endpoint_id WHERE d.id = ? AND d.institution_id = ?", [deliveryId, institutionId]);
  if (!row) throw notFound("Pengiriman tidak ditemukan.");
  if (row.status === "sending") throw conflict("Pengiriman ini sedang diproses.", { code: "DELIVERY_BUSY" });
  if (!row.is_active) throw conflict("Webhook ini sedang mati. Aktifkan dulu.", { code: "ENDPOINT_INACTIVE" });
  await query("UPDATE webhook_deliveries SET status = 'pending', attempts = 0, next_attempt_at = UTC_TIMESTAMP(), last_error = NULL WHERE id = ?", [deliveryId]);
  return toDelivery(await queryOne("SELECT * FROM webhook_deliveries WHERE id = ?", [deliveryId]));
}

/** Send a `ping` to the endpoint right now and report what came back. A failure here is final: it is a test, not an event to retry. */
export async function sendTestEvent(institutionId, id) {
  const endpoint = await getRow(institutionId, id);
  const envelope = buildEnvelope({ type: "ping", institutionId, data: { message: "Koneksi webhook Klozer berhasil diuji." } });
  const created = await query("INSERT INTO webhook_deliveries (institution_id, endpoint_id, event_id, event_type, payload_json, status, attempts, claimed_at) VALUES (?, ?, ?, 'ping', ?, 'sending', 0, UTC_TIMESTAMP())", [
    institutionId,
    id,
    envelope.id,
    JSON.stringify(envelope),
  ]);
  const delivery = await queryOne("SELECT * FROM webhook_deliveries WHERE id = ?", [created.insertId]);
  const result = await attemptDelivery(delivery, endpoint, { retry: false });
  return { ...result, deliveryId: Number(created.insertId) };
}
