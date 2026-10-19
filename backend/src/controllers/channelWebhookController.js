import { logger } from "../config/logger.js";
import { safeEqual } from "../utils/crypto.js";
import { notFound, unauthorized } from "../utils/errors.js";
import { findActiveByExternalId } from "../services/channels/channelRepository.js";
import { extractMetaMessages } from "../services/channels/inbound/metaMessagingInbound.js";
import { parseTelegramUpdate } from "../services/channels/inbound/telegramInbound.js";
import { handleInbound } from "../services/conversationService.js";
import { assertMetaSignature } from "./webhookController.js";

/** Hand one parsed message to the conversation pipeline. Failures are logged, never thrown: the platform already got its 200. */
function dispatch(channel, message) {
  handleInbound({
    institutionId: channel.institutionId,
    channel,
    channelType: channel.type,
    contactId: message.contactId,
    contactName: message.name,
    text: message.text,
    messageId: message.id,
    messageType: message.type,
    mediaId: message.mediaId,
  }).catch((err) => logger.error({ err: err.message, channelType: channel.type, messageId: message.id }, "Inbound message processing failed"));
}

/**
 * POST /webhooks/meta: Messenger and Instagram messages. The handshake (GET) is the same as WhatsApp's.
 * Each message goes to the tenant that connected the receiving page or Instagram account; unknown accounts are ignored.
 */
export async function handleMetaMessagingInbound(req, res) {
  assertMetaSignature(req);
  res.status(200).json({ status: "EVENT_RECEIVED" });

  for (const message of extractMetaMessages(req.body)) {
    findActiveByExternalId(message.channelType, message.accountId)
      .then((channel) => {
        if (!channel) return logger.warn({ channelType: message.channelType, accountId: message.accountId }, "Message for an unknown account ignored");
        dispatch(channel, message);
      })
      .catch((err) => logger.error({ err: err.message }, "Inbound channel lookup failed"));
  }
}

/**
 * POST /webhooks/telegram/:botId: updates for one bot. Telegram repeats the secret we gave it when registering the
 * webhook in a header; anything without it is not from Telegram.
 */
export async function handleTelegramInbound(req, res) {
  const channel = await findActiveByExternalId("telegram", String(req.params.botId));
  if (!channel) throw notFound();
  const secret = channel.config?.webhookSecret;
  if (!secret || !safeEqual(req.headers["x-telegram-bot-api-secret-token"], secret)) throw unauthorized("Secret webhook tidak valid.");

  res.status(200).json({ ok: true });
  const message = parseTelegramUpdate(req.body, channel.externalId);
  if (message) dispatch(channel, message);
}
