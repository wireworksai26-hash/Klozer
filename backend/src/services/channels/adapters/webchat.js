import { randomToken } from "../../../utils/crypto.js";
import { stripChatMarkup } from "../textUtils.js";

/**
 * Live chat widget on the tenant's own website. There is no outside platform to call: a reply is delivered by being
 * stored in the conversation, and the widget picks it up on its next poll. The channel's account id is the public
 * key in the embed snippet (it identifies the widget, it is not a secret).
 */

export const WEBCHAT_DEFAULTS = Object.freeze({
  title: "Chat dengan kami",
  welcomeMessage: "Halo! Ada yang bisa kami bantu?",
  color: "#046B54",
  allowedOrigins: [],
});

const VISITOR_ID = /^[a-f0-9]{32}$/;

export const webchatAdapter = {
  type: "webchat",
  maxTextLength: 2000,
  normalizeContactId: (id) => (VISITOR_ID.test(String(id ?? "").trim()) ? String(id).trim() : null),
  formatText: stripChatMarkup,

  /** Nothing to send over a network: the stored message is the delivery. */
  async send({ to }) {
    return { success: true, to, messageId: null };
  },

  async downloadMedia() {
    return null; // visitors send text only
  },

  async verify() {
    return { ok: true };
  },

  async resolveConnection({ displayHandle = null, config = {} }) {
    return {
      externalId: `wc_${randomToken(12)}`,
      displayHandle,
      accessToken: null,
      config: { ...WEBCHAT_DEFAULTS, ...config },
    };
  },
};
