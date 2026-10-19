import { config } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { badRequest } from "../../../utils/errors.js";
import { randomToken } from "../../../utils/crypto.js";
import { fetchMedia } from "../mediaFetch.js";
import { stripChatMarkup } from "../textUtils.js";

/**
 * Telegram bot. The owner creates a bot with @BotFather and pastes its token; connecting registers our webhook for
 * that bot, protected by a secret Telegram sends back in a header on every update.
 *
 * `channel` is { externalId (the bot id), accessToken (the bot token), config: { webhookSecret } }.
 * A customer is identified by their chat id with the bot.
 */

const TOKEN_FORMAT = /^(\d{5,15}):[A-Za-z0-9_-]{30,60}$/;
const CHAT_ID = /^-?\d{1,20}$/;
const FILE_HOST = /^api\.telegram\.org$/i;
const MIME_BY_EXTENSION = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

const botApi = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

async function call(token, method, body) {
  const response = await fetch(botApi(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.ok === true, data };
}

/** Message ids repeat across chats and bots, so ours name all three. */
export const telegramMessageId = (botId, chatId, messageId) => `tg:${botId}:${chatId}:${messageId}`;

export const telegramAdapter = {
  type: "telegram",
  maxTextLength: 4000,
  normalizeContactId: (id) => (CHAT_ID.test(String(id ?? "").trim()) ? String(id).trim() : null),
  formatText: stripChatMarkup,

  async send({ channel, to, text }) {
    try {
      const { ok, data } = await call(channel.accessToken, "sendMessage", { chat_id: to, text, disable_web_page_preview: true });
      if (!ok) {
        logger.error({ channel: channel.id, code: data?.error_code }, "Telegram rejected message");
        return { success: false, error: data?.description || "Ditolak oleh Telegram." };
      }
      return { success: true, to, messageId: telegramMessageId(channel.externalId, to, data.result?.message_id) };
    } catch (err) {
      logger.error({ err: err.message, channel: channel.id }, "Telegram send failed");
      return { success: false, error: "Gagal menghubungi Telegram." };
    }
  },

  /** A file the customer sent: ask for its path, then fetch it from Telegram's file host. */
  async downloadMedia({ channel, mediaId }) {
    if (!mediaId) return null;
    const { ok, data } = await call(channel.accessToken, "getFile", { file_id: mediaId });
    const path = data?.result?.file_path;
    if (!ok || !path) return null;
    const mimeType = MIME_BY_EXTENSION[String(path).split(".").pop().toLowerCase()];
    if (!mimeType) return null;
    return fetchMedia({ url: `https://api.telegram.org/file/bot${channel.accessToken}/${path}`, allowedHosts: FILE_HOST, mimeType });
  },

  async verify(channel) {
    try {
      const { ok, data } = await call(channel.accessToken, "getMe");
      if (!ok) return { ok: false, error: data?.description || "Token bot ditolak Telegram." };
      return { ok: true, username: data.result?.username ?? null, name: data.result?.first_name ?? null };
    } catch {
      return { ok: false, error: "Tidak dapat menghubungi Telegram." };
    }
  },

  /** Check the token and learn which bot it is; nothing is changed on Telegram yet. */
  async resolveConnection({ accessToken }) {
    const token = String(accessToken || "").trim();
    if (!TOKEN_FORMAT.test(token)) throw badRequest("Format token bot tidak valid. Salin token utuh dari @BotFather.", { code: "CHANNEL_CONNECT_FAILED" });
    const { ok, data } = await call(token, "getMe").catch(() => ({ ok: false, data: {} }));
    if (!ok) throw badRequest(`Token bot ditolak Telegram: ${data?.description || "tidak diketahui"}`, { code: "CHANNEL_CONNECT_FAILED" });
    return {
      externalId: String(data.result.id),
      displayHandle: data.result.username ? `@${data.result.username}` : null,
      accessToken: token,
      config: { webhookSecret: randomToken(24) },
    };
  },

  /** Point the bot at our webhook. Telegram then sends every update with the secret in X-Telegram-Bot-Api-Secret-Token. */
  async activate(channel) {
    try {
      const { ok, data } = await call(channel.accessToken, "setWebhook", {
        url: `${config.appUrl}/api/v1/webhooks/telegram/${channel.externalId}`,
        secret_token: channel.config.webhookSecret,
        allowed_updates: ["message"],
        drop_pending_updates: true,
      });
      return ok ? { ok: true } : { ok: false, error: `Telegram menolak webhook: ${data?.description || "tidak diketahui"}` };
    } catch {
      return { ok: false, error: "Tidak dapat menghubungi Telegram untuk mengaktifkan webhook." };
    }
  },

  /** Stop Telegram from calling us for a bot that is being disconnected. Best effort. */
  async deactivate(channel) {
    try {
      await call(channel.accessToken, "deleteWebhook", { drop_pending_updates: true });
    } catch (err) {
      logger.warn({ err: err.message, channel: channel.id }, "Telegram webhook removal failed");
    }
  },
};
