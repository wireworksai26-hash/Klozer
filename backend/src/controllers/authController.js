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
import { workspaceOf } from "../services/workspaceService.js";
import { FORGOT_REPLY, dismissRequest, listRequests, requestPasswordReset, resolveRequest } from "../services/passwordResetService.js";

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

/** Columns a tenant's own staff may see; integrations secrets (CAPI token) never leave the server. */
const INSTITUTION_PUBLIC_FIELDS = [
  "id",
  "name",
  "slug",
  "mode",
  "sector",
  "phone_number",
  "email",
  "address",
  "subscription_tier",
  "subscription_expires_at",
  "blast_credit_quota",
  "blast_credits_used",
  "ai_token_quota",
  "ai_tokens_used",
  "features_json",
  "language",
  "meta_pixel_id",
  "ai_persona_json",
  "is_active",
  "created_at",
  "updated_at",
  "owner_name", // the superadmin list adds it with a subquery
];

export function institutionPublic(inst) {
  if (!inst) return null;
  const out = {};
  for (const key of INSTITUTION_PUBLIC_FIELDS) if (inst[key] !== undefined) out[key] = inst[key];
  return out;
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
    // The lock is set from the old count and the counter is cleared at the same time, so keeping an
    // account locked now needs a fresh set of misses instead of one request every 15 minutes.
    await query(
      `UPDATE users
          SET locked_until = IF(failed_login_count >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_until),
              failed_login_count = IF(failed_login_count >= ?, 0, failed_login_count + 1)
        WHERE id = ?`,
      [MAX_FAILED_LOGINS - 1, LOCK_MINUTES, MAX_FAILED_LOGINS - 1, user.id]
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
  res.set("Cache-Control", "no-store");
  res.json({
    success: true,
    message: "Login berhasil.",
    token,
    user: { ...userPayload(user, inst), workspace: await workspaceOf(user) },
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
        sector || (mode === "ngo" ? "NGO" : "Bisnis"),
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

  res.set("Cache-Control", "no-store");
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
  res.json({ success: true, user: { ...userPayload(user, inst), workspace: await workspaceOf(user) }, institution: institutionPublic(inst) });
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

/**
 * POST /auth/forgot-password: asks the Klozer team for a new password. The reply is the same for any email, so the form
 * cannot be used to find out who has an account.
 */
export async function forgotPassword(req, res) {
  const { created } = await requestPasswordReset(req.body.email, req.ip);
  if (created) await audit(req, "auth.password_requested", { metadata: { email: req.body.email }, institutionId: null });
  res.json({ success: true, message: FORGOT_REPLY });
}

/** GET /platform/password-requests (superadmin): the requests with one status, and how many are waiting. */
export async function listPasswordRequests(req, res) {
  res.json({ success: true, ...(await listRequests(req.query)) });
}

/** POST /platform/password-requests/:id/reset (superadmin): sets a new password and returns it once, to hand to the person. */
export async function resolvePasswordRequest(req, res) {
  const { user, password } = await resolveRequest(req.params.id, req.user.id);
  await audit(req, "user.reset_password", { entityType: "user", entityId: user.id, metadata: { via: "forgot_request" } });
  res.json({ success: true, message: "Kata sandi baru dibuat.", credentials: { email: user.email, name: user.name, password } });
}

/** POST /platform/password-requests/:id/dismiss (superadmin): closes a request that is not needed. */
export async function dismissPasswordRequest(req, res) {
  const { email } = await dismissRequest(req.params.id, req.user.id);
  await audit(req, "auth.password_request_dismissed", { metadata: { email } });
  res.json({ success: true, message: "Permintaan ditutup." });
}
