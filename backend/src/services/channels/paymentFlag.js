import { query } from "../../config/db.js";
import { logger } from "../../config/logger.js";

/** Meta's code for "the business has no valid payment method": messages are refused until one is added. */
export const META_PAYMENT_ERROR_CODE = 131042;

/**
 * Remember on the channel that Meta is refusing messages over payment, and forget it once a message goes through, so
 * the dashboard can tell the owner what to fix. Only writes when the state changes. Never throws.
 * @param {{ id: number, config?: object }} channel a transport channel
 * @param {{ success: boolean, errorCode?: number|null }} result what the send returned
 */
export async function noteSendOutcome(channel, result) {
  try {
    const flagged = Boolean(channel.config?.paymentIssueAt);
    if (!result.success && result.errorCode === META_PAYMENT_ERROR_CODE && !flagged) {
      const at = new Date().toISOString();
      await query("UPDATE channels SET config_json = JSON_SET(COALESCE(config_json, JSON_OBJECT()), '$.paymentIssueAt', ?) WHERE id = ?", [at, channel.id]);
      channel.config = { ...(channel.config || {}), paymentIssueAt: at };
      logger.warn({ channel: channel.id }, "Meta refused a message: no valid payment method on the WhatsApp account");
    } else if (result.success && flagged) {
      await query("UPDATE channels SET config_json = JSON_REMOVE(config_json, '$.paymentIssueAt') WHERE id = ?", [channel.id]);
      channel.config = { ...channel.config, paymentIssueAt: undefined };
    }
  } catch (err) {
    logger.warn({ err: err.message }, "Could not record the payment state of a channel");
  }
}
