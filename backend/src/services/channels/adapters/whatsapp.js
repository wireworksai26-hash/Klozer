import { config } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { normalizePhone } from "../../../utils/helpers.js";

/**
 * WhatsApp Cloud API transport. Everything that talks to Meta's Graph API for WhatsApp lives here; the rest of
 * the code reaches it through the channel adapter registry, so another channel type only has to provide the same
 * functions (send, markRead, downloadMedia, verify).
 *
 * `channel` is { externalId (the phone number id), accessToken (already decrypted) }.
 */

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const MEDIA_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
// Meta serves media from its own hosts only; anything else is refused before a token is sent to it.
const MEDIA_HOST = /(^|\.)(facebook\.com|fbcdn\.net|whatsapp\.net|fbsbx\.com)$/i;

const graph = (path) => `https://graph.facebook.com/${config.meta.graphVersion}/${encodeURIComponent(path)}`;
const authHeader = (channel) => ({ Authorization: `Bearer ${channel.accessToken}` });

async function graphPost(channel, body) {
  const response = await fetch(`${graph(channel.externalId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(channel) },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export const whatsappAdapter = {
  type: "whatsapp",
  maxTextLength: 4000,

  /** The id WhatsApp knows a customer by: their number in international form. */
  normalizeContactId: normalizePhone,

  /** @returns {Promise<{ success: boolean, messageId?: string|null, error?: string }>} */
  async send({ channel, to, text }) {
    const recipient = normalizePhone(to);
    if (!recipient || !text) return { success: false, error: "Nomor tujuan dan teks wajib diisi." };
    try {
      const { ok, data } = await graphPost(channel, { recipient_type: "individual", to: recipient, type: "text", text: { preview_url: false, body: text } });
      if (!ok) {
        logger.error({ channel: channel.id, error: data?.error }, "WhatsApp Cloud API rejected message");
        return { success: false, error: data?.error?.message || "Ditolak oleh WhatsApp Cloud API.", errorCode: data?.error?.code ?? null };
      }
      return { success: true, to: recipient, messageId: data?.messages?.[0]?.id ?? null };
    } catch (err) {
      logger.error({ err: err.message, channel: channel.id }, "WhatsApp send failed");
      return { success: false, error: "Gagal menghubungi WhatsApp Cloud API." };
    }
  },

  /**
   * Send an approved template: the only message a business may start a conversation with, or send outside the
   * customer's 24-hour window. `errorCode` is Meta's, so callers can tell a rate limit from a bad number.
   * @returns {Promise<{ success: boolean, messageId?: string|null, error?: string, errorCode?: number|null }>}
   */
  async sendTemplate({ channel, to, template }) {
    const recipient = normalizePhone(to);
    if (!recipient) return { success: false, error: "Nomor tujuan tidak valid." };
    try {
      const { ok, data } = await graphPost(channel, {
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: { name: template.name, language: { code: template.language }, ...(template.components?.length ? { components: template.components } : {}) },
      });
      if (!ok) {
        const code = data?.error?.code ?? null;
        logger.warn({ channel: channel.id, code }, "WhatsApp rejected a template message");
        return { success: false, error: data?.error?.error_data?.details || data?.error?.message || "Ditolak oleh WhatsApp Cloud API.", errorCode: code };
      }
      return { success: true, messageId: data?.messages?.[0]?.id ?? null };
    } catch (err) {
      logger.error({ err: err.message, channel: channel.id }, "WhatsApp template send failed");
      return { success: false, error: "Gagal menghubungi WhatsApp Cloud API.", errorCode: null, network: true };
    }
  },

  async markRead({ channel, messageId }) {
    try {
      const { ok } = await graphPost(channel, { status: "read", message_id: messageId });
      return { success: ok };
    } catch (err) {
      logger.warn({ err: err.message }, "WhatsApp mark-read failed");
      return { success: false };
    }
  },

  /**
   * Download a file a customer sent (two calls: the media id gives a short-lived URL, the URL gives the bytes).
   * @returns {Promise<{ buffer: Buffer, mimeType: string } | null>} null when missing, too large or not a supported type
   */
  async downloadMedia({ channel, mediaId }) {
    if (!mediaId) return null;
    const metaRes = await fetch(graph(mediaId), { headers: authHeader(channel), signal: AbortSignal.timeout(15000) });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json().catch(() => ({}));
    const mimeType = String(meta.mime_type || "").split(";")[0].trim().toLowerCase();
    if (!MEDIA_MIME_TYPES.has(mimeType) || !meta.url) return null;
    if (Number(meta.file_size) > MAX_MEDIA_BYTES) return null;

    let host;
    try {
      const url = new URL(meta.url);
      if (url.protocol !== "https:") return null;
      host = url.hostname;
    } catch {
      return null;
    }
    if (!MEDIA_HOST.test(host)) return null;

    const fileRes = await fetch(meta.url, { headers: authHeader(channel), signal: AbortSignal.timeout(30000) });
    if (!fileRes.ok) return null;
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) return null;
    return { buffer, mimeType };
  },

  /** Nothing to look up when connecting: the owner gives the phone number id and token; "test" proves them later. */
  async resolveConnection({ externalId, displayHandle = null, accessToken, wabaId = null, registrationPin = null }) {
    // the registration PIN (set when a number is connected through Embedded Signup) is kept encrypted and never shown
    const settings = { ...(wabaId ? { wabaId } : {}), ...(registrationPin ? { registrationPin } : {}) };
    return { externalId, displayHandle, accessToken, config: Object.keys(settings).length ? settings : null };
  },

  /** Ask Meta about the number behind this token, to prove the credentials work. */
  async verify(channel) {
    try {
      const response = await fetch(`${graph(channel.externalId)}?fields=display_phone_number,verified_name,quality_rating`, {
        headers: authHeader(channel),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, error: data?.error?.message || `Meta menolak (HTTP ${response.status}).` };
      return { ok: true, displayPhone: data.display_phone_number ?? null, verifiedName: data.verified_name ?? null, quality: data.quality_rating ?? null };
    } catch {
      return { ok: false, error: "Tidak dapat menghubungi Meta." };
    }
  },
};
