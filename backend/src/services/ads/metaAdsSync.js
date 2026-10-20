import { query, queryOne } from "../../config/db.js";
import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { decryptSecret, encryptSecret } from "../../utils/crypto.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { upsertSpend } from "./adSpendService.js";

/**
 * Ad spend from Meta's Marketing API, so the ROAS report does not depend on typing numbers by hand. The tenant gives
 * its ad account id and an access token with the ads_read permission. Spend is stored per day and ad; only accounts
 * billed in rupiah are accepted, because the report is in rupiah and we do not convert currencies.
 */

const GRAPH = () => `https://graph.facebook.com/${config.meta.graphVersion}`;
const MAX_PAGES = 40;
export const SYNC_EVERY_HOURS = 6;

const normalizeAccountId = (id) => `act_${String(id).replace(/^act_/, "")}`;
const isoDate = (d) => d.toISOString().slice(0, 10);

export async function getAdsSettings(institutionId) {
  const row = await queryOne("SELECT ad_account_id, last_synced_at, last_sync_error FROM meta_ads_settings WHERE institution_id = ?", [institutionId]);
  return row ? { configured: true, adAccountId: row.ad_account_id, lastSyncedAt: row.last_synced_at, lastSyncError: row.last_sync_error } : { configured: false, adAccountId: null, lastSyncedAt: null, lastSyncError: null };
}

export async function saveAdsSettings(institutionId, { adAccountId, accessToken }) {
  await query(
    `INSERT INTO meta_ads_settings (institution_id, ad_account_id, encrypted_access_token, last_sync_error) VALUES (?, ?, ?, NULL)
     ON DUPLICATE KEY UPDATE ad_account_id = VALUES(ad_account_id), encrypted_access_token = VALUES(encrypted_access_token), last_sync_error = NULL`,
    [institutionId, adAccountId.replace(/^act_/, ""), encryptSecret(accessToken)]
  );
  return getAdsSettings(institutionId);
}

export async function removeAdsSettings(institutionId) {
  await query("DELETE FROM meta_ads_settings WHERE institution_id = ?", [institutionId]);
}

async function get(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

/** Turn one insights row from Meta into our spend row. */
export function insightToSpend(row) {
  return {
    date: String(row.date_start).slice(0, 10),
    adId: row.ad_id ? String(row.ad_id) : "",
    adName: row.ad_name || null,
    campaignId: row.campaign_id ? String(row.campaign_id) : "",
    campaignName: row.campaign_name || null,
    spend: Math.round(Number(row.spend || 0) * 100) / 100,
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
  };
}

/**
 * Pull spend for the last `days` days.
 * @returns {Promise<{ rows: number, from: string, to: string }>}
 */
export async function syncMetaSpend({ institutionId, days = 30, now = new Date() }) {
  const settings = await queryOne("SELECT * FROM meta_ads_settings WHERE institution_id = ?", [institutionId]);
  if (!settings) throw notFound("Akun iklan Meta belum dihubungkan.");
  const token = decryptSecret(settings.encrypted_access_token);
  const account = normalizeAccountId(settings.ad_account_id);
  const fail = async (message) => {
    await query("UPDATE meta_ads_settings SET last_sync_error = ? WHERE institution_id = ?", [message.slice(0, 250), institutionId]);
    throw badRequest(message, { code: "ADS_SYNC_FAILED" });
  };

  try {
    const info = await get(`${GRAPH()}/${account}?fields=currency`, token);
    if (!info.ok) return await fail(`Meta menolak akses ke akun iklan: ${info.data?.error?.message || "tidak diketahui"}`);
    if (info.data.currency && info.data.currency !== "IDR") return await fail(`Akun iklan ini memakai mata uang ${info.data.currency}. Laporan ROAS hanya mendukung IDR.`);

    const to = isoDate(now);
    const from = isoDate(new Date(now.getTime() - (days - 1) * 86_400_000));
    let url = `${GRAPH()}/${account}/insights?level=ad&fields=${encodeURIComponent("ad_id,ad_name,campaign_id,campaign_name,spend,impressions,clicks")}&time_increment=1&time_range=${encodeURIComponent(JSON.stringify({ since: from, until: to }))}&limit=500`;
    const rows = [];
    for (let page = 0; page < MAX_PAGES && url; page++) {
      const res = await get(url, token);
      if (!res.ok) return await fail(`Gagal mengambil biaya iklan: ${res.data?.error?.message || "tidak diketahui"}`);
      rows.push(...(res.data.data || []).map(insightToSpend));
      const next = res.data.paging?.next;
      url = next && new URL(next).hostname === "graph.facebook.com" ? next : null;
    }
    await upsertSpend(institutionId, rows, "meta");
    await query("UPDATE meta_ads_settings SET last_synced_at = UTC_TIMESTAMP(), last_sync_error = NULL WHERE institution_id = ?", [institutionId]);
    return { rows: rows.length, from, to };
  } catch (err) {
    if (err.code === "ADS_SYNC_FAILED") throw err;
    logger.warn({ err: err.message, institutionId }, "Meta ad spend sync failed");
    return fail("Tidak dapat menghubungi Meta.");
  }
}

/** Accounts whose spend is due for a refresh (never synced, or older than the interval). */
export async function syncDueAccounts({ now = new Date() } = {}) {
  const due = await query(
    "SELECT institution_id FROM meta_ads_settings WHERE last_synced_at IS NULL OR last_synced_at < ?",
    [new Date(now.getTime() - SYNC_EVERY_HOURS * 3600_000)]
  );
  let synced = 0;
  for (const d of due) {
    try {
      await syncMetaSpend({ institutionId: d.institution_id, days: 7, now });
      synced++;
    } catch (err) {
      logger.warn({ err: err.message, institutionId: d.institution_id }, "Scheduled ad spend sync failed");
      await query("UPDATE meta_ads_settings SET last_synced_at = UTC_TIMESTAMP() WHERE institution_id = ?", [d.institution_id]); // do not retry every minute
    }
  }
  return { synced };
}
