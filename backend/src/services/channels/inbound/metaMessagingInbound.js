/**
 * Turn a Messenger or Instagram webhook payload into plain inbound messages. Pure: no database, no network.
 *
 * Payload shape: { object: "page" | "instagram", entry: [{ id, messaging: [{ sender: { id }, recipient: { id },
 * message: { mid, text, is_echo, attachments: [{ type, payload: { url } }] } }] }] }
 * `entry.id` is the account that received the message (the page id for Messenger, the Instagram account id).
 */

const CHANNEL_BY_OBJECT = { page: "messenger", instagram: "instagram" };

/** Attachment type -> how the conversation pipeline treats it. Anything else is passed on as an empty message for a person. */
const TYPE_BY_ATTACHMENT = { image: "image", audio: "voice_note", file: "document_receipt" };

/**
 * @returns {{ channelType: string, accountId: string, contactId: string, id: string|null, type: string, text: string, mediaId: string|null }[]}
 */
export function extractMetaMessages(body) {
  const channelType = CHANNEL_BY_OBJECT[body?.object];
  if (!channelType) return [];

  const out = [];
  for (const entry of body.entry || []) {
    const accountId = String(entry.id ?? "");
    for (const event of entry.messaging || []) {
      const message = event.message;
      const contactId = String(event.sender?.id ?? "");
      // reads, deliveries and postbacks carry no message; echoes are our own outgoing messages coming back
      if (!message || message.is_echo || message.is_deleted || !contactId || contactId === accountId) continue;

      const attachment = (message.attachments || [])[0];
      const type = attachment ? TYPE_BY_ATTACHMENT[attachment.type] : "text";
      const url = attachment?.payload?.url || null;
      // a sticker or a shared reel is not something the AI can answer: hand it to a person like any unknown type
      const supported = Boolean(type) && !(attachment && !url);
      out.push({
        channelType,
        accountId,
        contactId,
        id: message.mid ? String(message.mid) : null,
        type: supported ? type : "text",
        text: supported && !attachment ? String(message.text ?? "") : "",
        mediaId: supported && attachment ? url : null,
      });
    }
  }
  return out;
}
