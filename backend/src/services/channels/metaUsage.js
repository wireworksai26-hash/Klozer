import { query } from "../../config/db.js";
import { serviceUsage, wibMonthStart } from "../../utils/metaPricing.js";

/**
 * Free-form replies (people and AI) sent from each WhatsApp number this month. Broadcast templates are billed under
 * another rate, so they are left out. An estimate: Meta's own count, shown in the client's Meta billing, is the truth.
 * @returns {Promise<Map<number, ReturnType<typeof serviceUsage>>>} by channel id
 */
export async function whatsappServiceUsage(institutionId, channelIds, now = new Date()) {
  const usage = new Map();
  if (!channelIds.length) return usage;
  const rows = await query(
    `SELECT channel_id, COUNT(*) AS n FROM chat_messages
      WHERE institution_id = ? AND channel_id IN (?) AND sender_type IN ('cs', 'ai_agent') AND is_delivered = 1 AND created_at >= ?
        AND (meta_json IS NULL OR JSON_EXTRACT(meta_json, '$.broadcast') IS NULL)
      GROUP BY channel_id`,
    [institutionId, channelIds, wibMonthStart(now)]
  );
  const counts = new Map(rows.map((r) => [Number(r.channel_id), Number(r.n)]));
  for (const id of channelIds) usage.set(id, serviceUsage(counts.get(id) ?? 0));
  return usage;
}
