import { query, queryOne } from "../../config/db.js";

/**
 * Return on ad spend, from three things we really have: what was spent (ad_spend_daily), who came from which ad
 * (leads.meta_ad_id, set from the Click-to-WhatsApp referral) and what those contacts paid for (orders). Revenue and
 * leads are credited to the ad the contact first came from. Nothing is estimated: a figure with no data behind it
 * (ROAS with no spend, cost per lead with no leads) is null.
 */

const PAID = "('paid', 'processing', 'shipped', 'delivered', 'completed')";

const ratio = (a, b, digits = 2) => (b > 0 ? Math.round((a / b) * 10 ** digits) / 10 ** digits : null);

/** Derived figures for a bucket of raw sums. */
export function withMetrics(b) {
  return {
    ...b,
    roas: ratio(b.revenue, b.spend),
    profitRoas: ratio(b.grossProfit, b.spend),
    costPerLead: ratio(b.spend, b.leads, 0),
    costPerOrder: ratio(b.spend, b.orders, 0),
    costPerClick: ratio(b.spend, b.clicks, 0),
    conversionPercent: b.leads > 0 ? Math.round((b.orders / b.leads) * 1000) / 10 : null,
  };
}

const emptyBucket = () => ({ spend: 0, impressions: 0, clicks: 0, leads: 0, orders: 0, revenue: 0, grossProfit: 0 });

function add(bucket, part) {
  for (const k of Object.keys(part)) if (typeof part[k] === "number") bucket[k] = (bucket[k] ?? 0) + part[k];
  return bucket;
}

/**
 * Merge spend, leads and orders by ad, then (when asked) roll the ads up into their campaigns.
 * @param {{ adId: string, campaignId: string, adName: string|null, campaignName: string|null, spend: number, impressions: number, clicks: number }[]} spendRows
 * @param {{ adId: string, leads: number }[]} leadRows
 * @param {{ adId: string, orders: number, revenue: number, grossProfit: number }[]} orderRows
 * @param {"ad"|"campaign"} groupBy
 */
export function mergeByAd({ spendRows, leadRows, orderRows, groupBy }) {
  const ads = new Map(); // adId -> { id, name, campaignId, campaignName, ...sums }
  const slot = (adId) => {
    if (!ads.has(adId)) ads.set(adId, { id: adId, name: null, campaignId: "", campaignName: null, ...emptyBucket() });
    return ads.get(adId);
  };
  for (const s of spendRows) {
    const a = slot(s.adId);
    a.name ??= s.adName;
    // an ad reported with a campaign keeps it; spend entered for a campaign only has no ad
    if (s.campaignId) (a.campaignId = s.campaignId), (a.campaignName ??= s.campaignName);
    add(a, { spend: s.spend, impressions: s.impressions, clicks: s.clicks });
  }
  for (const l of leadRows) add(slot(l.adId), { leads: l.leads });
  for (const o of orderRows) add(slot(o.adId), { orders: o.orders, revenue: o.revenue, grossProfit: o.grossProfit });

  if (groupBy === "ad") return [...ads.values()].map(withMetrics);

  const campaigns = new Map();
  for (const a of ads.values()) {
    const key = a.campaignId || "";
    if (!campaigns.has(key)) campaigns.set(key, { id: key, name: a.campaignName, ...emptyBucket() });
    const c = campaigns.get(key);
    c.name ??= a.campaignName;
    add(c, a);
  }
  return [...campaigns.values()].map(withMetrics);
}

export const sumBuckets = (rows) => withMetrics(rows.reduce((acc, r) => add(acc, r), emptyBucket()));

/**
 * @param {{ institutionId: number, from: string, to: string, groupBy?: "ad"|"campaign"|"day" }} p dates as YYYY-MM-DD, inclusive
 */
