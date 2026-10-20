import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { loadTransportChannel } from "../channels/channelRepository.js";
import { emitEvent } from "../integrations/eventBus.js";
import { createRemoteTemplate, deleteRemoteTemplate, listRemoteTemplates } from "./templateApi.js";
import { buildComponents, describeComponents, mapMetaCategory, mapMetaStatus, validateTemplateInput } from "./templateModel.js";

/** Templates of a tenant's WhatsApp numbers: created here or in Meta's Business Manager, kept in step with Meta. */

export function toPublicTemplate(row) {
  const components = parseJsonColumn(row.components_json, []);
  return {
    id: row.id,
    channelId: row.channel_id,
    name: row.name,
    language: row.language,
    category: row.category,
    status: row.status,
    bodyText: row.body_text,
    variableCount: row.variable_count,
    headerFormat: row.header_format,
    rejectedReason: row.rejected_reason,
    components,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  };
}

/** The WhatsApp channel and its WABA id, or a clear error saying what is missing. */
async function whatsappChannelWithWaba(institutionId, channelId) {
  const channel = await loadTransportChannel(institutionId, channelId);
  if (!channel || channel.type !== "whatsapp") throw notFound("Kanal WhatsApp tidak ditemukan atau tidak aktif.");
  if (!channel.config?.wabaId) throw badRequest("ID WhatsApp Business Account (WABA) belum diisi di kanal ini. Isi dulu di pengaturan kanal.", { code: "WABA_REQUIRED" });
  if (!channel.accessToken) throw badRequest("Kanal ini belum punya access token.", { code: "TOKEN_REQUIRED" });
  return channel;
}

export async function listTemplates(institutionId, { status, channelId } = {}) {
  const where = ["institution_id = ?"];
  const params = [institutionId];
  if (status) (where.push("status = ?"), params.push(status));
  if (channelId) (where.push("channel_id = ?"), params.push(channelId));
  const rows = await query(`SELECT * FROM message_templates WHERE ${where.join(" AND ")} ORDER BY updated_at DESC, id DESC`, params);
  return rows.map(toPublicTemplate);
}

export async function getTemplateRow(institutionId, id) {
  const row = await queryOne("SELECT * FROM message_templates WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Templat tidak ditemukan.");
  return row;
}

/** Submit a new template to Meta for review and keep it here as pending. */
export async function createTemplate({ institutionId, channelId, name, language, category, body, bodyExamples = [], headerText = null, headerExample = null, footer = null, buttons = [] }) {
  const channel = await whatsappChannelWithWaba(institutionId, channelId);
  const input = { name, category, body, bodyExamples, headerText, headerExample, footer, buttons };
  const problems = validateTemplateInput(input);
  if (problems.length) throw badRequest(problems[0], { code: "TEMPLATE_INVALID", details: problems });

  const taken = await queryOne("SELECT id FROM message_templates WHERE channel_id = ? AND name = ? AND language = ?", [channelId, name, language]);
  if (taken) throw conflict("Templat dengan nama dan bahasa ini sudah ada.", { code: "TEMPLATE_EXISTS" });

  const components = buildComponents(input);
  const remote = await createRemoteTemplate({ wabaId: channel.config.wabaId, token: channel.accessToken, name, language, category, components });
  if (!remote.ok) throw badRequest(`Meta menolak templat: ${remote.error}`, { code: "TEMPLATE_REJECTED_BY_META" });

  const meta = describeComponents(components);
  const result = await query(
    `INSERT INTO message_templates (institution_id, channel_id, name, language, category, status, meta_template_id, components_json, body_text, variable_count, header_format, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [institutionId, channelId, name, language, category, mapMetaStatus(remote.status), remote.id, JSON.stringify(components), meta.bodyText, meta.variableCount, meta.headerFormat]
  );
  return toPublicTemplate(await getTemplateRow(institutionId, result.insertId));
}

/**
 * Pull the account's templates from Meta: new ones appear, statuses and wording update, and a template that no longer
 * exists at Meta is marked disabled here (campaigns can no longer use it).
 * @returns {Promise<{ added: number, updated: number, disabled: number }>}
 */
export async function syncTemplates({ institutionId, channelId }) {
  const channel = await whatsappChannelWithWaba(institutionId, channelId);
  const remote = await listRemoteTemplates({ wabaId: channel.config.wabaId, token: channel.accessToken });
  if (!remote.ok) throw badRequest(`Gagal mengambil templat dari Meta: ${remote.error}`, { code: "TEMPLATE_SYNC_FAILED" });

  let added = 0;
  let updated = 0;
  const seen = new Set();
  for (const t of remote.templates) {
    const meta = describeComponents(t.components);
    const key = `${t.name}|${t.language}`;
    seen.add(key);
    const existing = await queryOne("SELECT id FROM message_templates WHERE channel_id = ? AND name = ? AND language = ?", [channelId, t.name, t.language]);
    const values = [mapMetaCategory(t.category), mapMetaStatus(t.status), t.id ? String(t.id) : null, JSON.stringify(t.components || []), meta.bodyText, meta.variableCount, meta.headerFormat, t.rejected_reason && t.rejected_reason !== "NONE" ? String(t.rejected_reason).slice(0, 255) : null];
    if (existing) {
      await query(
        `UPDATE message_templates SET category = ?, status = ?, meta_template_id = ?, components_json = ?, body_text = ?, variable_count = ?, header_format = ?, rejected_reason = ?, last_synced_at = UTC_TIMESTAMP() WHERE id = ?`,
        [...values, existing.id]
      );
      updated++;
    } else {
      await query(
        `INSERT INTO message_templates (institution_id, channel_id, name, language, category, status, meta_template_id, components_json, body_text, variable_count, header_format, rejected_reason, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [institutionId, channelId, t.name, t.language, ...values]
      );
      added++;
    }
  }

  let disabled = 0;
  const local = await query("SELECT id, name, language FROM message_templates WHERE channel_id = ? AND meta_template_id IS NOT NULL AND status <> 'disabled'", [channelId]);
  for (const row of local) {
    if (!seen.has(`${row.name}|${row.language}`)) {
      await query("UPDATE message_templates SET status = 'disabled' WHERE id = ?", [row.id]);
      disabled++;
    }
  }
  return { added, updated, disabled };
}

