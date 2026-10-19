import { query, queryOne } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { emitToTenant } from "../../realtime.js";
import { sendText } from "../channels/channelService.js";
import { getCommerceSettings } from "../commerce/commerceSettings.js";
import { getActiveDraft } from "../commerce/draftRepository.js";
import { priceLines } from "../commerce/draftModel.js";
import { loadCatalog } from "../commerce/catalog.js";
import { cartReminderText, unpaidReminderText } from "../commerce/messages.js";
import { isHumanHolding } from "../handoff/handoffPolicy.js";
import { cancelOrderSystem } from "../orderCancellation.js";
import { getRoutingSettings } from "../routing/routingSettings.js";
import { canPush, nextAllowedTime, planSchedule, withinMessagingWindow } from "./followupPolicy.js";

/**
 * Reminders for customers who stopped before paying (an order waiting for payment) or before finishing (a cart).
 * Jobs live in proactive_followup_jobs; a worker sends the ones that are due. Everything that could make a reminder
 * unwelcome is checked twice: when it is planned and again at the moment it would be sent.
 */

const IN_FLIGHT_TIMEOUT_MINUTES = 10;
/** After a reminder goes out, the next one for the same order or cart waits at least this long (a worker that was down must not send all steps at once). */
const MIN_GAP_MINUTES = 30;

/** Reminders for an order that is waiting for payment. COD orders are not "unpaid", so they get none. */
export async function scheduleOrderFollowups({ institutionId, leadId, orderId, from = new Date() }) {
  return schedule({ institutionId, leadId, reason: "abandoned_qris", target: { orderId }, from });
}

/** Reminders for a cart the customer has not finished. */
export async function scheduleCartFollowups({ institutionId, leadId, draftId, from = new Date() }) {
  return schedule({ institutionId, leadId, reason: "abandoned_cart", target: { draftId }, from });
}

