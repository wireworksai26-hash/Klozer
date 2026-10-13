import crypto from "crypto";
import { query, queryOne, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { generateToken } from "../middlewares/authMiddleware.js";
import { clearSessionCookie, setSessionCookie } from "../utils/session.js";
import { disconnectUser } from "../realtime.js";
import { comparePassword, dummyPasswordCheck, hashPassword, generateRandomPassword } from "../utils/crypto.js";
import { slugify } from "../utils/helpers.js";
import { DEFAULT_FEATURES } from "../utils/constants.js";
import { AppError, conflict, forbidden, notFound, unauthorized } from "../utils/errors.js";
import { sendTrialCredentialsEmail } from "../services/emailService.js";
import { audit } from "../services/auditService.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export function userPayload(user, inst) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone_number: user.phone_number ?? null,
    institutionId: user.institution_id,
    institutionName: inst?.name ?? null,
    institutionMode: inst?.mode ?? "business",
    sector: inst?.sector ?? null,
  };
}

export function institutionPublic(inst) {
  if (!inst) return null;
  const { ai_tokens_used, ...rest } = inst;
  return { ...rest, ai_tokens_used };
}

/**
 * POST /auth/login
 * Generic failure message for unknown email and wrong password, constant-time
 * work for both, and a temporary lock after repeated failures.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await queryOne("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) {
    await dummyPasswordCheck(password);
    await audit(req, "auth.login_failed", { metadata: { email, reason: "unknown_email" }, institutionId: null });
    throw unauthorized("Email atau password salah.");
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError(429, "Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi nanti.", { code: "ACCOUNT_LOCKED" });
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    // One atomic statement: concurrent wrong guesses each count, so parallel requests cannot dodge the lock.
    // The counter is only reset by a successful login, so after a lock expires each further miss re-locks.
    await query(
      `UPDATE users
          SET failed_login_count = failed_login_count + 1,
              locked_until = IF(failed_login_count >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_until)
        WHERE id = ?`,
      [MAX_FAILED_LOGINS, LOCK_MINUTES, user.id]
    );
    await audit(req, "auth.login_failed", { userId: user.id, institutionId: user.institution_id, metadata: { reason: "bad_password" } });
    throw unauthorized("Email atau password salah.");
  }

  if (!user.is_active) throw forbidden("Akun ini dinonaktifkan. Hubungi administrator toko Anda.");

  const inst = await queryOne("SELECT * FROM institutions WHERE id = ?", [user.institution_id]);
  if (!inst || !inst.is_active) throw forbidden("Instansi Anda dinonaktifkan. Hubungi dukungan Klozer.");

  await query("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP() WHERE id = ?", [user.id]);
  await audit(req, "auth.login", { userId: user.id, institutionId: user.institution_id });

  const token = generateToken(user);
  setSessionCookie(res, token);
  res.json({
    success: true,
    message: "Login berhasil.",
    token,
    user: userPayload(user, inst),
    institution: institutionPublic(inst),
  });
}

async function findFreeSlug(tx, institutionName) {
  const base = slugify(institutionName) || "bisnis";
  for (let attempt = 0; attempt < 12; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${crypto.randomInt(10, 9999)}`;
    const domain = slug.replace(/-/g, "");
    const taken = await tx.queryOne(
      `SELECT (SELECT COUNT(*) FROM institutions WHERE slug = ?) + (SELECT COUNT(*) FROM users WHERE email IN (?, ?, ?)) AS n`,
      [slug, `spv@${domain}.id`, `cs1@${domain}.id`, `cs2@${domain}.id`]
    );
    if (Number(taken.n) === 0) return { slug, domain };
  }
  throw conflict("Tidak dapat membuat identitas unik untuk nama bisnis ini. Coba nama lain.");
}

/**
 * POST /auth/register — self-service tenant signup.
 * Creates the institution plus an owner and two CS accounts with random
 * passwords, all in one transaction. Passwords are returned once.
 */
