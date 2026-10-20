import { query } from "../../config/db.js";
import { notFound } from "../../utils/errors.js";

/**
 * What was spent on ads. Rows come from the owner (typed in, or pasted from an ads report) or from Meta (see
 * metaAdsSync). One row per day and ad (or per day and campaign, or per day for the whole account when the owner
 * has no breakdown); writing the same day and ad again replaces the amount instead of adding to it.
 */

/**
 * @param {{ date: string, campaignId?: string, adId?: string, campaignName?: string, adName?: string, spend: number, impressions?: number, clicks?: number }[]} rows
 * @param {"manual"|"meta"} source
 * @returns {Promise<number>} rows written
 */
export async function upsertSpend(institutionId, rows, source = "manual") {
  if (!rows.length) return 0;
  const values = rows.map((r) => [
    institutionId,
    r.date,
    String(r.campaignId ?? "").slice(0, 100),
    String(r.adId ?? "").slice(0, 100),
    r.campaignName ? String(r.campaignName).slice(0, 200) : null,
    r.adName ? String(r.adName).slice(0, 200) : null,
    r.spend,
    r.impressions ?? 0,
    r.clicks ?? 0,
    source,
  ]);
  for (let i = 0; i < values.length; i += 500) {
    await query(
      `INSERT INTO ad_spend_daily (institution_id, spend_date, campaign_id, ad_id, campaign_name, ad_name, spend, impressions, clicks, source) VALUES ?
       ON DUPLICATE KEY UPDATE spend = VALUES(spend), impressions = VALUES(impressions), clicks = VALUES(clicks),
         campaign_name = COALESCE(VALUES(campaign_name), campaign_name), ad_name = COALESCE(VALUES(ad_name), ad_name), source = VALUES(source)`,
      [values.slice(i, i + 500)]
    );
  }
  return rows.length;
}

export async function listSpend(institutionId, { from, to, limit = 200, offset = 0 } = {}) {
  const where = ["institution_id = ?"];
  const params = [institutionId];
  if (from) (where.push("spend_date >= ?"), params.push(from));
  if (to) (where.push("spend_date <= ?"), params.push(to));
  const rows = await query(`SELECT * FROM ad_spend_daily WHERE ${where.join(" AND ")} ORDER BY spend_date DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return rows.map((r) => ({
    id: Number(r.id),
    date: r.spend_date instanceof Date ? r.spend_date.toISOString().slice(0, 10) : String(r.spend_date).slice(0, 10),
    campaignId: r.campaign_id || null,
    adId: r.ad_id || null,
    campaignName: r.campaign_name,
    adName: r.ad_name,
    spend: Number(r.spend),
    impressions: Number(r.impressions),
    clicks: Number(r.clicks),
    source: r.source,
  }));
}

export async function deleteSpend(institutionId, id) {
  const result = await query("DELETE FROM ad_spend_daily WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!result.affectedRows) throw notFound("Data biaya iklan tidak ditemukan.");
}
