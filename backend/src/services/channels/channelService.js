import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { badRequest } from "../../utils/errors.js";
import { queryOne } from "../../config/db.js";
import { getAdapter } from "./adapters/index.js";
import { assertWithinLimit, createChannel, deleteChannel, loadDefaultChannel, loadTransportChannel, loadTransportChannelAny } from "./channelRepository.js";
import { splitText } from "./textUtils.js";
import { noteSendOutcome } from "./paymentFlag.js";

/**
 * Sending through a tenant's connected accounts, whatever the channel type. Callers say who to write to and on
 * which channel; this picks the account and hands the text to that channel's adapter.
 */

const NOT_CONFIGURED = {
  whatsapp: "WhatsApp belum dikonfigurasi untuk instansi ini.",
  messenger: "Messenger belum dihubungkan untuk instansi ini.",
  instagram: "Instagram belum dihubungkan untuk instansi ini.",
  telegram: "Telegram belum dihubungkan untuk instansi ini.",
  webchat: "Live chat belum dibuat untuk instansi ini.",
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

  // Platforms cap a message's length and show chat markup differently; a long reply goes out as several messages.
  const parts = splitText(adapter.formatText ? adapter.formatText(text) : text, adapter.maxTextLength);
  let first = null;
  for (const part of parts) {
    const result = await adapter.send({ channel, to: recipient, text: part });
    if (type === "whatsapp") await noteSendOutcome(channel, result);
    if (!result.success) return first ? { ...first, partial: true, error: result.error } : result;
    first ??= result;
  }
  return first ?? { success: false, error: "Teks kosong." };
}

/** Tell the customer's app the message was read. Best effort, never throws. */
export async function markRead({ institutionId, channelId = null, type = "whatsapp", messageId }) {
  try {
    const adapter = getAdapter(type);
    if (!adapter.markRead) return { success: false }; // not every platform has read receipts
    const channel = await resolveChannel({ institutionId, channelId, type });
    return channel ? await adapter.markRead({ channel, messageId }) : { success: false };
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
  const adapter = getAdapter(channel.type);
  if (!channel.accessToken && adapter.requiresToken !== false) return { ok: false, error: "Kanal ini belum punya access token." };
  return adapter.verify(channel);
}

/** The customer's display name from the platform, or null. Best effort: a failure never affects the conversation. */
export async function lookupProfileName({ institutionId, channelId, type, contactId }) {
  const adapter = getAdapter(type);
  if (!adapter.fetchProfile) return null;
  try {
    const channel = await resolveChannel({ institutionId, channelId, type });
    return channel ? await adapter.fetchProfile({ channel, contactId }) : null;
  } catch (err) {
    logger.warn({ err: err.message, type }, "Customer profile lookup failed");
    return null;
  }
}

/**
 * Connect a new account. Order matters because some platforms are changed by connecting (a webhook is registered):
 * check the plan and read-only facts first, save the channel (which also settles who owns the account), and only
 * then register the webhook. If that fails the channel is removed again so nothing half-connected is left.
 * @returns {Promise<{ channel: object }>}
 */
export async function connectChannel({ institutionId, type, name, aiEnabled = true, input }) {
  const adapter = getAdapter(type);
  await assertWithinLimit({ queryOne }, institutionId);
  const resolved = await adapter.resolveConnection(input);

  const channel = await createChannel({
    institutionId,
    type,
    name,
    externalId: resolved.externalId,
    displayHandle: resolved.displayHandle ?? null,
    accessToken: resolved.accessToken ?? null,
    config: resolved.config ?? null,
    aiEnabled,
  });

  if (adapter.activate) {
    const outcome = await adapter.activate(await loadTransportChannel(institutionId, channel.id));
    if (!outcome.ok) {
      await deleteChannel(institutionId, channel.id);
      throw badRequest(outcome.error, { code: "CHANNEL_ACTIVATION_FAILED" });
    }
  }
  return { channel };
}

/** Remove a channel and, where the platform needs it, stop the platform calling us for it. */
export async function disconnectChannel(institutionId, id) {
  const transport = await loadTransportChannelAny(institutionId, id);
  await deleteChannel(institutionId, id); // 404 when it is not this tenant's
  if (transport) await getAdapter(transport.type).deactivate?.(transport);
}