export async function register(req, res) {
  const { institutionName, sector, mode, ownerName, phone, contactEmail } = req.body;

  const created = await transaction(async (tx) => {
    const { slug, domain } = await findFreeSlug(tx, institutionName);
    const spvEmail = `spv@${domain}.id`;
    const cs1Email = `cs1@${domain}.id`;
    const cs2Email = `cs2@${domain}.id`;

    const instResult = await tx.query(
      `INSERT INTO institutions
         (name, slug, mode, sector, phone_number, email, subscription_tier, blast_credit_quota, ai_token_quota, features_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        institutionName,
        slug,
        mode,
        sector || (mode === "ngo" ? "Lembaga Sosial & Donasi" : "Fashion & Retail"),
        phone || null,
        contactEmail || spvEmail,
        config.trial.tier,
        config.trial.blastCredits,
        config.trial.aiTokens,
        JSON.stringify(DEFAULT_FEATURES),
      ]
    );
    const institutionId = instResult.insertId;

    const accounts = [
      { key: "spv", name: ownerName || `SPV - ${institutionName}`, email: spvEmail, role: "owner", rate: 0, label: "Supervisor / Owner" },
      { key: "cs1", name: `CS 1 - ${institutionName}`, email: cs1Email, role: "cs", rate: 5, label: "Customer Service 1" },
      { key: "cs2", name: `CS 2 - ${institutionName}`, email: cs2Email, role: "cs", rate: 5, label: "Customer Service 2" },
    ];

    const bundle = {};
    let owner = null;
    for (const acc of accounts) {
      const password = generateRandomPassword(12);
      const result = await tx.query(
        `INSERT INTO users (institution_id, name, email, password_hash, role, phone_number, commission_rate_percent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [institutionId, acc.name, acc.email, await hashPassword(password), acc.role, phone || null, acc.rate]
      );
      bundle[acc.key] = { name: acc.name, email: acc.email, password, role: acc.label };
      if (acc.key === "spv") owner = { id: result.insertId, institution_id: institutionId, name: acc.name, email: acc.email, role: "owner", token_version: 0, phone_number: phone || null };
    }

    const institution = await tx.queryOne("SELECT * FROM institutions WHERE id = ?", [institutionId]);
    return { institution, owner, bundle };
  });

  const loginUrl = `${config.frontendUrl}/login`;
  await audit(req, "auth.register", { institutionId: created.institution.id, userId: created.owner.id, metadata: { name: institutionName } });

  if (contactEmail) {
    sendTrialCredentialsEmail({
      to: contactEmail,
      institutionName,
      sector: created.institution.sector,
      owner: created.bundle.spv,
      cs1: created.bundle.cs1,
      cs2: created.bundle.cs2,
      loginUrl,
    }).catch((err) => logger.warn({ err: err.message }, "Credential email failed"));
  }

  res.status(201).json({
    success: true,
    message: "Instansi & kredensial SPV / CS berhasil dibuat. Simpan password ini, tidak akan ditampilkan lagi.",
    token: generateToken(created.owner),
    credentialsBundle: {
      institutionName: created.institution.name,
      sector: created.institution.sector,
      loginUrl,
      ...created.bundle,
    },
    user: userPayload(created.owner, created.institution),
    institution: institutionPublic(created.institution),
  });
}

/** GET /auth/me */
export async function getMe(req, res) {
  const user = await queryOne("SELECT * FROM users WHERE id = ?", [req.user.id]);
  if (!user) throw notFound("Pengguna tidak ditemukan.");
  const inst = await queryOne("SELECT * FROM institutions WHERE id = ?", [user.institution_id]);
  res.json({ success: true, user: userPayload(user, inst), institution: institutionPublic(inst) });
}

/**
 * POST /auth/change-password
 * Bumps token_version so every previously issued token stops working, and
 * returns a fresh token for the current session.
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await queryOne("SELECT * FROM users WHERE id = ?", [req.user.id]);
  if (!user || !(await comparePassword(currentPassword, user.password_hash))) {
    throw unauthorized("Password saat ini salah.");
  }
  if (currentPassword === newPassword) {
    throw new AppError(400, "Password baru harus berbeda dari password saat ini.");
  }

  await query("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?", [
    await hashPassword(newPassword),
    user.id,
  ]);
  await audit(req, "auth.change_password", { entityType: "user", entityId: user.id });

  // Other devices are signed out (their tokens carry the old version); this one gets a fresh session.
  disconnectUser(user.id);
  const fresh = { ...user, token_version: user.token_version + 1 };
  const token = generateToken(fresh);
  setSessionCookie(res, token);
  res.json({ success: true, message: "Password berhasil diubah.", token });
}

/** POST /auth/logout: ends this browser's session. */
export async function logout(req, res) {
  clearSessionCookie(res);
  res.json({ success: true, message: "Anda telah keluar." });
}
