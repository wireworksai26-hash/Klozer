import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { estimateMetaCost } from "../../utils/metaPricing.js";
import { loadTransportChannel } from "../channels/channelRepository.js";
import { getAdapter } from "../channels/adapters/index.js";
import { fetchAudiencePage, previewAudience } from "./audience.js";
import { getBroadcastSettings } from "./broadcastSettings.js";
import { loadSendableTemplate, getTemplateRow } from "./templateService.js";
import { buildSendComponents, describeComponents, renderBody } from "./templateModel.js";
import { resolveVariables, validateVariableSpec } from "./variableMapper.js";

/**
 * Campaigns: a template, an audience and a variable setup. Creating one only records the plan. Launching freezes the
 * recipient list (who is in it is decided then, and re-checked for consent at the moment each message is sent).
 */

const PAID = "('paid', 'processing', 'shipped', 'delivered', 'completed')";
const ATTRIBUTION_DAYS = 7;

export function toPublicCampaign(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    pauseReason: row.pause_reason,
    channelId: row.channel_id,
    templateId: row.template_id,
    audience: parseJsonColumn(row.audience_json, {}),
    variables: parseJsonColumn(row.variables_json, []),
    headerMediaUrl: row.header_media_url,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

async function getCampaignRow(institutionId, id) {
  const row = await queryOne("SELECT * FROM broadcast_campaigns WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Kampanye tidak ditemukan.");
  return row;
}

function assertSetup({ template, spec, headerMediaUrl }) {
  const problems = validateVariableSpec(spec, template.variable_count);
  if (["image", "video", "document"].includes(template.header_format) && !headerMediaUrl) problems.push(`Templat ini punya header ${template.header_format}: isi alamat berkasnya (https).`);
  if (problems.length) throw badRequest(problems[0], { code: "CAMPAIGN_INVALID", details: problems });
}

/** Record a campaign as a draft. */
export async function createCampaign({ institutionId, userId, name, channelId, templateId, audience = {}, variables = [], headerMediaUrl = null }) {
  const template = await loadSendableTemplate(institutionId, templateId);
  if (template.channel_id !== channelId) throw badRequest("Templat ini milik nomor WhatsApp lain.", { code: "TEMPLATE_CHANNEL_MISMATCH" });
  const channel = await loadTransportChannel(institutionId, channelId);
  if (!channel || channel.type !== "whatsapp") throw notFound("Kanal WhatsApp tidak ditemukan atau tidak aktif.");
  assertSetup({ template, spec: variables, headerMediaUrl });

  const result = await query(
    "INSERT INTO broadcast_campaigns (institution_id, channel_id, template_id, name, status, audience_json, variables_json, header_media_url, created_by) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)",
    [institutionId, channelId, templateId, name, JSON.stringify(audience), JSON.stringify(variables), headerMediaUrl, userId ?? null]
  );
  return toPublicCampaign(await getCampaignRow(institutionId, result.insertId));
}

/** Count (and sample) who a campaign would reach right now. */
export async function previewForCampaign({ institutionId, channelId, templateId, audience }) {
  const template = await getTemplateRow(institutionId, templateId);
  const settings = await getBroadcastSettings(institutionId);
  const preview = await previewAudience({ institutionId, audience, category: template.category, channelId, frequencyCapDays: settings.frequencyCapDays });
  // Meta bills the client's own WhatsApp account for every template delivered; show the owner roughly how much
  return { ...preview, metaCost: estimateMetaCost(template.category, preview.count) };
}

/** Freeze the recipient list: one row per contact, variables already resolved. @returns {Promise<number>} recipients */
export async function materializeRecipients(campaign) {
  const template = await getTemplateRow(campaign.institution_id, campaign.template_id);
  const settings = await getBroadcastSettings(campaign.institution_id);
  const audience = parseJsonColumn(campaign.audience_json, {});
  const spec = parseJsonColumn(campaign.variables_json, []);

  let afterId = 0;
  let total = 0;
  for (;;) {
    const page = await fetchAudiencePage({ institutionId: campaign.institution_id, audience, category: template.category, channelId: campaign.channel_id, frequencyCapDays: settings.frequencyCapDays, afterId });
    if (!page.length) break;
    afterId = page[page.length - 1].id;
    const rows = page.map((lead) => [campaign.id, campaign.institution_id, lead.id, lead.phone_number, JSON.stringify(resolveVariables(spec, lead))]);
    await query("INSERT IGNORE INTO broadcast_recipients (campaign_id, institution_id, lead_id, phone, variables_json) VALUES ?", [rows]);
    total += page.length;
  }
  return total;
}

/**
 * Start a campaign now, or schedule it. Only a draft (or a scheduled campaign being changed) can be launched.
 * @returns {Promise<{ campaign: object, recipients: number|null }>} recipients is known once the list is frozen (not for a scheduled one)
 */
export async function launchCampaign({ institutionId, id, scheduledAt = null }) {
  const campaign = await getCampaignRow(institutionId, id);
  if (!["draft", "scheduled"].includes(campaign.status)) throw conflict(`Kampanye berstatus '${campaign.status}' dan tidak bisa dijalankan.`, { code: "CAMPAIGN_STATE" });
  // the template must still be usable at launch: it may have been paused or disabled since the draft
  await loadSendableTemplate(institutionId, campaign.template_id);

  if (scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 60_000) {
    await query("UPDATE broadcast_campaigns SET status = 'scheduled', scheduled_at = ? WHERE id = ?", [new Date(scheduledAt), id]);
    return { campaign: toPublicCampaign(await getCampaignRow(institutionId, id)), recipients: null };
  }
  return { campaign: await startNow(campaign), recipients: await countRecipients(id) };
}

const countRecipients = async (id) => Number((await queryOne("SELECT COUNT(*) AS n FROM broadcast_recipients WHERE campaign_id = ?", [id])).n);

/** Freeze the list and begin sending (used by launch and by the scheduler). */
export async function startNow(campaign) {
  const claim = await query("UPDATE broadcast_campaigns SET status = 'sending', started_at = UTC_TIMESTAMP(), pause_reason = NULL WHERE id = ? AND status IN ('draft', 'scheduled')", [campaign.id]);
  if (claim.affectedRows === 0) return toPublicCampaign(await getCampaignRow(campaign.institution_id, campaign.id)); // someone else started it
  const recipients = await materializeRecipients(campaign);
  if (recipients === 0) await query("UPDATE broadcast_campaigns SET status = 'completed', finished_at = UTC_TIMESTAMP() WHERE id = ?", [campaign.id]);
  return toPublicCampaign(await getCampaignRow(campaign.institution_id, campaign.id));
}

export async function pauseCampaign(institutionId, id) {
  const result = await query("UPDATE broadcast_campaigns SET status = 'paused', pause_reason = 'manual' WHERE id = ? AND institution_id = ? AND status IN ('sending', 'scheduled')", [id, institutionId]);
  if (!result.affectedRows) throw conflict("Hanya kampanye yang sedang berjalan atau terjadwal yang bisa dijeda.", { code: "CAMPAIGN_STATE" });
  return toPublicCampaign(await getCampaignRow(institutionId, id));
}

export async function resumeCampaign(institutionId, id) {
  const campaign = await getCampaignRow(institutionId, id);
  if (campaign.status !== "paused") throw conflict("Kampanye ini tidak sedang dijeda.", { code: "CAMPAIGN_STATE" });
  await loadSendableTemplate(institutionId, campaign.template_id);
  // a campaign that never started has no frozen list yet and goes back to its schedule; one that did start carries on
  const next = campaign.started_at ? "sending" : "scheduled";
  await query("UPDATE broadcast_campaigns SET status = ?, pause_reason = NULL, backoff_until = NULL WHERE id = ?", [next, id]);
  return toPublicCampaign(await getCampaignRow(institutionId, id));
}

/** Stop for good: everything not yet sent is dropped. Messages already sent stay as they are. */
export async function cancelCampaign(institutionId, id) {
  const campaign = await getCampaignRow(institutionId, id);
  if (["completed", "cancelled"].includes(campaign.status)) throw conflict("Kampanye ini sudah selesai.", { code: "CAMPAIGN_STATE" });
  await query("UPDATE broadcast_recipients SET status = 'skipped', error_code = 'cancelled', error_message = 'Kampanye dibatalkan.' WHERE campaign_id = ? AND status = 'pending'", [id]);
  await query("UPDATE broadcast_campaigns SET status = 'cancelled', finished_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
  return toPublicCampaign(await getCampaignRow(institutionId, id));
}

export async function listCampaigns(institutionId, { limit = 50 } = {}) {
  const rows = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM broadcast_recipients r WHERE r.campaign_id = c.id) AS recipients,
            (SELECT COUNT(*) FROM broadcast_recipients r WHERE r.campaign_id = c.id AND r.status IN ('sent', 'delivered', 'read')) AS sent
       FROM broadcast_campaigns c WHERE c.institution_id = ? ORDER BY c.id DESC LIMIT ?`,
    [institutionId, limit]
  );
  return rows.map((r) => ({ ...toPublicCampaign(r), recipients: Number(r.recipients), sent: Number(r.sent) }));
}

/** Results of one campaign: delivery funnel, why messages failed, who answered, and what they bought afterwards. */
export async function campaignReport(institutionId, id) {
  const campaign = await getCampaignRow(institutionId, id);
  const [byStatus, failures, replies, revenue, credits] = await Promise.all([
    query("SELECT status, COUNT(*) AS n FROM broadcast_recipients WHERE campaign_id = ? GROUP BY status", [id]),
    query("SELECT COALESCE(error_message, error_code, 'Tidak diketahui') AS reason, COUNT(*) AS n FROM broadcast_recipients WHERE campaign_id = ? AND status IN ('failed', 'skipped') GROUP BY reason ORDER BY n DESC LIMIT 10", [id]),
    queryOne("SELECT COUNT(*) AS n FROM broadcast_recipients WHERE campaign_id = ? AND replied_at IS NOT NULL", [id]),
    queryOne(
      `SELECT COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(o.total_amount), 0) AS revenue
         FROM broadcast_recipients r JOIN orders o ON o.lead_id = r.lead_id AND o.institution_id = r.institution_id
          AND o.created_at >= r.sent_at AND o.created_at < DATE_ADD(r.sent_at, INTERVAL ${ATTRIBUTION_DAYS} DAY) AND o.status IN ${PAID}
        WHERE r.campaign_id = ? AND r.status IN ('sent', 'delivered', 'read')`,
      [id]
    ),
    queryOne("SELECT COUNT(*) AS n FROM broadcast_recipients WHERE campaign_id = ? AND status IN ('sent', 'delivered', 'read')", [id]),
  ]);
  const counts = { pending: 0, sending: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0 };
  for (const r of byStatus) counts[r.status] = Number(r.n);
  const accepted = Number(credits.n);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    campaign: toPublicCampaign(campaign),
    total,
    counts,
    // "delivered" includes everything that went on to be read
    funnel: { accepted, delivered: counts.delivered + counts.read, read: counts.read },
    failures: failures.map((f) => ({ reason: f.reason, count: Number(f.n) })),
    replies: Number(replies.n),
    replyRatePercent: accepted ? Math.round((Number(replies.n) / accepted) * 1000) / 10 : 0,
    attributedOrders: Number(revenue.orders),
    attributedRevenue: Number(revenue.revenue),
    attributionWindowDays: ATTRIBUTION_DAYS,
    creditsUsed: accepted,
  };
}

export async function listRecipients(institutionId, id, { status, limit = 100, offset = 0 } = {}) {
  await getCampaignRow(institutionId, id);
  const where = ["r.campaign_id = ?"];
  const params = [id];
  if (status) (where.push("r.status = ?"), params.push(status));
  const rows = await query(
    `SELECT r.id, r.lead_id, l.name, r.phone, r.status, r.error_code, r.error_message, r.sent_at, r.delivered_at, r.read_at, r.replied_at
       FROM broadcast_recipients r JOIN leads l ON l.id = r.lead_id WHERE ${where.join(" AND ")} ORDER BY r.id LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows.map((r) => ({ id: Number(r.id), leadId: r.lead_id, name: r.name, phone: r.phone, status: r.status, errorCode: r.error_code, errorMessage: r.error_message, sentAt: r.sent_at, deliveredAt: r.delivered_at, readAt: r.read_at, repliedAt: r.replied_at }));
}

