/**
 * When a reminder may be sent. Pure functions over dates and settings.
 *
 * Three limits shape every reminder:
 *  - the messaging window: WhatsApp, Messenger and Instagram only accept free-form messages for 24 hours after the
 *    customer's last message (approved templates are needed after that), so reminders stay inside it;
 *  - quiet hours (Jakarta time): no reminders at night, they wait for the morning;
 *  - the customer's own wishes: asking to stop ends all reminders (checked by the caller).
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Window length, and the margin kept so a reminder never races the platform's cut-off. */
export const WINDOW_HOURS = 24;
export const WINDOW_MARGIN_MINUTES = 30;

/** Channels that can deliver a message the customer did not just ask for. A web chat visitor may have left the page. */
const PUSH_CHANNELS = new Set(["whatsapp", "messenger", "instagram", "telegram"]);
const WINDOWED_CHANNELS = new Set(["whatsapp", "messenger", "instagram"]);

export const canPush = (channelType) => PUSH_CHANNELS.has(channelType);

/** Hour of day (0-23) in Jakarta. */
export const wibHour = (date) => new Date(date.getTime() + WIB_OFFSET_MS).getUTCHours();

export function inQuietHours(date, startHour, endHour) {
  if (startHour === endHour) return false; // no quiet hours
  const h = wibHour(date);
  return startHour < endHour ? h >= startHour && h < endHour : h >= startHour || h < endHour;
}

/** The first moment at or after `date` that is not in quiet hours (the quiet period's end, on the hour, Jakarta time). */
export function nextAllowedTime(date, startHour, endHour) {
  if (!inQuietHours(date, startHour, endHour)) return date;
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const end = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), endHour, 0, 0));
  if (end.getTime() <= wib.getTime()) end.setUTCDate(end.getUTCDate() + 1);
  return new Date(end.getTime() - WIB_OFFSET_MS);
}

/**
 * Can a free-form message still be sent at `at`, given when the customer last wrote?
 * Telegram has no window; web chat is not a push channel at all.
 */
export function withinMessagingWindow(channelType, lastInboundAt, at = new Date()) {
  if (!canPush(channelType)) return false;
  if (!WINDOWED_CHANNELS.has(channelType)) return true;
  if (!lastInboundAt) return false;
  const limit = (WINDOW_HOURS * 60 - WINDOW_MARGIN_MINUTES) * 60_000;
  return at.getTime() - new Date(lastInboundAt).getTime() < limit;
}

/**
 * Times for the reminders of one sequence, after quiet hours are applied and the ones that would fall outside the
 * messaging window are dropped.
 * @param {object} p
 * @param {number[]} p.delaysMinutes minutes after `from` for step 1, 2, 3
 * @param {Date} p.from the customer's last activity
 */
export function planSchedule({ delaysMinutes, from, channelType, quietStartHour, quietEndHour }) {
  if (!canPush(channelType)) return [];
  const times = [];
  let previous = from.getTime();
  for (const minutes of delaysMinutes) {
    const wanted = new Date(Math.max(from.getTime() + minutes * 60_000, previous + HOUR_MS / 2));
    const at = nextAllowedTime(wanted, quietStartHour, quietEndHour);
    if (!withinMessagingWindow(channelType, from, at)) break;
    times.push(at);
    previous = at.getTime();
  }
  return times;
}
