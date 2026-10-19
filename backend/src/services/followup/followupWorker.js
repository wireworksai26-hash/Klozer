import { logger } from "../../config/logger.js";
import { expireStaleDrafts } from "../commerce/draftRepository.js";
import { cancelStaleUnpaidOrders, runDueFollowups } from "./followupService.js";

/**
 * Background work for chat commerce, once a minute: send due reminders, release orders nobody paid for within the
 * tenant's limit, and close carts nobody came back to. Every step claims or checks its rows in the database, so
 * running the backend on more than one server, or a slow run overlapping the next, does no harm.
 */
export function startCommerceWorker({ intervalMs = 60_000 } = {}) {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const reminders = await runDueFollowups();
      const stale = await cancelStaleUnpaidOrders();
      const drafts = await expireStaleDrafts();
      if (reminders.sent || reminders.failed || stale.cancelled || drafts) logger.info({ reminders, cancelledOrders: stale.cancelled, expiredDrafts: drafts }, "Commerce worker run");
    } catch (err) {
      logger.error({ err: err.message }, "Commerce worker run failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
