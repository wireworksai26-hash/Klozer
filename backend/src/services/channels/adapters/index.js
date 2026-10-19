import { AppError } from "../../../utils/errors.js";
import { whatsappAdapter } from "./whatsapp.js";

/**
 * Channel type -> transport. Adding Instagram, Messenger, Telegram or web chat means writing one adapter with the
 * same functions as the WhatsApp one and listing it here; conversations, routing and hand-off do not change.
 */
const ADAPTERS = { whatsapp: whatsappAdapter };

export function getAdapter(type) {
  const adapter = ADAPTERS[type];
  if (!adapter) throw new AppError(501, `Kanal ${type} belum didukung.`, { code: "CHANNEL_NOT_SUPPORTED" });
  return adapter;
}

export const supportedChannelTypes = () => Object.keys(ADAPTERS);
