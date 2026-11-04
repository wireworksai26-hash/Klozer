/** How many connected accounts (WhatsApp numbers, Instagram and Facebook pages, Telegram bots, web chat widgets) each package may have. */
export const CHANNEL_LIMITS = Object.freeze({ starter: 1, pro: 5, enterprise: 20 });

export const channelLimitFor = (tier) => CHANNEL_LIMITS[String(tier || "").toLowerCase()] ?? CHANNEL_LIMITS.starter;

/** Channel types a tenant can connect by pasting credentials or creating a widget. */
export const CONNECTABLE_CHANNEL_TYPES = Object.freeze(["whatsapp", "messenger", "instagram", "telegram", "webchat"]);

/** Every channel type the platform can store, including ones with their own connection flow (WhatsApp QR). */
export const ALL_CHANNEL_TYPES = Object.freeze([...CONNECTABLE_CHANNEL_TYPES, "whatsapp_web"]);
