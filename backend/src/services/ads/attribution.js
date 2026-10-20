import { query, queryOne } from "../../config/db.js";

/**
 * Which ad brought a customer. A Click-to-WhatsApp ad hands the first message a `referral` with the ad's id and a
 * click id (ctwa_clid). We keep every referral, remember the first ad a contact came from (that is what reports
 * credit), and keep the latest click id (that is what Meta needs to credit a purchase).
 */

/**
 * @param {{ source_id?: string, source_type?: string, source_url?: string, headline?: string, media_type?: string, ctwa_clid?: string }|null} referral
 */
export async function recordAdReferral({ institutionId, leadId, referral, leadIsNew = false }) {
  if (!referral || (!referral.source_id && !referral.ctwa_clid)) return { recorded: false };
  const adId = String(referral.source_id || "unknown").slice(0, 100);
  const clickId = referral.ctwa_clid ? String(referral.ctwa_clid).slice(0, 255) : null;

  // the same click is not recorded twice (Meta repeats the referral on retries)
  if (clickId) {
    const seen = await queryOne("SELECT id FROM meta_ad_referrals WHERE lead_id = ? AND ctwa_clid = ?", [leadId, clickId]);
    if (seen) return { recorded: false };
  }

  await query(
    "INSERT INTO meta_ad_referrals (institution_id, lead_id, ad_id, headline, source_url, ctwa_clid, source_type, media_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [institutionId, leadId, adId, referral.headline ? String(referral.headline).slice(0, 255) : null, referral.source_url ? String(referral.source_url).slice(0, 500) : null, clickId, referral.source_type ? String(referral.source_type).slice(0, 20) : null, referral.media_type ? String(referral.media_type).slice(0, 20) : null]
  );
  await query(
    `UPDATE leads SET meta_ad_id = COALESCE(meta_ad_id, ?), ctwa_clid = COALESCE(?, ctwa_clid), source = IF(? = 1 AND source = 'whatsapp', 'meta_ads', source)
      WHERE id = ? AND institution_id = ?`,
    [adId === "unknown" ? null : adId, clickId, leadIsNew ? 1 : 0, leadId, institutionId]
  );
  return { recorded: true, adId };
}
