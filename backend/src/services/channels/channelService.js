import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { getAdapter } from "./adapters/index.js";
import { loadDefaultChannel, loadTransportChannel } from "./channelRepository.js";

/**
 * Sending through a tenant's connected accounts, whatever the channel type. Callers say who to write to and on
 * which channel; this picks the account and hands the text to that channel's adapter.
 */

const NOT_CONFIGURED = {
  whatsapp: "WhatsApp belum dikonfigurasi untuk instansi ini.",
};

/** The channel a conversation is on, else the tenant's default of that type. Null when nothing is connected. */
export async function resolveChannel({ institutionId, channelId = null, type = "whatsapp" }) {
  if (channelId) {
    const channel = await loadTransportChannel(institutionId, channelId);
    if (channel) return channel;
  }
  return loadDefaultChannel(institutionId, type);
}

/**
 * Send a text message to a contact.
 * Without a connected channel the message is only simulated outside production, and refused in production.
 * @returns {Promise<{ success: boolean, messageId?: string|null, error?: string, mode?: string }>}
 */
export async function sendText({ institutionId, channelId = null, type = "whatsapp", to, text }) {
  const adapter = getAdapter(type);
  const recipient = adapter.normalizeContactId(to);
  if (!recipient || !text) return { success: false, error: "Nomor tujuan dan teks wajib diisi." };

  let channel;
  try {
    channel = await resolveChannel({ institutionId, channelId, type });
  } catch (err) {
    logger.error({ err: err.message, institutionId }, "Cannot read channel credentials");
    return { success: false, error: "Kredensial kanal tidak dapat dibaca." };
  }

  if (!channel) {
    if (config.isProduction) return { success: false, error: NOT_CONFIGURED[type] || "Kanal belum dikonfigurasi untuk instansi ini." };
    logger.info({ to: recipient }, "[sandbox] message not sent (no channel configured)");
    return { success: true, mode: "sandbox_simulated", to: recipient, messageId: null };
  }
  return adapter.send({ channel, to: recipient, text });
}

/** Tell the customer's app the message was read. Best effort, never throws. */
export async function markRead({ institutionId, channelId = null, type = "whatsapp", messageId }) {
  try {
    const channel = await resolveChannel({ institutionId, channelId, type });
    if (!channel) return { success: false };
    return await getAdapter(type).markRead({ channel, messageId });
  } catch (err) {
    logger.warn({ err: err.message }, "mark-read failed");
    return { success: false };
  }
}

/** Download a file a customer sent. Null when there is no channel or the file is unusable. */
export async function downloadMedia({ institutionId, channelId = null, type = "whatsapp", mediaId }) {
  const channel = await resolveChannel({ institutionId, channelId, type });
  if (!channel) return null;
  return getAdapter(type).downloadMedia({ channel, mediaId });
}

/** Check a stored channel's credentials with its platform. */
export async function verifyChannel({ institutionId, id }) {
  const channel = await loadTransportChannel(institutionId, id);
  if (!channel) return { ok: false, error: "Kanal tidak ditemukan atau tidak aktif." };
  if (!channel.accessToken) return { ok: false, error: "Kanal ini belum punya access token." };
  return getAdapter(channel.type).verify(channel);
}
