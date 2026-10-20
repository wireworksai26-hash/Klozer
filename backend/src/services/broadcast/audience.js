import { query, queryOne } from "../../config/db.js";

/**
 * Who a campaign goes to: a filter over the tenant's WhatsApp contacts. Whatever the filter says, a contact who opted
 * out is never included, a marketing campaign only reaches contacts who opted in, and (for marketing) nobody who was
 * sent a campaign message within the frequency cap.
 */

export const LEAD_STATUSES = ["new", "in_progress", "closing", "repeat", "idle", "closed_lost"];
const PAID = "('paid', 'processing', 'shipped', 'delivered', 'completed')";

/**
 * @typedef {object} Audience
 * @property {string[]} [statuses] lead statuses
 * @property {number[]} [labelIds] contact labels (any of)
 * @property {string[]} [sources] where the contact came from (e.g. meta_ads)
 * @property {string[]} [adIds] Click-to-WhatsApp ads they came from
 * @property {"never"|"has_order"|"has_paid_order"|null} [orders]
 * @property {string[]} [cities]
 * @property {number} [quietForDays] last contacted at least this many days ago
 * @property {number} [activeWithinDays] last contacted within this many days
 * @property {boolean} [onlyThisNumber] only contacts who chatted with the campaign's number (or were imported); default true
 */

/** SQL (a WHERE tail starting with AND) and its parameters for the filter. */
function conditions({ audience, category, channelId, frequencyCapDays }) {
  const sql = [];
  const params = [];
  const a = audience || {};

  sql.push("l.channel_type = 'whatsapp' AND l.phone_number IS NOT NULL AND l.marketing_consent <> 'opted_out'");
  if (category === "marketing") sql.push("l.marketing_consent = 'opted_in'");
  if (a.onlyThisNumber !== false && channelId) (sql.push("(l.channel_id = ? OR l.channel_id IS NULL)"), params.push(channelId));
  if (a.statuses?.length) (sql.push("l.status IN (?)"), params.push(a.statuses));
  if (a.sources?.length) (sql.push("l.source IN (?)"), params.push(a.sources));
  if (a.adIds?.length) (sql.push("l.meta_ad_id IN (?)"), params.push(a.adIds));
  if (a.cities?.length) (sql.push("l.city IN (?)"), params.push(a.cities));
  if (a.labelIds?.length) (sql.push("EXISTS (SELECT 1 FROM leads_labels_map m WHERE m.lead_id = l.id AND m.label_id IN (?))"), params.push(a.labelIds));
  if (a.orders === "never") sql.push("NOT EXISTS (SELECT 1 FROM orders o WHERE o.lead_id = l.id AND o.status <> 'cancelled')");
  if (a.orders === "has_order") sql.push("EXISTS (SELECT 1 FROM orders o WHERE o.lead_id = l.id AND o.status <> 'cancelled')");
  if (a.orders === "has_paid_order") sql.push(`EXISTS (SELECT 1 FROM orders o WHERE o.lead_id = l.id AND o.status IN ${PAID})`);
  if (a.quietForDays) (sql.push("COALESCE(l.last_contacted_at, l.created_at) <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)"), params.push(a.quietForDays));
  if (a.activeWithinDays) (sql.push("COALESCE(l.last_contacted_at, l.created_at) >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)"), params.push(a.activeWithinDays));
  if (category === "marketing" && frequencyCapDays > 0) {
    sql.push("NOT EXISTS (SELECT 1 FROM broadcast_recipients r WHERE r.lead_id = l.id AND r.status IN ('sent', 'delivered', 'read') AND r.sent_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY))");
    params.push(frequencyCapDays);
  }
  return { where: sql.join(" AND "), params };
}

/** How many contacts the filter reaches right now, and a few of them (name and a masked number) as a sanity check. */
export async function previewAudience({ institutionId, audience, category, channelId, frequencyCapDays }) {
  const { where, params } = conditions({ audience, category, channelId, frequencyCapDays });
  const base = [institutionId, ...params];
  const total = await queryOne(`SELECT COUNT(*) AS n FROM leads l WHERE l.institution_id = ? AND ${where}`, base);
  const sample = await query(`SELECT l.name, l.phone_number FROM leads l WHERE l.institution_id = ? AND ${where} ORDER BY l.id LIMIT 5`, base);

  // what the consent and frequency rules alone are hiding, so an owner understands a small number
  const open = conditions({ audience, category: "utility", channelId, frequencyCapDays: 0 });
  const withoutConsentRule = category === "marketing" ? await queryOne(`SELECT COUNT(*) AS n FROM leads l WHERE l.institution_id = ? AND ${open.where}`, [institutionId, ...open.params]) : null;
  return {
    count: Number(total.n),
    sample: sample.map((s) => ({ name: s.name, phone: `${String(s.phone_number).slice(0, 5)}****${String(s.phone_number).slice(-3)}` })),
    ...(withoutConsentRule ? { matchingFilterBeforeConsent: Number(withoutConsentRule.n) } : {}),
  };
}

/** The contacts, a page at a time (by id), for freezing a campaign's recipient list. */
export async function fetchAudiencePage({ institutionId, audience, category, channelId, frequencyCapDays, afterId = 0, limit = 500 }) {
  const { where, params } = conditions({ audience, category, channelId, frequencyCapDays });
  return query(`SELECT l.id, l.name, l.city, l.phone_number FROM leads l WHERE l.institution_id = ? AND ${where} AND l.id > ? ORDER BY l.id LIMIT ?`, [institutionId, ...params, afterId, limit]);
}
