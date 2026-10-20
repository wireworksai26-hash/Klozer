import { query, queryOne } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { emitToTenant } from "../../realtime.js";
import { getAdapter } from "../channels/adapters/index.js";
import { loadTransportChannel } from "../channels/channelRepository.js";
import { nextAllowedTime } from "../followup/followupPolicy.js";
import { getBroadcastSettings } from "./broadcastSettings.js";
import { startNow } from "./campaignService.js";
import { classifySendError } from "./sendErrors.js";
import { buildSendComponents, describeComponents, renderBody } from "./templateModel.js";

/**
 * Sending campaigns, a little at a time. Each pass:
 *  1. starts campaigns whose scheduled time has come;
 *  2. for every running campaign, sends the next recipients, within the number's daily limit, quiet hours, credits and
 *     any back-off Meta asked for;
 *  3. closes campaigns with nobody left to send to.
 * Every recipient is claimed with a conditional update before it is sent, so two workers never send the same message.
 */

const BATCH = 50;
const CONCURRENCY = 5;
const IN_FLIGHT_TIMEOUT_MINUTES = 10;

const minutesFrom = (now, minutes) => new Date(now.getTime() + minutes * 60_000);

/** Recipients this number has already started a conversation with in the last 24 hours (Meta's limit is on these). */
async function sentInLastDay(channelId, now) {
  const row = await queryOne(
    `SELECT COUNT(*) AS n FROM broadcast_recipients r JOIN broadcast_campaigns c ON c.id = r.campaign_id
      WHERE c.channel_id = ? AND r.status IN ('sending', 'sent', 'delivered', 'read') AND r.sent_at > ?`,
    [channelId, new Date(now.getTime() - 24 * 3600_000)]
  );
  return Number(row.n);
}

async function reserveCredit(institutionId) {
  const result = await query("UPDATE institutions SET blast_credits_used = blast_credits_used + 1 WHERE id = ? AND blast_credits_used < blast_credit_quota", [institutionId]);
  return result.affectedRows > 0;
}
const refundCredit = (institutionId) => query("UPDATE institutions SET blast_credits_used = GREATEST(blast_credits_used - 1, 0) WHERE id = ?", [institutionId]);

/** What one send ended with, for the pass to act on. */
async function sendOne({ campaign, template, channel, recipient, now }) {
  const release = () => query("UPDATE broadcast_recipients SET status = 'pending', sent_at = NULL WHERE id = ? AND status = 'sending'", [recipient.id]);

  // consent is checked again at the moment of sending: the contact may have said stop since the list was frozen
  const lead = await queryOne("SELECT id, marketing_consent FROM leads WHERE id = ?", [recipient.lead_id]);
  const consentOk = lead && lead.marketing_consent !== "opted_out" && (template.category !== "marketing" || lead.marketing_consent === "opted_in");
  if (!consentOk) {
    await query("UPDATE broadcast_recipients SET status = 'skipped', error_code = 'consent', error_message = 'Tidak ada persetujuan menerima pesan ini.' WHERE id = ?", [recipient.id]);
    return { outcome: "skipped" };
  }

  if (!(await reserveCredit(campaign.institution_id))) {
    await release();
    return { outcome: "pause", reason: "out_of_credits" };
  }

  const values = parseJsonColumn(recipient.variables_json, []);
  const result = await getAdapter("whatsapp").sendTemplate({
    channel,
    to: recipient.phone,
    template: {
      name: template.name,
      language: template.language,
      components: buildSendComponents({ variableCount: template.variable_count, headerFormat: template.header_format }, values, campaign.header_media_url),
    },
  });

  if (result.success) {
    await query("UPDATE broadcast_recipients SET status = 'sent', sent_at = ?, wa_message_id = ?, error_code = NULL, error_message = NULL WHERE id = ?", [now, result.messageId, recipient.id]);
    const text = renderBody(describeComponents(parseJsonColumn(template.components_json, [])).bodyText, values);
    // the message is part of the contact's conversation, so a reply to it has context
    await query(
      `INSERT INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, sender_user_id, message_type, content_text, is_delivered, meta_json)
       VALUES (?, ?, ?, ?, 'cs', ?, 'text', ?, 1, ?)`,
      [campaign.institution_id, recipient.lead_id, campaign.channel_id, result.messageId, campaign.created_by, text, JSON.stringify({ broadcast: { campaignId: campaign.id, template: template.name } })]
    ).catch((err) => logger.warn({ err: err.message }, "Broadcast message not added to the conversation"));
    return { outcome: "sent" };
  }

  await refundCredit(campaign.institution_id);
  const decision = classifySendError(result.errorCode, { network: result.network });
  if (decision.action === "retry_later") {
    await release();
    return { outcome: "backoff", minutes: decision.backoffMinutes };
  }
  if (decision.action === "pause") {
    await release();
    return { outcome: "pause", reason: decision.reason, detail: result.error };
  }
  await query("UPDATE broadcast_recipients SET status = 'failed', error_code = ?, error_message = ? WHERE id = ?", [String(result.errorCode ?? "").slice(0, 20), String(decision.message || result.error || "Gagal dikirim.").slice(0, 250), recipient.id]);
  return { outcome: "failed" };
}