/** Remove a template here and at Meta. Refused while a campaign that has not finished still uses it. */
export async function deleteTemplate(institutionId, id) {
  const row = await getTemplateRow(institutionId, id);
  const inUse = await queryOne("SELECT id FROM broadcast_campaigns WHERE template_id = ? AND status IN ('scheduled', 'sending', 'paused') LIMIT 1", [id]);
  if (inUse) throw conflict("Templat ini dipakai kampanye yang belum selesai.", { code: "TEMPLATE_IN_USE" });

  if (row.meta_template_id) {
    const channel = await whatsappChannelWithWaba(institutionId, row.channel_id);
    const remote = await deleteRemoteTemplate({ wabaId: channel.config.wabaId, token: channel.accessToken, name: row.name });
    if (!remote.ok) throw badRequest(`Meta menolak penghapusan: ${remote.error}`, { code: "TEMPLATE_DELETE_FAILED" });
  }
  const used = await queryOne("SELECT id FROM broadcast_campaigns WHERE template_id = ? LIMIT 1", [id]);
  if (used) {
    await query("UPDATE message_templates SET status = 'disabled' WHERE id = ?", [id]); // kept for the history of finished campaigns
  } else {
    await query("DELETE FROM message_templates WHERE id = ?", [id]);
  }
}

/**
 * Meta tells us a template's review finished (webhook field message_template_status_update).
 * @param {{ wabaId: string, metaTemplateId?: string, name?: string, language?: string, event: string, reason?: string }} e
 * @returns {Promise<number>} templates updated
 */
export async function applyTemplateStatusEvent({ wabaId, metaTemplateId, name, language, event, reason }) {
  const channels = await query("SELECT id, institution_id FROM channels WHERE type = 'whatsapp' AND JSON_UNQUOTE(JSON_EXTRACT(config_json, '$.wabaId')) = ?", [String(wabaId)]);
  if (!channels.length) return 0;
  const rejected = reason && reason !== "NONE" ? String(reason).slice(0, 255) : null;
  let changed = 0;
  for (const c of channels) {
    const result = metaTemplateId
      ? await query("UPDATE message_templates SET status = ?, rejected_reason = ?, last_synced_at = UTC_TIMESTAMP() WHERE channel_id = ? AND meta_template_id = ?", [mapMetaStatus(event), rejected, c.id, String(metaTemplateId)])
      : await query("UPDATE message_templates SET status = ?, rejected_reason = ?, last_synced_at = UTC_TIMESTAMP() WHERE channel_id = ? AND name = ? AND language = ?", [mapMetaStatus(event), rejected, c.id, name, language]);
    changed += result.affectedRows;
    if (result.affectedRows) emitEvent({ institutionId: c.institution_id, type: "template.status_changed", data: { name, language, meta_template_id: metaTemplateId ?? null, status: mapMetaStatus(event), reason: rejected } });
  }
  return changed;
}

/** A template a campaign may send: approved, and not a one-time-code template. */
export async function loadSendableTemplate(institutionId, id) {
  const row = await getTemplateRow(institutionId, id);
  if (row.status !== "approved") throw conflict(`Templat belum disetujui Meta (status: ${row.status}).`, { code: "TEMPLATE_NOT_APPROVED" });
  if (row.category === "authentication") throw badRequest("Templat autentikasi tidak bisa dipakai untuk broadcast.", { code: "TEMPLATE_CATEGORY" });
  return row;
}
