import { query } from "../config/db.js";
import { logger } from "../config/logger.js";

/**
 * Record a security- or finance-relevant action. Failures are logged and
 * swallowed: an audit write must never break the request that triggered it.
 */
export async function audit(req, action, { entityType = null, entityId = null, metadata = null, institutionId = null, userId = null } = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (institution_id, user_id, action, entity_type, entity_id, ip_address, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        institutionId ?? req?.tenantId ?? req?.user?.institution_id ?? null,
        userId ?? req?.user?.id ?? null,
        action,
        entityType,
        entityId === null ? null : String(entityId),
        req?.ip ?? null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    logger.warn({ err: err.message, action }, "Audit log write failed");
  }
}
