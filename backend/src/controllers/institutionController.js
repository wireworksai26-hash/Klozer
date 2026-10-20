import { query, queryOne, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { generateRandomPassword, hashPassword } from "../utils/crypto.js";
import { buildPagination, escapeLike, parsePagination, slugify } from "../utils/helpers.js";
import { DEFAULT_FEATURES, TIER_TOKEN_BUNDLE } from "../utils/constants.js";
import { conflict, forbidden, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";
import { disconnectTenant, disconnectUser } from "../realtime.js";
import { institutionPublic } from "./authController.js";

const OWNER_NAME = "(SELECT u.name FROM users u WHERE u.institution_id = i.id AND u.role = 'owner' ORDER BY u.id LIMIT 1) AS owner_name";

/**
 * GET /institutions
 * Superadmin: every tenant, paginated. Everyone else: only their own tenant.
 */
export async function getAllInstitutions(req, res) {
  if (req.user.role !== "superadmin") {
    const own = await queryOne(`SELECT i.*, ${OWNER_NAME} FROM institutions i WHERE i.id = ?`, [req.user.institution_id]);
    const items = own ? [institutionPublic(own)] : [];
    return res.json({
      success: true,
      items,
      pagination: buildPagination({ page: 1, limit: 1 }, items.length),
    });
  }

  const paging = parsePagination(req.query);
  const where = [];
  const params = [];
  if (req.query.search) {
    where.push("(i.name LIKE ? OR i.sector LIKE ?)");
    const like = `%${escapeLike(req.query.search)}%`;
    params.push(like, like);
  }
  if (req.query.mode) {
    where.push("i.mode = ?");
    params.push(req.query.mode);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM institutions i ${clause}`, params);
  const rows = await query(`SELECT i.*, ${OWNER_NAME} FROM institutions i ${clause} ORDER BY i.id ASC LIMIT ? OFFSET ?`, [...params, paging.limit, paging.offset]);

  res.json({ success: true, items: rows.map(institutionPublic), pagination: buildPagination(paging, Number(total)) });
}

/** POST /institutions (superadmin) — creates a tenant plus its owner account. */
export async function createInstitution(req, res) {
  const { name, mode, sector, email, phone_number, address, features } = req.body;

  const emailTaken = await queryOne("SELECT id FROM users WHERE email = ?", [email]);
  if (emailTaken) throw conflict("Email pemilik sudah terdaftar.");

  const baseSlug = slugify(name) || "instansi";
  const password = generateRandomPassword(12);

  const created = await transaction(async (tx) => {
    let slug = baseSlug;
    for (let i = 1; await tx.queryOne("SELECT id FROM institutions WHERE slug = ?", [slug]); i++) {
      slug = `${baseSlug}-${i + 1}`;
    }

    const result = await tx.query(
      `INSERT INTO institutions
         (name, slug, mode, sector, phone_number, email, address, subscription_tier, blast_credit_quota, ai_token_quota, features_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pro', ?, ?, ?)`,
      [
        name,
        slug,
        mode,
        sector || (mode === "ngo" ? "Lembaga Sosial & Donasi" : "Fashion & Retail"),
        phone_number ?? null,
        email,
        address ?? null,
        config.trial.blastCredits * 2,
        TIER_TOKEN_BUNDLE.pro, // created as a Pro shop: it gets the Pro bundle
        JSON.stringify({ ...DEFAULT_FEATURES, ...(features || {}) }),
      ]
    );
    await tx.query(
      `INSERT INTO users (institution_id, name, email, password_hash, role, phone_number, commission_rate_percent)
       VALUES (?, ?, ?, ?, 'owner', ?, 0)`,
      [result.insertId, `Owner ${name}`, email, await hashPassword(password), phone_number ?? null]
    );
    return tx.queryOne("SELECT * FROM institutions WHERE id = ?", [result.insertId]);
  });

  await audit(req, "institution.create", { entityType: "institution", entityId: created.id, institutionId: created.id });

  res.status(201).json({
    success: true,
    message: "Instansi berhasil dibuat dan akun Owner telah di-generate.",
    data: institutionPublic(created),
    credentialsBundle: {
      institutionName: created.name,
      loginUrl: `${config.frontendUrl}/login`,
      email,
      temporaryPassword: password,
      role: "Owner / Supervisor",
    },
  });
}

/**
 * PUT /institutions/:id
 * Owners/supervisors may edit profile fields of their own tenant only.
 * Features, activation, tier and quotas are platform-controlled (superadmin).
 */
export async function updateInstitution(req, res) {
  const id = req.params.id;
  const isSuper = req.user.role === "superadmin";
  if (!isSuper && id !== req.user.institution_id) throw forbidden("Anda hanya dapat mengubah instansi Anda sendiri.");

  const inst = await queryOne("SELECT * FROM institutions WHERE id = ?", [id]);
  if (!inst) throw notFound("Instansi tidak ditemukan.");

  const platformFields = ["is_active", "subscription_tier", "blast_credit_quota", "ai_token_quota"];
  if (!isSuper) {
    const attempted = [...platformFields, "features"].filter((f) => req.body[f] !== undefined);
    if (attempted.length) throw forbidden(`Hanya superadmin yang dapat mengubah: ${attempted.join(", ")}.`);
  }
  if (isSuper && id === req.user.institution_id && req.body.is_active === false) {
    throw forbidden("Instansi platform tidak dapat dinonaktifkan.");
  }

  const sets = [];
  const values = [];
  for (const key of ["name", "mode", "sector", "phone_number", "email", "address", "language", ...platformFields]) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(key === "is_active" ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (req.body.features) {
    sets.push("features_json = JSON_MERGE_PATCH(COALESCE(features_json, JSON_OBJECT()), ?)");
    values.push(JSON.stringify(req.body.features));
  }
  // Moving a shop to another plan brings that plan's bundle: the quota is raised so the shop has at least the bundle left.
  // Tokens already bought or granted are never taken away, and a quota the superadmin sets by hand wins.
  const newTier = req.body.subscription_tier;
  const bundle = newTier && newTier !== inst.subscription_tier ? TIER_TOKEN_BUNDLE[newTier] : undefined;
  if (bundle && req.body.ai_token_quota === undefined) {
    sets.push("ai_token_quota = GREATEST(ai_token_quota, ai_tokens_used + ?)");
    values.push(bundle);
  }
  if (sets.length) await query(`UPDATE institutions SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);

  if (req.body.is_active === false) {
    await query("UPDATE users SET token_version = token_version + 1 WHERE institution_id = ?", [id]);
    disconnectTenant(id);
  }

  const updated = await queryOne("SELECT * FROM institutions WHERE id = ?", [id]);
  await audit(req, "institution.update", { entityType: "institution", entityId: id, institutionId: id, metadata: Object.keys(req.body) });
  res.json({ success: true, message: "Instansi berhasil diperbarui.", data: institutionPublic(updated) });
}

/** POST /institutions/:id/reset-password (superadmin) — resets the tenant owner's password. */
export async function resetInstitutionPassword(req, res) {
  const id = req.params.id;
  const inst = await queryOne("SELECT * FROM institutions WHERE id = ?", [id]);
  if (!inst) throw notFound("Instansi tidak ditemukan.");

  const owner = await queryOne("SELECT * FROM users WHERE institution_id = ? AND role = 'owner' ORDER BY id ASC LIMIT 1", [id]);
  if (!owner) throw notFound("Akun owner untuk instansi ini tidak ditemukan.");

  const password = req.body.newPassword || generateRandomPassword(12);
  await query(
    "UPDATE users SET password_hash = ?, token_version = token_version + 1, failed_login_count = 0, locked_until = NULL WHERE id = ?",
    [await hashPassword(password), owner.id]
  );
  disconnectUser(owner.id);
  await audit(req, "institution.reset_password", { entityType: "user", entityId: owner.id, institutionId: Number(id) });

  res.json({
    success: true,
    message: `Password akun owner ${inst.name} berhasil direset.`,
    credentials: { institutionName: inst.name, email: owner.email, newPassword: password, role: "Owner / Supervisor" },
  });
}

/** DELETE /institutions/:id (superadmin) — deactivates the tenant; data is retained. */
export async function deleteInstitution(req, res) {
  const id = req.params.id;
  if (id === req.user.institution_id) throw forbidden("Instansi platform tidak dapat dihapus.");

  const inst = await queryOne("SELECT id FROM institutions WHERE id = ?", [id]);
  if (!inst) throw notFound("Instansi tidak ditemukan.");

  await query("UPDATE institutions SET is_active = 0 WHERE id = ?", [id]);
  await query("UPDATE users SET token_version = token_version + 1 WHERE institution_id = ?", [id]);
  disconnectTenant(id);
  await audit(req, "institution.deactivate", { entityType: "institution", entityId: id, institutionId: id });
  res.json({ success: true, message: "Instansi dinonaktifkan. Data tetap tersimpan." });
}
