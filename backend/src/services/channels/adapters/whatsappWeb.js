import { contactIdToJid, normalizeContactId } from "../inbound/whatsappWebInbound.js";
import { getWhatsAppWebManager } from "../whatsappWebManager.js";

/**
 * WhatsApp through the linked-device protocol (Baileys). No Meta Business account is needed: the owner scans a
 * QR code once and the session is kept on the server.
 */
export const whatsappWebAdapter = {
  type: "whatsapp_web",
  maxTextLength: 4000,
  requiresToken: false,
  normalizeContactId: (id) => (contactIdToJid(id) ? normalizeContactId(id) : null),

  async send({ channel, to, text }) {
    return getWhatsAppWebManager().send({ channel, to, text });
  },

  async sendImage({ channel, to, buffer, mimeType, caption }) {
    return getWhatsAppWebManager().sendImage({ channel, to, buffer, mimeType, caption });
  },

  async markRead({ channel, messageId }) {
    return getWhatsAppWebManager().markRead(channel.id, messageId);
  },

  async downloadMedia({ channel, mediaId }) {
    return getWhatsAppWebManager().downloadMedia(channel.id, mediaId);
  },

  async verify(channel) {
    return getWhatsAppWebManager().verify(channel);
  },

  async deactivate(channel) {
    await getWhatsAppWebManager().logout(channel.id);
  },
};
