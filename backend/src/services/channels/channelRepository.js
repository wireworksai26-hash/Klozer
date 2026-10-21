import { query, queryOne, transaction } from "../../config/db.js";
import { config as appConfig } from "../../config/env.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { decryptSecret, encryptSecret } from "../../utils/crypto.js";
import { CONNECTABLE_CHANNEL_TYPES, channelLimitFor } from "./channelPlans.js";

const parseJson = (v) => (typeof v === "string" ? JSON.parse(v) : v ?? null);

// Settings that authenticate the platform to us (a webhook secret). They are stored with the channel but never leave the server.
const PRIVATE_CONFIG_KEYS = ["webhookSecret", "registrationPin"];

function publicConfig(row) {
  const config = { ...(parseJson(row.config_json) || {}) };
  for (const key of PRIVATE_CONFIG_KEYS) delete config[key];
  return config;
}

/** What the dashboard may see: never the access token, only whether one is stored. */
export function toPublicChannel(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    externalId: row.external_id,
    displayHandle: row.display_handle,
    aiEnabled: Boolean(row.ai_enabled),
    isActive: Boolean(row.is_active),
    isDefault: Boolean(row.is_default),
    hasToken: Boolean(row.encrypted_access_token),
    config: publicConfig(row),
    ...(row.type === "webchat" ? { embedSnippet: `<script src="${appConfig.appUrl}/api/v1/public/webchat/widget.js" data-key="${row.external_id}" async></script>` } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Same row with the token decrypted, for the code that actually sends. Never returned by an API. */
function toTransportChannel(row) {
  return {
    id: row.id,
    institutionId: row.institution_id,
    type: row.type,
    externalId: row.external_id,
    displayHandle: row.display_handle,
    aiEnabled: Boolean(row.ai_enabled),
    config: parseJson(row.config_json) || {},
    accessToken: row.encrypted_access_token ? decryptSecret(row.encrypted_access_token) : null,
  };
}

// ---------------------------------------------------------------- reading
export async function listChannels(institutionId) {
  const rows = await query("SELECT * FROM channels WHERE institution_id = ? ORDER BY type, is_default DESC, id", [institutionId]);
  return rows.map(toPublicChannel);
}

export async function getChannel(institutionId, id) {
  const row = await queryOne("SELECT * FROM channels WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Kanal tidak ditemukan.");
  return toPublicChannel(row);
}

/** The channel that owns an incoming account id (a WhatsApp phone number id), or null when nobody does. */
export async function findActiveByExternalId(type, externalId) {
  const row = await queryOne("SELECT * FROM channels WHERE type = ? AND external_id = ? AND is_active = 1", [type, externalId]);
  return row ? toTransportChannel(row) : null;
}

/** A specific active channel of a tenant, ready to send with. */
export async function loadTransportChannel(institutionId, id) {
  const row = await queryOne("SELECT * FROM channels WHERE id = ? AND institution_id = ? AND is_active = 1", [id, institutionId]);
  return row ? toTransportChannel(row) : null;
}

/** Same, whether or not the channel is switched on (needed to disconnect it cleanly). */
export async function loadTransportChannelAny(institutionId, id) {
  const row = await queryOne("SELECT * FROM channels WHERE id = ? AND institution_id = ?", [id, institutionId]);
  return row ? toTransportChannel(row) : null;
}

/** The tenant's default active channel of a type: the one marked default, else the oldest. Null when none is connected. */
export async function loadDefaultChannel(institutionId, type = "whatsapp") {
  const row = await queryOne("SELECT * FROM channels WHERE institution_id = ? AND type = ? AND is_active = 1 ORDER BY is_default DESC, id ASC LIMIT 1", [institutionId, type]);
  return row ? toTransportChannel(row) : null;
}

// ---------------------------------------------------------------- writing
/** Throws when the tenant's plan has no room for another channel. `tx` is anything with queryOne (a transaction, or the pool). */
export async function assertWithinLimit(tx, institutionId) {
  const inst = await tx.queryOne("SELECT subscription_tier FROM institutions WHERE id = ?", [institutionId]);
  if (!inst) throw notFound("Instansi tidak ditemukan.");
  const limit = channelLimitFor(inst.subscription_tier);
  const { n } = await tx.queryOne("SELECT COUNT(*) AS n FROM channels WHERE institution_id = ?", [institutionId]);
  if (Number(n) >= limit) {
    throw conflict(`Paket ${inst.subscription_tier} dibatasi ${limit} kanal. Hapus kanal yang tidak dipakai atau naikkan paket.`, { code: "CHANNEL_LIMIT", details: { limit } });
  }
}

/** Connect a new account. The first channel of a type becomes its default. */
export async function createChannel({ institutionId, type, name, externalId, displayHandle = null, accessToken = null, config = null, aiEnabled = true }) {
  if (!CONNECTABLE_CHANNEL_TYPES.includes(type)) throw badRequest(`Kanal ${type} belum bisa dihubungkan.`, { code: "CHANNEL_NOT_SUPPORTED" });

  const id = await transaction(async (tx) => {
    const taken = await tx.queryOne("SELECT institution_id FROM channels WHERE type = ? AND external_id = ?", [type, externalId]);
    if (taken) {
      throw conflict(taken.institution_id === institutionId ? "Akun ini sudah terhubung di toko Anda." : "Akun ini sudah terhubung ke instansi lain.", { code: "CHANNEL_TAKEN" });
    }
    await assertWithinLimit(tx, institutionId);
    const existing = await tx.queryOne("SELECT COUNT(*) AS n FROM channels WHERE institution_id = ? AND type = ?", [institutionId, type]);
    const result = await tx.query(
      `INSERT INTO channels (institution_id, type, name, external_id, display_handle, encrypted_access_token, config_json, ai_enabled, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, type, name, externalId, displayHandle, accessToken ? encryptSecret(accessToken) : null, config ? JSON.stringify(config) : null, aiEnabled ? 1 : 0, Number(existing.n) === 0 ? 1 : 0]
    );
    return result.insertId;
  });
  return getChannel(institutionId, id);
}

/** Change a channel. A field left undefined is untouched; `accessToken` replaces the stored token. */
export async function updateChannel({ institutionId, id, name, displayHandle, accessToken, aiEnabled, isActive, isDefault, config, wabaId }) {
  await transaction(async (tx) => {
    const row = await tx.queryOne("SELECT id, type, is_default, config_json FROM channels WHERE id = ? AND institution_id = ? FOR UPDATE", [id, institutionId]);
    if (!row) throw notFound("Kanal tidak ditemukan.");

    const sets = [];
    const values = [];
    const set = (column, value) => {
      sets.push(`${column} = ?`);
      values.push(value);
    };
    if (name !== undefined) set("name", name);
    if (displayHandle !== undefined) set("display_handle", displayHandle);
    if (accessToken) set("encrypted_access_token", encryptSecret(accessToken));
    if (aiEnabled !== undefined) set("ai_enabled", aiEnabled ? 1 : 0);
    if (isActive !== undefined) set("is_active", isActive ? 1 : 0);
    // appearance and similar settings are merged into what is stored, so secrets kept there survive an edit
    if (config !== undefined && row.type !== "webchat") throw badRequest("Pengaturan tampilan hanya untuk live chat website.", { code: "CONFIG_NOT_SUPPORTED" });
    if (wabaId !== undefined && row.type !== "whatsapp") throw badRequest("ID WhatsApp Business Account hanya untuk kanal WhatsApp.", { code: "CONFIG_NOT_SUPPORTED" });
    if (config !== undefined || wabaId !== undefined) {
      set("config_json", JSON.stringify({ ...(parseJson(row.config_json) || {}), ...(config ?? {}), ...(wabaId !== undefined ? { wabaId } : {}) }));
    }

    if (isDefault === true) {
      await tx.query("UPDATE channels SET is_default = 0 WHERE institution_id = ? AND type = ?", [institutionId, row.type]);
      set("is_default", 1);
    } else if (isDefault === false && row.is_default) {
      throw badRequest("Pilih kanal lain sebagai default; tiap jenis kanal harus punya satu default.", { code: "DEFAULT_REQUIRED" });
    }
    if (sets.length) await tx.query(`UPDATE channels SET ${sets.join(", ")} WHERE id = ? AND institution_id = ?`, [...values, id, institutionId]);
  });
  return getChannel(institutionId, id);
}

/** Remove a channel. Conversations keep their history (their channel link is cleared); another channel becomes the default. */
export async function deleteChannel(institutionId, id) {
  await transaction(async (tx) => {
    const row = await tx.queryOne("SELECT id, type, is_default FROM channels WHERE id = ? AND institution_id = ? FOR UPDATE", [id, institutionId]);
    if (!row) throw notFound("Kanal tidak ditemukan.");
    await tx.query("DELETE FROM channels WHERE id = ?", [id]);
    if (row.is_default) {
      await tx.query("UPDATE channels SET is_default = 1 WHERE institution_id = ? AND type = ? ORDER BY is_active DESC, id ASC LIMIT 1", [institutionId, row.type]);
    }
  });
}
