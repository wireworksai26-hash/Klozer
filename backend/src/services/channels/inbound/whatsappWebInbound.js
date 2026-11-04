import { normalizePhone } from "../../../utils/helpers.js";

const PHONE_JID = /^(\d{6,20})(?::\d+)?@s\.whatsapp\.net$/;
const LID_JID = /^(\d{6,20})(?::\d+)?@lid$/;
const LID_CONTACT = /^lid:(\d{6,20})$/;
const IGNORED_JID = /(@g\.us|@broadcast|@newsletter)$/;

export const WHATSAPP_WEB_MESSAGE_PREFIX = "bw:";

export function jidToContactId(jid) {
  const value = String(jid ?? "").trim();
  if (!value || IGNORED_JID.test(value)) return null;
  const phone = PHONE_JID.exec(value);
  if (phone) return normalizePhone(phone[1]);
  const lid = LID_JID.exec(value);
  if (lid) return `lid:${normalizePhone(lid[1])}`;
  return null;
}

export function normalizeContactId(id) {
  const value = String(id ?? "").trim();
  if (LID_CONTACT.test(value)) return value;
  const digits = normalizePhone(value);
  return /^\d{6,20}$/.test(digits) ? digits : null;
}

export function contactIdToJid(contactId) {
  const value = String(contactId ?? "").trim();
  const lid = LID_CONTACT.exec(value);
  if (lid) return `${lid[1]}@lid`;
  const digits = normalizePhone(value);
  return /^\d{6,20}$/.test(digits) ? `${digits}@s.whatsapp.net` : null;
}

export function messageIdFor(key) {
  return key?.id ? `${WHATSAPP_WEB_MESSAGE_PREFIX}${key.id}` : null;
}

export function isIgnoredJid(jid) {
  const value = String(jid ?? "").trim();
  return !value || value === "status@broadcast" || IGNORED_JID.test(value);
}

export function extractWhatsAppWebMessage(raw = {}) {
  const messageId = messageIdFor(raw.key);
  if (!messageId) return null;
  const message = raw.message || {};

  if (typeof message.conversation === "string") return { messageId, type: "text", text: message.conversation, media: false, mimeType: null };
  if (typeof message.extendedTextMessage?.text === "string") {
    return { messageId, type: "text", text: message.extendedTextMessage.text, media: false, mimeType: null };
  }

  if (message.imageMessage) {
    const mimeType = mimeOf(message.imageMessage);
    return { messageId, type: "image", text: message.imageMessage.caption || "", media: true, mimeType };
  }
  if (message.videoMessage) {
    const mimeType = mimeOf(message.videoMessage);
    return { messageId, type: "video", text: message.videoMessage.caption || "", media: true, mimeType };
  }
  if (message.documentMessage) {
    const mimeType = mimeOf(message.documentMessage);
    const receipt = mimeType === "application/pdf";
    return {
      messageId,
      type: receipt ? "document_receipt" : "document",
      text: message.documentMessage.caption || message.documentMessage.fileName || "",
      media: receipt,
      mimeType,
    };
  }
  if (message.audioMessage) return { messageId, type: "voice_note", text: "", media: false, mimeType: null };
  if (message.stickerMessage) return { messageId, type: "sticker", text: "", media: false, mimeType: null };
  if (message.locationMessage) return { messageId, type: "location", text: "", media: false, mimeType: null };
  if (message.contactMessage || message.contactsArrayMessage) return { messageId, type: "contact", text: "", media: false, mimeType: null };

  const button =
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.templateButtonReplyMessage?.selectedDisplayText ||
    message.templateButtonReplyMessage?.selectedId ||
    message.listResponseMessage?.title ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId;
  if (button) return { messageId, type: "text", text: String(button), media: false, mimeType: null };

  if (message.reactionMessage || message.protocolMessage || message.pollUpdateMessage) return null;
  return { messageId, type: "text", text: "", media: false, mimeType: null };
}

function mimeOf(media) {
  return String(media?.mimetype || "").split(";")[0].trim().toLowerCase();
}
