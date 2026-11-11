import { query, queryOne } from "../config/db.js";
import { generateRandomPassword, hashPassword } from "../utils/crypto.js";
import { conflict, notFound } from "../utils/errors.js";
import { disconnectUser, emitToSuperadmins } from "../realtime.js";

/** What the login page always says, whether or not the email belongs to an account (so it cannot be used to find accounts). */
export const FORGOT_REPLY = "Permintaan dikirim ke admin. Setelah diproses, Anda akan diberi kata sandi baru.";

/**
 * Someone forgot their password. A pending request is recorded for the Klozer team and announced to every team member
 * who has the dashboard open. A second request while one is still waiting does not make a second row.
 * @returns {Promise<{ created: boolean }>} for tests and logs only; the caller never tells the person which case it was.
 */
export async function requestPasswordReset(email, ip) {
  const user = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.institution_id, i.name AS institution_name
       FROM users u JOIN institutions i ON i.id = u.institution_id
      WHERE u.email = ? AND u.is_active = 1`,
    [email]
  );
  if (!user) return { created: false };

  const open = await queryOne("SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pending' LIMIT 1", [user.id]);
  if (open) return { created: false };

  const result = await query("INSERT INTO password_reset_requests (user_id, institution_id, email, requested_ip) VALUES (?, ?, ?, ?)", [
    user.id,
    user.institution_id,
    user.email,
    String(ip ?? "").slice(0, 64) || null,
  ]);
  emitToSuperadmins("password:requested", { id: result.insertId, email: user.email, name: user.name, role: user.role, institutionName: user.institution_name });
  return { created: true };
}

const rowSelect = `
  SELECT r.id, r.status, r.email, r.created_at, r.handled_at,
         u.name AS user_name, u.role AS user_role, u.is_active,
         i.name AS institution_name,
         h.name AS handled_by_name
    FROM password_reset_requests r
    JOIN users u ON u.id = r.user_id
    JOIN institutions i ON i.id = r.institution_id
    LEFT JOIN users h ON h.id = r.handled_by`;

/** The requests with one status (newest first) plus how many are still waiting, for the badge. */
export async function listRequests({ status = "pending", limit = 50 } = {}) {
  const items = await query(`${rowSelect} WHERE r.status = ? ORDER BY r.created_at DESC LIMIT ?`, [status, Number(limit)]);
  return { items, pending: await pendingCount() };
}

export async function pendingCount() {
  return Number((await queryOne("SELECT COUNT(*) AS n FROM password_reset_requests WHERE status = 'pending'"))?.n ?? 0);
}

async function openRequest(id) {
  const row = await queryOne("SELECT * FROM password_reset_requests WHERE id = ?", [id]);
  if (!row) throw notFound("Permintaan tidak ditemukan.");
  if (row.status !== "pending") throw conflict("Permintaan ini sudah diproses.");
  return row;
}

/**
 * The team gives the person a new password: it is set at once, every session of that user ends, a failed-login lock is
 * cleared, and the request is closed. The password is returned once so the team can pass it on; it is never stored in clear.
 */
export async function resolveRequest(id, adminId) {
  const row = await openRequest(id);
  const user = await queryOne("SELECT id, email, name FROM users WHERE id = ?", [row.user_id]);
  if (!user) throw notFound("Akun tidak ditemukan.");
  // Claim the request first: a double click, or two team members at once, hand out one password only.
  const closed = await query("UPDATE password_reset_requests SET status = 'handled', handled_by = ?, handled_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'pending'", [adminId, row.id]);
  if (!closed.affectedRows) throw conflict("Permintaan ini sudah diproses.");
  const password = generateRandomPassword(12);
  await query("UPDATE users SET password_hash = ?, token_version = token_version + 1, failed_login_count = 0, locked_until = NULL WHERE id = ?", [await hashPassword(password), user.id]);
  disconnectUser(user.id);
  return { user, password };
}

/** The request was not needed (the person remembered, or it was not them). Nothing about the account changes. */
export async function dismissRequest(id, adminId) {
  const row = await openRequest(id);
  await query("UPDATE password_reset_requests SET status = 'dismissed', handled_by = ?, handled_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'pending'", [adminId, row.id]);
  return { email: row.email };
}
