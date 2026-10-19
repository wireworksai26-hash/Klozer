import fs from "fs";
import { fileURLToPath } from "url";
import { logger } from "../config/logger.js";
import { query, queryOne } from "../config/db.js";
import { forbidden, notFound, unauthorized } from "../utils/errors.js";
import { findActiveByExternalId } from "../services/channels/channelRepository.js";
import { WEBCHAT_DEFAULTS } from "../services/channels/adapters/webchat.js";
import { issueVisitorToken, verifyVisitorToken } from "../services/channels/webchatSession.js";
import { handleInbound } from "../services/conversationService.js";

/**
 * The public side of the web chat widget. Everything here is reachable by anyone on the internet, so access works
 * like this: the widget's public key picks the tenant's channel, and a visitor token (signed by us, kept by the
 * widget in the browser) is the only way to read or write one visitor's conversation.
 */

const WIDGET_FILE = fileURLToPath(new URL("../public/webchat-widget.js", import.meta.url));
const HISTORY_LIMIT = 50;

const bearerToken = (req) => String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");

async function loadWidget(req) {
  const channel = await findActiveByExternalId("webchat", req.params.key);
  if (!channel) throw notFound("Live chat tidak ditemukan.");
  // The channel can limit which websites may embed it. Requests without an Origin are not browsers on another site.
  const allowed = channel.config?.allowedOrigins || [];
  const origin = req.headers.origin;
  if (allowed.length && origin && !allowed.includes(origin)) throw forbidden("Situs ini tidak diizinkan memakai live chat ini.");
  return channel;
}

function visitorOf(req, channel) {
  const visitorId = verifyVisitorToken(channel.externalId, bearerToken(req));
  if (!visitorId) throw unauthorized("Sesi chat tidak valid.");
  return visitorId;
}

/** What a visitor may see of a conversation: their own messages and the replies, not internal notes. */
const asVisible = (m) => ({ id: Number(m.id), from: m.sender_type === "customer" ? "visitor" : "agent", text: m.content_text, at: m.created_at });

async function conversationOf(channel, visitorId) {
  return queryOne("SELECT id FROM leads WHERE institution_id = ? AND channel_type = 'webchat' AND external_id = ?", [channel.institutionId, visitorId]);
}

const settingsOf = (channel) => {
  const { title, welcomeMessage, color } = { ...WEBCHAT_DEFAULTS, ...(channel.config || {}) };
  return { title, welcomeMessage, color };
};

/** POST /public/webchat/:key/session: start a visit or resume one; returns the token and the recent conversation. */
export async function startSession(req, res) {
  const channel = await loadWidget(req);
  let token = bearerToken(req);
  let visitorId = verifyVisitorToken(channel.externalId, token);
  if (!visitorId) {
    token = issueVisitorToken(channel.externalId);
    visitorId = verifyVisitorToken(channel.externalId, token);
  }

  const lead = await conversationOf(channel, visitorId);
  const rows = lead
    ? await query(
        `SELECT id, sender_type, content_text, created_at FROM chat_messages
          WHERE lead_id = ? AND institution_id = ? AND sender_type <> 'system' AND content_text IS NOT NULL ORDER BY id DESC LIMIT ?`,
        [lead.id, channel.institutionId, HISTORY_LIMIT]
      )
    : [];
  res.set("Cache-Control", "no-store");
  res.json({ success: true, token, settings: settingsOf(channel), messages: rows.reverse().map(asVisible) });
}

/** POST /public/webchat/:key/messages: the visitor writes. Answered right away; the reply arrives through polling. */
export async function sendVisitorMessage(req, res) {
  const channel = await loadWidget(req);
  const visitorId = visitorOf(req, channel);
  const { text, clientMessageId, name } = req.body;

  res.status(202).json({ success: true });
  handleInbound({
    institutionId: channel.institutionId,
    channel,
    channelType: "webchat",
    contactId: visitorId,
    contactName: name,
    text,
    messageId: `web:${clientMessageId}`,
    messageType: "text",
  }).catch((err) => logger.error({ err: err.message, channelId: channel.id }, "Web chat message processing failed"));
}

/** GET /public/webchat/:key/messages?after=ID: messages newer than the last one the widget has. */
export async function pollMessages(req, res) {
  const channel = await loadWidget(req);
  const visitorId = visitorOf(req, channel);
  const lead = await conversationOf(channel, visitorId);
  const rows = lead
    ? await query(
        `SELECT id, sender_type, content_text, created_at FROM chat_messages
          WHERE lead_id = ? AND institution_id = ? AND id > ? AND sender_type <> 'system' AND content_text IS NOT NULL ORDER BY id ASC LIMIT ?`,
        [lead.id, channel.institutionId, req.query.after ?? 0, HISTORY_LIMIT]
      )
    : [];
  res.set("Cache-Control", "no-store");
  res.json({ success: true, messages: rows.map(asVisible) });
}

/** GET /public/webchat/widget.js: the script tenants put on their website. */
export function serveWidget(req, res) {
  res.set({
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    // Other sites load this script; helmet's default would block that.
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  fs.createReadStream(WIDGET_FILE).on("error", () => res.status(404).end()).pipe(res);
}
