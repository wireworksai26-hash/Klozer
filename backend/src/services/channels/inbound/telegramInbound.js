import { telegramMessageId } from "../adapters/telegram.js";

/**
 * Turn a Telegram update into an inbound message, or null when it is not one we answer (a group, another bot,
 * an edited message, a join notice). Pure: no database, no network.
 *
 * @param {object} update Telegram `Update`
 * @param {string} botId the bot the update was sent to
 * @returns {{ contactId: string, name: string|undefined, id: string, type: string, text: string, mediaId: string|null }|null}
 */
export function parseTelegramUpdate(update, botId) {
  const message = update?.message;
  if (!message?.chat || message.chat.type !== "private" || message.from?.is_bot) return null;

  const chatId = String(message.chat.id);
  const from = message.from || {};
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || undefined;
  const base = { contactId: chatId, name, id: telegramMessageId(botId, chatId, message.message_id) };

  if (message.photo?.length) {
    // the last size is the largest
    return { ...base, type: "image", text: message.caption || "", mediaId: message.photo[message.photo.length - 1].file_id };
  }
  if (message.document) {
    const mime = String(message.document.mime_type || "");
    const readable = mime === "application/pdf" || mime.startsWith("image/");
    return readable ? { ...base, type: "document_receipt", text: message.caption || "", mediaId: message.document.file_id } : { ...base, type: "text", text: "", mediaId: null };
  }
  if (message.voice || message.audio) return { ...base, type: "voice_note", text: "", mediaId: null };

  if (typeof message.text === "string") {
    // /start is how every chat with a bot begins; to the AI it is a greeting
    const text = /^\/start(@\w+)?(\s|$)/i.test(message.text) ? "Halo" : message.text;
    return { ...base, type: "text", text, mediaId: null };
  }
  return { ...base, type: "text", text: "", mediaId: null }; // sticker, location, contact...: for a person
}
