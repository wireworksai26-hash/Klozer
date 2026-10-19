import { AppError } from "../../../utils/errors.js";
import { instagramAdapter } from "./instagram.js";
import { messengerAdapter } from "./messenger.js";
import { telegramAdapter } from "./telegram.js";
import { webchatAdapter } from "./webchat.js";
import { whatsappAdapter } from "./whatsapp.js";

/**
 * Channel type -> transport. A new channel type is one adapter listed here; conversations, routing and hand-off do
 * not change. An adapter provides:
 *   type, maxTextLength, normalizeContactId(id), send({ channel, to, text })
 * and, where the platform has them:
 *   formatText(text), markRead({ channel, messageId }), downloadMedia({ channel, mediaId }), fetchProfile({ channel, contactId }),
 *   verify(channel), resolveConnection(input) (read-only checks before a channel is saved),
 *   activate(channel) / deactivate(channel) (register or remove the platform's webhook).
 */
const ADAPTERS = {
  whatsapp: whatsappAdapter,
  messenger: messengerAdapter,
  instagram: instagramAdapter,
  telegram: telegramAdapter,
  webchat: webchatAdapter,
};

export function getAdapter(type) {
  const adapter = ADAPTERS[type];
  if (!adapter) throw new AppError(501, `Kanal ${type} belum didukung.`, { code: "CHANNEL_NOT_SUPPORTED" });
  return adapter;
}

export const supportedChannelTypes = () => Object.keys(ADAPTERS);
