import { query } from "../config/db.js";

/**
 * Idempotency Service
 * Prevents race conditions, double charging, and duplicate order processing on webhooks
 */

/**
 * Check if an idempotency key has already been processed or is currently pending
 * @param {string} idempotencyKey
 * @returns {Promise<{ isDuplicate: boolean, status: string|null, existingResult: any }>}
 */
export async function checkIdempotency(idempotencyKey) {
  if (!idempotencyKey) return { isDuplicate: false, status: null, existingResult: null };

  const rows = await query(
    `SELECT id, status, result_json, error_message, processed_at 
     FROM webhook_logs 
     WHERE idempotency_key = ? 
     LIMIT 1`,
    [idempotencyKey]
  );

  if (!rows || rows.length === 0) {
    return { isDuplicate: false, status: null, existingResult: null };
  }

  const record = rows[0];
  const isDuplicate = record.status === "PROCESSED" || record.status === "PENDING";
  let parsedResult = null;

  try {
    parsedResult = typeof record.result_json === "string" ? JSON.parse(record.result_json) : record.result_json;
  } catch (e) {
    parsedResult = record.result_json;
  }

  return {
    isDuplicate,
    status: record.status,
    existingResult: parsedResult,
  };
}

/**
 * Record the start of an idempotent operation
 */
export async function recordIdempotentStart({
  idempotencyKey,
  provider = "midtrans",
  eventType = "payment.settlement",
  payload = {},
  institutionId = null,
}) {
  const payloadStr = JSON.stringify(payload);
  try {
    await query(
      `INSERT INTO webhook_logs (institution_id, idempotency_key, provider, event_type, payload_json, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')
       ON DUPLICATE KEY UPDATE status = 'PENDING', payload_json = VALUES(payload_json)`,
      [institutionId, idempotencyKey, provider, eventType, payloadStr]
    );
  } catch (err) {
    console.error("[Idempotency] Error recording start:", err.message);
  }
}

/**
 * Mark the idempotent operation as successfully processed
 */
export async function markIdempotentSuccess(idempotencyKey, result = {}) {
  const resultStr = JSON.stringify(result);
  try {
    await query(
      `UPDATE webhook_logs 
       SET status = 'PROCESSED', result_json = ?, processed_at = NOW() 
       WHERE idempotency_key = ?`,
      [resultStr, idempotencyKey]
    );
  } catch (err) {
    console.error("[Idempotency] Error marking success:", err.message);
  }
}

/**
 * Mark the idempotent operation as failed
 */
export async function markIdempotentFailed(idempotencyKey, errorMessage = "") {
  try {
    await query(
      `UPDATE webhook_logs 
       SET status = 'FAILED', error_message = ?, processed_at = NOW() 
       WHERE idempotency_key = ?`,
      [errorMessage, idempotencyKey]
    );
  } catch (err) {
    console.error("[Idempotency] Error marking failed:", err.message);
  }
}