/**
 * Send the template once to a number the owner types (their own phone), to see it before launching. Uses one credit.
 * @returns {Promise<{ success: boolean, error?: string, preview: string }>}
 */
export async function sendTestMessage({ institutionId, channelId, templateId, phone, variables = [], headerMediaUrl = null }) {
  const template = await loadSendableTemplate(institutionId, templateId);
  if (template.channel_id !== channelId) throw badRequest("Templat ini milik nomor WhatsApp lain.", { code: "TEMPLATE_CHANNEL_MISMATCH" });
  assertSetup({ template, spec: variables, headerMediaUrl });
  const channel = await loadTransportChannel(institutionId, channelId);
  if (!channel) throw notFound("Kanal WhatsApp tidak ditemukan atau tidak aktif.");

  const values = resolveVariables(variables, { name: "Budi", city: "Solo" });
  const meta = describeComponents(parseJsonColumn(template.components_json, []));
  const spent = await query("UPDATE institutions SET blast_credits_used = blast_credits_used + 1 WHERE id = ? AND blast_credits_used < blast_credit_quota", [institutionId]);
  if (!spent.affectedRows) throw conflict("Kredit blast habis.", { code: "OUT_OF_CREDITS" });
  const sent = await getAdapter("whatsapp").sendTemplate({
    channel,
    to: phone,
    template: { name: template.name, language: template.language, components: buildSendComponents({ variableCount: template.variable_count, headerFormat: template.header_format }, values, headerMediaUrl) },
  });
  if (!sent.success) await query("UPDATE institutions SET blast_credits_used = GREATEST(blast_credits_used - 1, 0) WHERE id = ?", [institutionId]);
  return { success: sent.success, error: sent.error, preview: renderBody(meta.bodyText, values) };
}

/** Credits left for broadcasts. */
export async function creditBalance(institutionId) {
  const row = await queryOne("SELECT blast_credit_quota AS quota, blast_credits_used AS used FROM institutions WHERE id = ?", [institutionId]);
  return { quota: Number(row?.quota ?? 0), used: Number(row?.used ?? 0), remaining: Math.max(0, Number(row?.quota ?? 0) - Number(row?.used ?? 0)) };
}