async function schedule({ institutionId, leadId, reason, target, from }) {
  const settings = await getCommerceSettings(institutionId);
  if (!settings.enabled || !settings.followupEnabled) return { scheduled: 0 };

  const lead = await queryOne("SELECT channel_type, followup_opt_out FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!lead || lead.followup_opt_out || !canPush(lead.channel_type)) return { scheduled: 0 };

  // one sequence at a time for the same target
  await cancelPending({ ...target, status: "cancelled" });

  const times = planSchedule({
    delaysMinutes: settings.followupDelays,
    from,
    channelType: lead.channel_type,
    quietStartHour: settings.quietStartHour,
    quietEndHour: settings.quietEndHour,
  });
  for (const [index, at] of times.entries()) {
    await query(
      "INSERT INTO proactive_followup_jobs (institution_id, lead_id, order_id, draft_id, step_number, trigger_reason, scheduled_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
      [institutionId, leadId, target.orderId ?? null, target.draftId ?? null, index + 1, reason, at]
    );
  }
  return { scheduled: times.length };
}

/** Stop pending reminders for an order, a draft, or everything for a contact. */
export async function cancelPending({ orderId, draftId, leadId, status }) {
  const where = [];
  const params = [status];
  if (orderId) (where.push("order_id = ?"), params.push(orderId));
  if (draftId) (where.push("draft_id = ?"), params.push(draftId));
  if (leadId) (where.push("lead_id = ?"), params.push(leadId));
  if (!where.length) return 0;
  const result = await query(`UPDATE proactive_followup_jobs SET status = ? WHERE status = 'pending' AND (${where.join(" OR ")})`, params);
  return result.affectedRows;
}

/**
 * The customer wrote: their old reminders are moot. If they still have something open (an unpaid order, a cart), the
 * sequence starts over from now, so a customer who is actively talking is never nagged by a reminder planned earlier.
 */
export async function onCustomerActivity({ institutionId, leadId }) {
  const settings = await getCommerceSettings(institutionId);
  if (!settings.enabled) return { restarted: false, cancelled: 0 };
  const cancelled = await cancelPending({ leadId, status: "cancelled_by_reply" });
  if (!settings.followupEnabled) return { restarted: false, cancelled };

  const unpaid = await queryOne(
    "SELECT id FROM orders WHERE institution_id = ? AND lead_id = ? AND status = 'waiting_payment' AND payment_method <> 'cod' ORDER BY id DESC LIMIT 1",
    [institutionId, leadId]
  );
  if (unpaid) {
    await scheduleOrderFollowups({ institutionId, leadId, orderId: unpaid.id });
    return { restarted: true, cancelled };
  }
  const draft = await getActiveDraft(institutionId, leadId);
  if (draft && draft.items.length) {
    await scheduleCartFollowups({ institutionId, leadId, draftId: draft.id });
    return { restarted: true, cancelled };
  }
  return { restarted: false, cancelled };
}

// ---------------------------------------------------------------- sending

/** Why a due reminder must not go out after all, or null. */
async function blockReason(job, settings, lead, now) {
  if (lead.followup_opt_out) return "cancelled";
  if (!canPush(lead.channel_type) || !withinMessagingWindow(lead.channel_type, lead.last_inbound_at, now)) return "skipped_window";
  const routing = await getRoutingSettings(job.institution_id);
  if (isHumanHolding(lead, routing.humanHoldMinutes, now)) return "cancelled_by_human";
  return null;
}

async function composeText(job, institutionId, settings) {
  if (job.order_id) {
    const order = await queryOne("SELECT order_number, total_amount, status, payment_method, created_at FROM orders WHERE id = ? AND institution_id = ?", [job.order_id, institutionId]);
    if (!order || order.status !== "waiting_payment") return { skip: "cancelled_by_payment" };
    const last = await queryOne("SELECT MAX(step_number) AS last FROM proactive_followup_jobs WHERE order_id = ? AND status IN ('pending', 'sending')", [job.order_id]);
    return {
      text: unpaidReminderText({
        step: job.step_number,
        isLast: Number(last?.last) === job.step_number,
        orderNumber: order.order_number,
        total: order.total_amount,
        paymentMethod: order.payment_method,
        autoCancelHours: settings.unpaidCancelHours,
      }),
    };
  }
  const draft = await queryOne("SELECT id, active, items_json FROM order_drafts WHERE id = ? AND institution_id = ?", [job.draft_id, institutionId]);
  if (!draft || !draft.active) return { skip: "cancelled" };
  const { lines } = priceLines(parseJsonColumn(draft.items_json, []), await loadCatalog(institutionId));
  return lines.length ? { text: cartReminderText({ lines }) } : { skip: "cancelled" };
}

/**
 * Send what is due. Jobs are claimed one at a time with a conditional update, so several workers (or a slow
 * run overlapping the next one) never send the same reminder twice.
 * @param {number} [p.institutionId] only this tenant's reminders (the worker runs for all of them)
 * @returns {Promise<{ sent: number, skipped: number, failed: number }>}
 */
export async function runDueFollowups({ now = new Date(), limit = 50, institutionId = null } = {}) {
  // a worker that died mid-send leaves its claim behind: release it
  await query(
    "UPDATE proactive_followup_jobs SET status = 'pending', claimed_at = NULL WHERE status = 'sending' AND claimed_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)",
    [IN_FLIGHT_TIMEOUT_MINUTES]
  );

  const due = await query(
    "SELECT * FROM proactive_followup_jobs WHERE status = 'pending' AND scheduled_at <= ? AND (order_id IS NOT NULL OR draft_id IS NOT NULL) AND (? IS NULL OR institution_id = ?) ORDER BY scheduled_at ASC LIMIT ?",
    [now, institutionId, institutionId, limit]
  );
  const tally = { sent: 0, skipped: 0, failed: 0 };
  const handled = new Set(); // one step per order or cart per run

  for (const job of due) {
    const target = job.order_id ? `order:${job.order_id}` : `draft:${job.draft_id}`;
    if (handled.has(target)) continue;
    handled.add(target);
    const claim = await query("UPDATE proactive_followup_jobs SET status = 'sending', claimed_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'pending'", [job.id]);
    if (claim.affectedRows === 0) continue;
    const finish = (status, error = null) => query("UPDATE proactive_followup_jobs SET status = ?, executed_at = UTC_TIMESTAMP(), error = ? WHERE id = ?", [status, error, job.id]);

    try {
      const settings = await getCommerceSettings(job.institution_id);
      const lead = await queryOne(
        "SELECT id, channel_id, channel_type, external_id, phone_number, last_inbound_at, followup_opt_out, handled_by, handoff_at FROM leads WHERE id = ? AND institution_id = ?",
        [job.lead_id, job.institution_id]
      );
      if (!settings.enabled || !settings.followupEnabled || !lead) {
        await finish("cancelled");
        tally.skipped++;
        continue;
      }

      const blocked = await blockReason(job, settings, lead, now);
      if (blocked) {
        await finish(blocked);
        tally.skipped++;
        continue;
      }

      // Quiet hours can begin between planning and sending (a late worker): wait for morning if the window allows it.
      const allowed = nextAllowedTime(now, settings.quietStartHour, settings.quietEndHour);
      if (allowed.getTime() > now.getTime()) {
        if (withinMessagingWindow(lead.channel_type, lead.last_inbound_at, allowed)) {
          await query("UPDATE proactive_followup_jobs SET status = 'pending', claimed_at = NULL, scheduled_at = ? WHERE id = ?", [allowed, job.id]);
        } else {
          await finish("skipped_window");
        }
        tally.skipped++;
        continue;
      }

      const composed = await composeText(job, job.institution_id, settings);
      if (composed.skip) {
        await finish(composed.skip);
        tally.skipped++;
        continue;
      }

      const sent = await sendText({ institutionId: job.institution_id, channelId: lead.channel_id, type: lead.channel_type, to: lead.external_id ?? lead.phone_number, text: composed.text });
      await query(
        `INSERT INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, message_type, content_text, is_delivered, delivery_error, meta_json)
         VALUES (?, ?, ?, ?, 'ai_agent', 'text', ?, ?, ?, ?)`,
        [
          job.institution_id,
          job.lead_id,
          lead.channel_id,
          sent.messageId ?? null,
          composed.text,
          sent.success ? 1 : 0,
          sent.success ? null : String(sent.error).slice(0, 250),
          JSON.stringify({ followup: { step: job.step_number, reason: job.trigger_reason } }),
        ]
      );
      if (sent.success) {
        emitToTenant(job.institution_id, "chat:message", { leadId: job.lead_id, direction: "outbound", text: composed.text, sender: "ai_agent" });
        await finish("sent");
        await query(
          "UPDATE proactive_followup_jobs SET scheduled_at = GREATEST(scheduled_at, ?) WHERE status = 'pending' AND order_id <=> ? AND draft_id <=> ?",
          [new Date(now.getTime() + MIN_GAP_MINUTES * 60_000), job.order_id, job.draft_id]
        );
        tally.sent++;
      } else {
        await finish("failed", String(sent.error).slice(0, 250));
        tally.failed++;
      }
    } catch (err) {
      logger.error({ err: err.message, jobId: job.id }, "Reminder failed");
      await query("UPDATE proactive_followup_jobs SET status = 'failed', executed_at = UTC_TIMESTAMP(), error = ? WHERE id = ?", [String(err.message).slice(0, 250), job.id]).catch(() => {});
      tally.failed++;
    }
  }
  return tally;
}

/** Statistics and the next reminders, for the dashboard. */
export async function followupOverview(institutionId) {
  const [counts, upcoming] = await Promise.all([
    query("SELECT status, COUNT(*) AS n FROM proactive_followup_jobs WHERE institution_id = ? AND (order_id IS NOT NULL OR draft_id IS NOT NULL) GROUP BY status", [institutionId]),
    query(
      `SELECT j.id, j.lead_id, l.name AS lead_name, j.order_id, j.draft_id, j.step_number, j.trigger_reason, j.scheduled_at
         FROM proactive_followup_jobs j JOIN leads l ON l.id = j.lead_id
        WHERE j.institution_id = ? AND j.status = 'pending' AND (j.order_id IS NOT NULL OR j.draft_id IS NOT NULL)
        ORDER BY j.scheduled_at ASC LIMIT 50`,
      [institutionId]
    ),
  ]);
  return {
    counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
    upcoming: upcoming.map((j) => ({ id: j.id, leadId: j.lead_id, leadName: j.lead_name, orderId: j.order_id, draftId: j.draft_id, step: j.step_number, reason: j.trigger_reason, scheduledAt: j.scheduled_at })),
  };
}

/**
 * Orders that stayed unpaid past the tenant's limit are cancelled and their stock returned. Only orders nobody is
 * dealing with: a payment in flight, a proof waiting for review, or a payment already made keeps the order.
 */
export async function cancelStaleUnpaidOrders({ now = new Date(), limit = 50 } = {}) {
  const tenants = await query("SELECT institution_id, unpaid_cancel_hours FROM commerce_settings WHERE enabled = 1 AND unpaid_cancel_hours > 0");
  let cancelled = 0;
  for (const t of tenants) {
    const cutoff = new Date(now.getTime() - t.unpaid_cancel_hours * 3_600_000);
    const stale = await query(
      `SELECT o.id FROM orders o
        WHERE o.institution_id = ? AND o.status = 'waiting_payment' AND o.created_via = 'chat' AND o.payment_method <> 'cod'
          AND o.review_status IN ('not_required', 'rejected') AND o.created_at <= ?
          AND NOT EXISTS (SELECT 1 FROM payment_proofs p WHERE p.order_id = o.id)
          AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.order_id = o.id AND pay.status = 'paid')
        ORDER BY o.id ASC LIMIT ?`,
      [t.institution_id, cutoff, limit]
    );
    for (const order of stale) {
      if (await cancelOrderSystem(t.institution_id, order.id, "Tidak dibayar sampai batas waktu")) cancelled++;
    }
  }
  return { cancelled };
}