/** Run `items` through `worker` with at most `limit` at a time, stopping early when `shouldStop` says so. */
async function pool(items, limit, worker, shouldStop) {
  let next = 0;
  const run = async () => {
    while (next < items.length && !shouldStop()) {
      const item = items[next++];
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

async function runCampaign(campaign, now, tally) {
  const settings = await getBroadcastSettings(campaign.institution_id);
  if (nextAllowedTime(now, settings.quietStartHour, settings.quietEndHour).getTime() > now.getTime()) return; // night: wait for morning

  const remaining = settings.dailyLimit - (await sentInLastDay(campaign.channel_id, now));
  if (remaining <= 0) return; // today's allowance is used up; tomorrow it frees up as the last day rolls forward

  const template = await queryOne("SELECT * FROM message_templates WHERE id = ?", [campaign.template_id]);
  if (!template || template.status !== "approved") {
    await query("UPDATE broadcast_campaigns SET status = 'paused', pause_reason = 'template_problem' WHERE id = ?", [campaign.id]);
    emitToTenant(campaign.institution_id, "broadcast:paused", { campaignId: campaign.id, reason: "template_problem" });
    return;
  }
  const channel = await loadTransportChannel(campaign.institution_id, campaign.channel_id);
  if (!channel?.accessToken) {
    await query("UPDATE broadcast_campaigns SET status = 'paused', pause_reason = 'channel_auth' WHERE id = ?", [campaign.id]);
    emitToTenant(campaign.institution_id, "broadcast:paused", { campaignId: campaign.id, reason: "channel_auth" });
    return;
  }

  const pending = await query("SELECT * FROM broadcast_recipients WHERE campaign_id = ? AND status = 'pending' ORDER BY id LIMIT ?", [campaign.id, Math.min(BATCH, remaining)]);
  let stop = null;

  await pool(
    pending,
    CONCURRENCY,
    async (recipient) => {
      const claim = await query("UPDATE broadcast_recipients SET status = 'sending', sent_at = ? WHERE id = ? AND status = 'pending'", [now, recipient.id]);
      if (claim.affectedRows === 0) return;
      let result;
      try {
        result = await sendOne({ campaign, template, channel, recipient, now });
      } catch (err) {
        logger.error({ err: err.message, recipientId: recipient.id }, "Broadcast send crashed");
        await query("UPDATE broadcast_recipients SET status = 'pending', sent_at = NULL WHERE id = ? AND status = 'sending'", [recipient.id]);
        stop = { outcome: "backoff", minutes: 1 };
        return;
      }
      if (result.outcome === "sent") tally.sent++;
      else if (result.outcome === "failed") tally.failed++;
      else if (result.outcome === "skipped") tally.skipped++;
      else stop ??= result;
    },
    () => stop !== null
  );

  if (stop?.outcome === "backoff") {
    await query("UPDATE broadcast_campaigns SET backoff_until = ? WHERE id = ?", [minutesFrom(now, stop.minutes), campaign.id]);
  } else if (stop?.outcome === "pause") {
    await query("UPDATE broadcast_campaigns SET status = 'paused', pause_reason = ? WHERE id = ?", [stop.reason, campaign.id]);
    emitToTenant(campaign.institution_id, "broadcast:paused", { campaignId: campaign.id, reason: stop.reason });
    logger.warn({ campaignId: campaign.id, reason: stop.reason, detail: stop.detail }, "Broadcast paused");
  }
}

/**
 * One pass over all campaigns.
 * @param {{ now?: Date, institutionId?: number|null }} [p] `institutionId` limits the pass to one tenant
 * @returns {Promise<{ started: number, sent: number, failed: number, skipped: number, completed: number }>}
 */
export async function runBroadcastTick({ now = new Date(), institutionId = null } = {}) {
  const tally = { started: 0, sent: 0, failed: 0, skipped: 0, completed: 0 };

  // a worker that died mid-send leaves recipients claimed: hand them back
  await query(
    "UPDATE broadcast_recipients SET status = 'pending', sent_at = NULL WHERE status = 'sending' AND sent_at < ?",
    [new Date(now.getTime() - IN_FLIGHT_TIMEOUT_MINUTES * 60_000)]
  );

  const due = await query("SELECT * FROM broadcast_campaigns WHERE status = 'scheduled' AND scheduled_at <= ? AND (? IS NULL OR institution_id = ?) ORDER BY scheduled_at", [now, institutionId, institutionId]);
  for (const campaign of due) {
    await startNow(campaign);
    tally.started++;
  }

  const running = await query("SELECT * FROM broadcast_campaigns WHERE status = 'sending' AND (backoff_until IS NULL OR backoff_until <= ?) AND (? IS NULL OR institution_id = ?) ORDER BY id", [now, institutionId, institutionId]);
  for (const campaign of running) {
    try {
      await runCampaign(campaign, now, tally);
    } catch (err) {
      logger.error({ err: err.message, campaignId: campaign.id }, "Broadcast pass failed");
    }
  }

  const finished = await query(
    `SELECT c.id, c.institution_id FROM broadcast_campaigns c
      WHERE c.status = 'sending' AND (? IS NULL OR c.institution_id = ?)
        AND NOT EXISTS (SELECT 1 FROM broadcast_recipients r WHERE r.campaign_id = c.id AND r.status IN ('pending', 'sending'))`,
    [institutionId, institutionId]
  );
  for (const c of finished) {
    const done = await query("UPDATE broadcast_campaigns SET status = 'completed', finished_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'sending'", [c.id]);
    if (done.affectedRows) {
      tally.completed++;
      emitToTenant(c.institution_id, "broadcast:completed", { campaignId: c.id });
    }
  }
  return tally;
}
