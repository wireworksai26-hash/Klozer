import { downloadMedia, markRead, sendText } from "./channels/channelService.js";
import { calculateHumanPacingDelay, handleInbound } from "./conversationService.js";

/**
 * WhatsApp entry points kept for callers that only deal with WhatsApp (the webhook, the sandbox, tests). The work is
 * done by the channel layer (sending, media) and the conversation pipeline (what happens to a message); these
 * functions only fix the channel type to WhatsApp.
 */

export { calculateHumanPacingDelay };

export const sendWhatsAppMessage = ({ institutionId, channelId = null, to, text }) => sendText({ institutionId, channelId, type: "whatsapp", to, text });

export const markWhatsAppMessageRead = ({ institutionId, channelId = null, messageId }) => markRead({ institutionId, channelId, type: "whatsapp", messageId });

export const downloadWhatsAppMedia = ({ institutionId, channelId = null, mediaId }) => downloadMedia({ institutionId, channelId, type: "whatsapp", mediaId });

/** A WhatsApp customer wrote. `channel` is the account (phone number) that received it, when known. */
export function processInboundMessage({ institutionId, channel = null, fromPhone, customerName = "Pelanggan", text = "", messageId = null, messageType = "text", mediaId = null, referral = null }) {
  return handleInbound({ institutionId, channel, channelType: "whatsapp", contactId: fromPhone, contactName: customerName, text, messageId, messageType, mediaId, referral });
}
