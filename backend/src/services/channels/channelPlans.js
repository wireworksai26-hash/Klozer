/** How many connected accounts (WhatsApp numbers, later Instagram pages and so on) each package may have. */
export const CHANNEL_LIMITS = Object.freeze({ starter: 1, pro: 5, enterprise: 20 });

export const channelLimitFor = (tier) => CHANNEL_LIMITS[String(tier || "").toLowerCase()] ?? CHANNEL_LIMITS.starter;

/** Channel types that can be connected today. The others exist in the schema for the next phase. */
export const CONNECTABLE_CHANNEL_TYPES = Object.freeze(["whatsapp"]);
