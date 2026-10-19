import crypto from "crypto";
import { config } from "../../config/env.js";
import { randomToken, safeEqual } from "../../utils/crypto.js";

/**
 * A web chat visitor has no account, only a token the widget keeps in the browser. The token names the visitor and
 * is signed by the server for one chat widget, so it cannot be forged or used on another channel: possessing it is
 * the only way to read that visitor's conversation.
 */

const VISITOR_ID = /^[a-f0-9]{32}$/;

const sign = (channelKey, visitorId) =>
  crypto.createHmac("sha256", config.jwt.secret).update(`webchat:${channelKey}:${visitorId}`).digest("base64url").slice(0, 32);

export function issueVisitorToken(channelKey, visitorId = randomToken(16)) {
  return `${visitorId}.${sign(channelKey, visitorId)}`;
}

/** @returns {string|null} the visitor id, or null when the token is missing, malformed or not ours */
export function verifyVisitorToken(channelKey, token) {
  const [visitorId, signature, ...extra] = String(token || "").split(".");
  if (extra.length || !VISITOR_ID.test(visitorId || "") || !signature) return null;
  return safeEqual(signature, sign(channelKey, visitorId)) ? visitorId : null;
}
