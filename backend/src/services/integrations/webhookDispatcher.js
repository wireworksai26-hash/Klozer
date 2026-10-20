import { query, queryOne } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { emitToTenant } from "../../realtime.js";
import { decryptSecret } from "../../utils/crypto.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { invalidateEndpoints } from "./eventBus.js";
import { postJson } from "./safeHttp.js";
import { signPayload } from "./signing.js";

/**
 * Delivering queued events. An attempt succeeds on any 2xx answer. A failed attempt is tried again after a growing wait,
 * up to MAX_ATTEMPTS, then the delivery is given up on ("dead") and can be replayed by hand. An endpoint that fails
 * over and over is switched off, so a receiver that is gone does not keep consuming worker time.
 */

/** Seconds to wait after the 1st, 2nd, ... failed attempt. */
export const BACKOFF_SECONDS = Object.freeze([60, 300, 1800, 7200, 21600, 86400]);
export const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1;
export const DISABLE_AFTER_FAILURES = 25;
const STALE_SENDING_MINUTES = 5;

const text = (v, max) => (v === null || v === undefined ? null : String(v).slice(0, max));

/** When to try again after `attempts` failed attempts, or null when it is time to give up. */
export function nextAttemptAt(attempts, now = new Date()) {
  const wait = BACKOFF_SECONDS[attempts - 1];
  return wait === undefined ? null : new Date(now.getTime() + wait * 1000);
}

async function disableEndpoint(endpoint, reason) {
  const done = await query("UPDATE webhook_endpoints SET is_active = 0, disabled_reason = ? WHERE id = ? AND is_active = 1", [reason.slice(0, 120), endpoint.id]);
  if (done.affectedRows) {
    invalidateEndpoints(endpoint.institution_id);
    emitToTenant(endpoint.institution_id, "integration:webhook_disabled", { endpointId: endpoint.id, reason });
    logger.warn({ endpointId: endpoint.id, reason }, "Webhook endpoint switched off");
  }
}

/**
 * Make the request for one delivery and record what happened.
 * @param {object} delivery a webhook_deliveries row
 * @param {object} endpoint a webhook_endpoints row
 * @param {{ now?: Date, retry?: boolean }} [opts] `retry: false` records a failure as final (the connection test)
 * @returns {Promise<{ ok: boolean, status: number|null, error: string|null, durationMs: number }>}
 */
export async function attemptDelivery(delivery, endpoint, { now = new Date(), retry = true } = {}) {
  const payload = parseJsonColumn(delivery.payload_json, {});
  // what is signed is exactly what is sent
  const body = JSON.stringify(payload);
  const secret = decryptSecret(endpoint.encrypted_secret);
  const signature = signPayload(secret, body, Math.floor(now.getTime() / 1000));
  const attempt = delivery.attempts + 1;

  const result = await postJson({
    url: endpoint.url,
    body,
    headers: {
      "X-Klozer-Event": delivery.event_type,
      "X-Klozer-Event-Id": delivery.event_id,
      "X-Klozer-Delivery": String(delivery.id),
      "X-Klozer-Attempt": String(attempt),
      "X-Klozer-Signature": signature.header,
    },
  });

  const ok = result.status !== null && result.status >= 200 && result.status < 300;
  const error = ok ? null : result.error || `HTTP ${result.status}`;

  if (ok) {
    await query("UPDATE webhook_deliveries SET status = 'delivered', attempts = ?, delivered_at = ?, next_attempt_at = NULL, claimed_at = NULL, last_status_code = ?, last_error = NULL, response_excerpt = ?, duration_ms = ? WHERE id = ?", [attempt, now, result.status, text(result.excerpt, 500), result.durationMs, delivery.id]);
    await query("UPDATE webhook_endpoints SET failure_streak = 0, last_success_at = ? WHERE id = ?", [now, endpoint.id]);
    return { ok: true, status: result.status, error: null, durationMs: result.durationMs };
  }

  const next = retry ? nextAttemptAt(attempt, now) : null;
  await query(
    "UPDATE webhook_deliveries SET status = ?, attempts = ?, next_attempt_at = ?, claimed_at = NULL, last_status_code = ?, last_error = ?, response_excerpt = ?, duration_ms = ? WHERE id = ?",
    [next ? "failed" : "dead", attempt, next, result.status, text(error, 250), text(result.excerpt, 500), result.durationMs, delivery.id]
  );
  await query("UPDATE webhook_endpoints SET failure_streak = failure_streak + 1, last_failure_at = ? WHERE id = ?", [now, endpoint.id]);

  if (result.status === 410) {
    // the receiver says it will never accept these again
    await disableEndpoint(endpoint, "Penerima membalas 410 Gone.");
  } else {
    const row = await queryOne("SELECT failure_streak FROM webhook_endpoints WHERE id = ?", [endpoint.id]);
    if (Number(row?.failure_streak) >= DISABLE_AFTER_FAILURES) await disableEndpoint(endpoint, `${DISABLE_AFTER_FAILURES} kegagalan berturut-turut.`);
  }
  return { ok: false, status: result.status, error, durationMs: result.durationMs };
}

/**
 * One pass: deliver what is due.
 * @returns {Promise<{ delivered: number, failed: number, dropped: number }>}
 */
export async function runWebhookDeliveries({ now = new Date(), institutionId = null, limit = 50, concurrency = 8 } = {}) {
  await query("UPDATE webhook_deliveries SET status = 'failed', claimed_at = NULL, next_attempt_at = ? WHERE status = 'sending' AND claimed_at < ?", [now, new Date(now.getTime() - STALE_SENDING_MINUTES * 60_000)]);

  const due = await query(
    "SELECT * FROM webhook_deliveries WHERE status IN ('pending', 'failed') AND next_attempt_at <= ? AND (? IS NULL OR institution_id = ?) ORDER BY next_attempt_at, id LIMIT ?",
    [now, institutionId, institutionId, limit]
  );
  const tally = { delivered: 0, failed: 0, dropped: 0 };
  const endpoints = new Map();

  let next = 0;
  const worker = async () => {
    while (next < due.length) {
      const delivery = due[next++];
      const claim = await query("UPDATE webhook_deliveries SET status = 'sending', claimed_at = ? WHERE id = ? AND status IN ('pending', 'failed') AND next_attempt_at <= ?", [now, delivery.id, now]);
      if (!claim.affectedRows) continue;
      try {
        if (!endpoints.has(delivery.endpoint_id)) endpoints.set(delivery.endpoint_id, await queryOne("SELECT * FROM webhook_endpoints WHERE id = ?", [delivery.endpoint_id]));
        const endpoint = endpoints.get(delivery.endpoint_id);
        if (!endpoint || !endpoint.is_active) {
          await query("UPDATE webhook_deliveries SET status = 'dead', next_attempt_at = NULL, claimed_at = NULL, last_error = 'Endpoint dimatikan atau dihapus.' WHERE id = ?", [delivery.id]);
          tally.dropped++;
          continue;
        }
        const result = await attemptDelivery(delivery, endpoint, { now });
        tally[result.ok ? "delivered" : "failed"]++;
      } catch (err) {
        logger.error({ err: err.message, deliveryId: delivery.id }, "Webhook delivery crashed");
        await query("UPDATE webhook_deliveries SET status = 'failed', claimed_at = NULL, next_attempt_at = ?, last_error = ? WHERE id = ?", [new Date(now.getTime() + 60_000), text(err.message, 250), delivery.id]);
        tally.failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, due.length) }, worker));
  return tally;
}
