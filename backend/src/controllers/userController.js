import { query, queryOne } from "../config/db.js";
import { generateRandomPassword, hashPassword } from "../utils/crypto.js";
import { conflict, forbidden, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";
import { disconnectUser } from "../realtime.js";

const SAFE_COLUMNS =
  "id, institution_id, name, email, role, phone_number, commission_rate_percent, permissions_json, is_online, is_active, last_login_at, created_at";

/** GET /users — staff of the caller's institution. */
export async function listUsers(req, res) {
  const users = await query(`SELECT ${SAFE_COLUMNS} FROM users WHERE institution_id = ? ORDER BY created_at ASC`, [req.tenantId]);
  res.json({ success: true, items: users, data: users });
}

/** POST /users — create a staff account with a generated password (returned once). */
export async function createUser(req, res) {
  const { name, email, role, phone_number, commission_rate_percent, permissions } = req.body;

  const exists = await queryOne("SELECT id FROM users WHERE email = ?", [email]);
  if (exists) throw conflict("Email sudah terdaftar.");

  const password = generateRandomPassword(12);
  const result = await query(
    `INSERT INTO users (institution_id, name, email, password_hash, role, phone_number, commission_rate_percent, permissions_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId, name, email, await hashPassword(password), role, phone_number ?? null, commission_rate_percent ?? 5, permissions ? JSON.stringify(permissions) : null]
  );

  const user = await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = ?`, [result.insertId]);
  await audit(req, "user.create", { entityType: "user", entityId: user.id, metadata: { role } });

  res.status(201).json({
    success: true,
    message: "Akun staf dibuat. Simpan password sementara ini, tidak akan ditampilkan lagi.",
    data: user,
    credentials: { email, password },
  });
}

async function findStaff(req) {
  const target = await queryOne("SELECT * FROM users WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!target) throw notFound("Pengguna tidak ditemukan.");
  return target;
}

/** PUT /users/:id */
export async function updateUser(req, res) {
  const target = await findStaff(req);
  if (target.role === "owner" && (req.body.role || req.body.is_active === false)) {
    throw forbidden("Akun owner tidak dapat diubah perannya atau dinonaktifkan.");
  }
  if (target.id === req.user.id && req.body.is_active === false) {
    throw forbidden("Anda tidak dapat menonaktifkan akun Anda sendiri.");
  }

  const fields = [];
  const values = [];
  let revoke = false;
  for (const key of ["name", "role", "phone_number", "commission_rate_percent"]) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(req.body[key]);
      if (key === "role" && req.body.role !== target.role) revoke = true;
    }
  }
  if (req.body.permissions !== undefined) {
    fields.push("permissions_json = ?");
    values.push(JSON.stringify(req.body.permissions));
  }
  if (req.body.is_active !== undefined) {
    fields.push("is_active = ?");
    values.push(req.body.is_active ? 1 : 0);
    if (!req.body.is_active) revoke = true;
  }
  if (revoke) fields.push("token_version = token_version + 1");

  if (fields.length) await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, [...values, target.id]);
  if (revoke) disconnectUser(target.id);

  const user = await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = ?`, [target.id]);
  await audit(req, "user.update", { entityType: "user", entityId: target.id, metadata: Object.keys(req.body) });
  res.json({ success: true, message: "Pengguna berhasil diperbarui.", data: user });
}

/** DELETE /users/:id — deactivates instead of deleting so order/commission history stays intact. */
export async function deactivateUser(req, res) {
  const target = await findStaff(req);
  if (target.role === "owner") throw forbidden("Akun owner tidak dapat dinonaktifkan.");
  if (target.id === req.user.id) throw forbidden("Anda tidak dapat menonaktifkan akun Anda sendiri.");

  await query("UPDATE users SET is_active = 0, token_version = token_version + 1 WHERE id = ?", [target.id]);
  disconnectUser(target.id);
  await audit(req, "user.deactivate", { entityType: "user", entityId: target.id });
  res.json({ success: true, message: "Pengguna dinonaktifkan." });
}

/** POST /users/:id/reset-password — owner/supervisor resets a staff password. */
export async function resetUserPassword(req, res) {
  const target = await findStaff(req);
  if (target.role === "owner" && req.user.role !== "superadmin" && target.id !== req.user.id) {
    throw forbidden("Hanya superadmin yang dapat mereset password owner.");
  }
  const password = generateRandomPassword(12);
  await query("UPDATE users SET password_hash = ?, token_version = token_version + 1, failed_login_count = 0, locked_until = NULL WHERE id = ?", [
    await hashPassword(password),
    target.id,
  ]);
  disconnectUser(target.id);
  await audit(req, "user.reset_password", { entityType: "user", entityId: target.id });
  res.json({ success: true, message: "Password direset.", credentials: { email: target.email, password } });
}
