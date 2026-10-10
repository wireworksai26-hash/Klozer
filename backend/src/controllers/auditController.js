import { query } from "../config/db.js";
import { buildPagination, escapeLike, parsePagination } from "../utils/helpers.js";

/** GET /audit-logs: security and finance relevant actions in the caller's tenant, newest first. */
export async function listAuditLogs(req, res) {
  const paging = parsePagination(req.query, { defaultLimit: 50 });
  const where = ["a.institution_id = ?"];
  const params = [req.tenantId];

  if (req.query.action) {
    where.push("a.action LIKE ?");
    params.push(`${escapeLike(req.query.action)}%`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;

  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM audit_logs a ${clause}`, params);
  const rows = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.ip_address, a.metadata_json, a.created_at,
            u.name AS user_name, u.role AS user_role
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${clause}
      ORDER BY a.id DESC LIMIT ? OFFSET ?`,
    [...params, paging.limit, paging.offset]
  );
  res.json({ success: true, items: rows, pagination: buildPagination(paging, Number(total)) });
}
