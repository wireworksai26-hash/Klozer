import crypto from "crypto";
import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { badRequest, conflict, notFound, unauthorized } from "../../utils/errors.js";
import { integrationLimitsFor } from "./integrationPlans.js";

/**
 * API keys for the public API. A key is shown once, when it is created; only its SHA-256 is stored (keys are long
 * random strings, so a plain hash is enough and lets a request be matched with one indexed lookup). A key carries
 * scopes, can expire, and can be revoked at any time.
 */

export const SCOPES = Object.freeze({
  "contacts:read": "Membaca kontak",
  "contacts:write": "Membuat dan mengubah kontak, mencatat persetujuan",
  "messages:read": "Membaca riwayat chat",
  "messages:send": "Mengirim pesan dan templat ke kontak",
  "orders:read": "Membaca pesanan",
  "orders:write": "Membuat pesanan",
  "products:read": "Membaca produk dan stok",
});
export const SCOPE_NAMES = Object.freeze(Object.keys(SCOPES));

const PREFIX = "klz_live_";
const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");
const TOUCH_EVERY_MINUTES = 1;

const toPublic = (row) => ({
  id: row.id,
  name: row.name,
  prefix: row.key_prefix,
  scopes: parseJsonColumn(row.scopes_json, []),
  lastUsedAt: row.last_used_at,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
});

/** @returns {Promise<{ key: string, apiKey: object }>} the plain key, which cannot be read again */
export async function createApiKey({ institutionId, userId, name, scopes, expiresAt = null }) {
  const unknown = scopes.filter((s) => !SCOPE_NAMES.includes(s));
  if (unknown.length) throw badRequest(`Cakupan tidak dikenal: ${unknown.join(", ")}`, { code: "UNKNOWN_SCOPE" });

  const inst = await queryOne("SELECT subscription_tier FROM institutions WHERE id = ?", [institutionId]);
  const limit = integrationLimitsFor(inst?.subscription_tier).apiKeys;
  const active = await queryOne("SELECT COUNT(*) AS n FROM api_keys WHERE institution_id = ? AND revoked_at IS NULL", [institutionId]);
  if (Number(active.n) >= limit) throw conflict(`Paket ${inst?.subscription_tier} dibatasi ${limit} API key aktif. Cabut yang tidak dipakai atau naikkan paket.`, { code: "API_KEY_LIMIT", details: { limit } });

  const key = `${PREFIX}${crypto.randomBytes(24).toString("hex")}`;
  const result = await query("INSERT INTO api_keys (institution_id, name, key_prefix, key_hash, scopes_json, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    institutionId,
    name,
    key.slice(0, PREFIX.length + 6),
    hashKey(key),
    JSON.stringify([...new Set(scopes)]),
    userId ?? null,
    expiresAt ? new Date(expiresAt) : null,
  ]);
  const row = await queryOne("SELECT * FROM api_keys WHERE id = ?", [result.insertId]);
  return { key, apiKey: toPublic(row) };
}

export async function listApiKeys(institutionId) {
  const rows = await query("SELECT * FROM api_keys WHERE institution_id = ? ORDER BY revoked_at IS NOT NULL, id DESC", [institutionId]);
  return rows.map(toPublic);
}

export async function revokeApiKey(institutionId, id) {
  const result = await query("UPDATE api_keys SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND institution_id = ? AND revoked_at IS NULL", [id, institutionId]);
  if (!result.affectedRows) throw notFound("API key tidak ditemukan atau sudah dicabut.");
}

/**
 * Identify the caller of the public API from the key they sent.
 * @returns {Promise<{ id: number, institutionId: number, scopes: string[] }>}
 */
export async function authenticateApiKey(rawKey, now = new Date()) {
  const key = String(rawKey || "").trim();
  if (!key.startsWith(PREFIX) || key.length < 30 || key.length > 100) throw unauthorized("API key tidak valid.", { code: "INVALID_API_KEY" });

  const row = await queryOne(
    `SELECT k.*, i.is_active AS tenant_active FROM api_keys k JOIN institutions i ON i.id = k.institution_id WHERE k.key_hash = ?`,
    [hashKey(key)]
  );
  if (!row || row.revoked_at || !row.tenant_active) throw unauthorized("API key tidak valid atau sudah dicabut.", { code: "INVALID_API_KEY" });
  if (row.expires_at && new Date(row.expires_at) <= now) throw unauthorized("API key sudah kedaluwarsa.", { code: "API_KEY_EXPIRED" });

  // a busy integration should not write to the database on every request
  await query("UPDATE api_keys SET last_used_at = ? WHERE id = ? AND (last_used_at IS NULL OR last_used_at < ?)", [now, row.id, new Date(now.getTime() - TOUCH_EVERY_MINUTES * 60_000)]);
  return { id: row.id, institutionId: row.institution_id, scopes: parseJsonColumn(row.scopes_json, []) };
}
