import { query, queryOne } from "../../config/db.js";

/**
 * Limits a tenant sets for its own broadcasts. `dailyLimit` is how many different people one WhatsApp number may start
 * a conversation with per 24 hours: Meta caps this by the account's messaging tier (250 until the business is verified,
 * then 1,000 and up), so the tenant enters the tier it actually has.
 */

export const BROADCAST_DEFAULTS = Object.freeze({ dailyLimit: 250, frequencyCapDays: 3, quietStartHour: 21, quietEndHour: 8 });

const fromRow = (row) =>
  row
    ? { dailyLimit: Number(row.daily_limit), frequencyCapDays: Number(row.frequency_cap_days), quietStartHour: Number(row.quiet_start_hour), quietEndHour: Number(row.quiet_end_hour) }
    : { ...BROADCAST_DEFAULTS };

export async function getBroadcastSettings(institutionId) {
  return fromRow(await queryOne("SELECT * FROM broadcast_settings WHERE institution_id = ?", [institutionId]));
}

export async function updateBroadcastSettings(institutionId, patch) {
  const next = { ...(await getBroadcastSettings(institutionId)) };
  for (const key of Object.keys(BROADCAST_DEFAULTS)) if (patch[key] !== undefined) next[key] = patch[key];
  await query(
    `INSERT INTO broadcast_settings (institution_id, daily_limit, frequency_cap_days, quiet_start_hour, quiet_end_hour) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE daily_limit = VALUES(daily_limit), frequency_cap_days = VALUES(frequency_cap_days), quiet_start_hour = VALUES(quiet_start_hour), quiet_end_hour = VALUES(quiet_end_hour)`,
    [institutionId, next.dailyLimit, next.frequencyCapDays, next.quietStartHour, next.quietEndHour]
  );
  return getBroadcastSettings(institutionId);
}
