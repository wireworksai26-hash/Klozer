import { query } from "../config/db.js";

const STALE_PENDING_MINUTES = 5;

/**
 * Atomically claim an idempotency key. The unique index on
 * webhook_logs.idempotency_key makes INSERT IGNORE the single point of
 * arbitration, so two simultaneous deliveries cannot both proceed.
 *
 * A key is re-claimable when its previous attempt FAILED or has been PENDING
 * longer than STALE_PENDING_MINUTES (the worker crashed mid-way).
 */
export async function claimIdempotencyKey({ key, provider, eventType, payload, institutionId = null }) {
  const inserted = await query(
    `INSERT IGNORE INTO webhook_logs (institution_id, idempotency_key, provider, event_type, payload_json, status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [institutionId, key, provider, eventType, JSON.stringify(payload ?? {})]
  );
  if (inserted.affectedRows === 1) return { claimed: true };

  const reclaimed = await query(
    `UPDATE webhook_logs
        SET status = 'PENDING', error_message = NULL, created_at = UTC_TIMESTAMP()
      WHERE idempotency_key = ?
        AND (status = 'FAILED'
             OR (status = 'PENDING' AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)))`,
    [key, STALE_PENDING_MINUTES]
  );
  if (reclaimed.affectedRows === 1) return { claimed: true };

  const existing = await query("SELECT status, result_json FROM webhook_logs WHERE idempotency_key = ? LIMIT 1", [key]);
  return { claimed: false, status: existing[0]?.status ?? null, previousResult: existing[0]?.result_json ?? null };
}

export async function markIdempotentSuccess(key, result = {}) {
  await query("UPDATE webhook_logs SET status = 'PROCESSED', result_json = ?, processed_at = UTC_TIMESTAMP() WHERE idempotency_key = ?", [
    JSON.stringify(result),
    key,
  ]);
}

export async function markIdempotentFailed(key, errorMessage = "") {
  await query("UPDATE webhook_logs SET status = 'FAILED', error_message = ?, processed_at = UTC_TIMESTAMP() WHERE idempotency_key = ?", [
    String(errorMessage).slice(0, 1000),
    key,
  ]);
}
