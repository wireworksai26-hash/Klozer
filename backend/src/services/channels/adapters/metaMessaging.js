import { config } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { fetchMedia } from "../mediaFetch.js";
import { stripChatMarkup } from "../textUtils.js";

/**
 * Facebook Messenger and Instagram direct messages share one API (Graph API "messages" on a page or an Instagram
 * business account) and one set of rules, so both adapters are built from this factory. They differ in the
 * account id, the text limit and how an account is looked up when connecting.
 *
 * `channel` is { externalId, accessToken (decrypted page token), config: { pageId } }.
 * A customer is identified by the id the platform gives them for this page (PSID / IGSID): digits only.
 */

// Customer media is served from the platform's own CDNs; anything else is refused.
const MEDIA_HOSTS = /(^|\.)(fbcdn\.net|facebook\.com|fbsbx\.com|cdninstagram\.com)$/i;
const CONTACT_ID = /^\d{5,30}$/;

const graphUrl = (path) => `https://graph.facebook.com/${config.meta.graphVersion}/${encodeURIComponent(path)}`;
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function graphGet(path, token, fields) {
  const response = await fetch(`${graphUrl(path)}?fields=${encodeURIComponent(fields)}`, { headers: auth(token), signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

/** Meta error code 10 / subcodes for "outside the allowed window" mean the 24-hour reply window has closed. */
function explain(error) {
  const outsideWindow = error?.code === 10 || [2018278, 2534022, 2018108].includes(error?.error_subcode);
  if (outsideWindow) return "Di luar jendela balasan 24 jam: pelanggan harus mengirim pesan lebih dulu agar bisa dibalas.";
  return error?.message || "Ditolak oleh Meta.";
}

/**
 * @param {{ type: "messenger"|"instagram", label: string, maxTextLength: number, accountFields: string }} spec
 */
export function createMetaMessagingAdapter({ type, label, maxTextLength, accountFields }) {
  return {
    type,
    maxTextLength,
    normalizeContactId: (id) => (CONTACT_ID.test(String(id ?? "").trim()) ? String(id).trim() : null),
    formatText: stripChatMarkup,

    async send({ channel, to, text }) {
      try {
        const response = await fetch(`${graphUrl(channel.externalId)}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth(channel.accessToken) },
          body: JSON.stringify({ recipient: { id: to }, messaging_type: "RESPONSE", message: { text } }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          logger.error({ channel: channel.id, error: data?.error }, `${label} API rejected message`);
          return { success: false, error: explain(data?.error) };
        }
        return { success: true, to, messageId: data?.message_id ?? null };
      } catch (err) {
        logger.error({ err: err.message, channel: channel.id }, `${label} send failed`);
        return { success: false, error: `Gagal menghubungi ${label}.` };
      }
    },

    /** A customer's file: the webhook carries its CDN address, which is fetched without credentials. */
    downloadMedia({ mediaId }) {
      return fetchMedia({ url: mediaId, allowedHosts: MEDIA_HOSTS });
    },

    /** The customer's display name, when the platform will tell us. Best effort. */
    async fetchProfile({ channel, contactId }) {
      try {
        const { ok, data } = await graphGet(contactId, channel.accessToken, type === "instagram" ? "name,username" : "name");
        return ok ? data.name || data.username || null : null;
      } catch {
        return null;
      }
    },

    /** Prove the stored token still works by reading the account it belongs to. */
    async verify(channel) {
      try {
        const { ok, data } = await graphGet(channel.externalId, channel.accessToken, accountFields);
        if (!ok) return { ok: false, error: explain(data?.error) };
        return { ok: true, name: data.name ?? null, username: data.username ?? null };
      } catch {
        return { ok: false, error: "Tidak dapat menghubungi Meta." };
      }
    },

    /** Subscribe the page to this app's webhook so messages start arriving. */
    async activate(channel) {
      const pageId = channel.config?.pageId || channel.externalId;
      try {
        const response = await fetch(`${graphUrl(pageId)}/subscribed_apps`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", ...auth(channel.accessToken) },
          body: new URLSearchParams({ subscribed_fields: "messages" }).toString(),
          signal: AbortSignal.timeout(15000),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) return { ok: false, error: `Gagal mengaktifkan webhook di Meta: ${explain(data?.error)}` };
        return { ok: true };
      } catch {
        return { ok: false, error: "Tidak dapat menghubungi Meta untuk mengaktifkan webhook." };
      }
    },
  };
}

export { graphGet as metaGraphGet, explain as explainMetaError };