export async function roasReport({ institutionId, from, to, groupBy = "campaign" }) {
  const fromTs = `${from} 00:00:00`;
  const toTs = `${to} 23:59:59`;

  if (groupBy === "day") return dailyReport({ institutionId, from, to, fromTs, toTs });

  const [spend, leads, orders, organic] = await Promise.all([
    query("SELECT ad_id, campaign_id, MAX(ad_name) AS ad_name, MAX(campaign_name) AS campaign_name, SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(clicks) AS clicks FROM ad_spend_daily WHERE institution_id = ? AND spend_date BETWEEN ? AND ? GROUP BY ad_id, campaign_id", [institutionId, from, to]),
    query("SELECT meta_ad_id AS ad_id, COUNT(*) AS leads FROM leads WHERE institution_id = ? AND meta_ad_id IS NOT NULL AND created_at BETWEEN ? AND ? GROUP BY meta_ad_id", [institutionId, fromTs, toTs]),
    query(
      `SELECT l.meta_ad_id AS ad_id, COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS revenue, COALESCE(SUM(o.gross_profit), 0) AS profit
         FROM orders o JOIN leads l ON l.id = o.lead_id WHERE o.institution_id = ? AND l.meta_ad_id IS NOT NULL AND o.status IN ${PAID} AND o.created_at BETWEEN ? AND ? GROUP BY l.meta_ad_id`,
      [institutionId, fromTs, toTs]
    ),
    queryOne(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS revenue FROM orders o JOIN leads l ON l.id = o.lead_id
        WHERE o.institution_id = ? AND l.meta_ad_id IS NULL AND o.status IN ${PAID} AND o.created_at BETWEEN ? AND ?`,
      [institutionId, fromTs, toTs]
    ),
  ]);

  const rows = mergeByAd({
    spendRows: spend.map((s) => ({ adId: s.ad_id || "", campaignId: s.campaign_id || "", adName: s.ad_name, campaignName: s.campaign_name, spend: Number(s.spend), impressions: Number(s.impressions), clicks: Number(s.clicks) })),
    leadRows: leads.map((l) => ({ adId: l.ad_id, leads: Number(l.leads) })),
    orderRows: orders.map((o) => ({ adId: o.ad_id, orders: Number(o.orders), revenue: Number(o.revenue), grossProfit: Number(o.profit) })),
    groupBy,
  }).sort((a, b) => b.revenue - a.revenue || b.spend - a.spend);

  const totals = sumBuckets(rows);
  const allRevenue = totals.revenue + Number(organic.revenue);
  return {
    range: { from, to },
    groupBy,
    totals,
    rows,
    notFromAds: { orders: Number(organic.orders), revenue: Number(organic.revenue) },
    adsShareOfRevenuePercent: allRevenue > 0 ? Math.round((totals.revenue / allRevenue) * 1000) / 10 : null,
    spendWithoutBreakdown: rows.filter((r) => !r.id && !r.campaignId).reduce((s, r) => s + r.spend, 0),
  };
}

async function dailyReport({ institutionId, from, to, fromTs, toTs }) {
  const [spend, leads, orders] = await Promise.all([
    query("SELECT spend_date AS day, SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(clicks) AS clicks FROM ad_spend_daily WHERE institution_id = ? AND spend_date BETWEEN ? AND ? GROUP BY spend_date", [institutionId, from, to]),
    query("SELECT DATE(created_at) AS day, COUNT(*) AS leads FROM leads WHERE institution_id = ? AND meta_ad_id IS NOT NULL AND created_at BETWEEN ? AND ? GROUP BY DATE(created_at)", [institutionId, fromTs, toTs]),
    query(
      `SELECT DATE(o.created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS revenue, COALESCE(SUM(o.gross_profit), 0) AS profit
         FROM orders o JOIN leads l ON l.id = o.lead_id WHERE o.institution_id = ? AND l.meta_ad_id IS NOT NULL AND o.status IN ${PAID} AND o.created_at BETWEEN ? AND ? GROUP BY DATE(o.created_at)`,
      [institutionId, fromTs, toTs]
    ),
  ]);
  const key = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
  const days = new Map();
  const day = (d) => {
    const k = key(d);
    if (!days.has(k)) days.set(k, { id: k, ...emptyBucket() });
    return days.get(k);
  };
  for (const s of spend) add(day(s.day), { spend: Number(s.spend), impressions: Number(s.impressions), clicks: Number(s.clicks) });
  for (const l of leads) add(day(l.day), { leads: Number(l.leads) });
  for (const o of orders) add(day(o.day), { orders: Number(o.orders), revenue: Number(o.revenue), grossProfit: Number(o.profit) });
  const rows = [...days.values()].sort((a, b) => a.id.localeCompare(b.id)).map(withMetrics);
  return { range: { from, to }, groupBy: "day", totals: sumBuckets(rows), rows };
}

/** ROAS over the last 30 days for the summary report: revenue from ad contacts over spend, or null with no spend. */
export async function recentRoas(institutionId, now = new Date()) {
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const report = await roasReport({ institutionId, from, to, groupBy: "campaign" });
  return report.totals.roas;
}
