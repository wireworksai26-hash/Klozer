import { query } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { retryFailedEvents } from "../metaCapiService.js";
import { syncDueAccounts } from "../ads/metaAdsSync.js";
import { runBroadcastTick } from "./broadcastSender.js";
import { syncTemplates } from "./templateService.js";

/**
 * Background work for broadcasts and ads:
 *  - every 15 seconds: start due campaigns and send the next recipients;
 *  - every 5 minutes: re-send conversion events that failed, refresh ad spend that is due, and ask Meta about templates
 *    still waiting for review (the webhook normally tells us first; this catches a missed one).
 * Everything claims its rows in the database, so several backend instances are safe.
 */

const SLOW_EVERY_MS = 5 * 60_000;

async function pendingTemplateSync() {
  const channels = await query(
    `SELECT DISTINCT t.institution_id, t.channel_id FROM message_templates t WHERE t.status = 'pending' AND (t.last_synced_at IS NULL OR t.last_synced_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`
  );
  for (const c of channels) {
    await syncTemplates({ institutionId: c.institution_id, channelId: c.channel_id }).catch((err) => logger.warn({ err: err.message, channelId: c.channel_id }, "Template status check failed"));
  }
}

export function startBroadcastWorker({ intervalMs = 15_000 } = {}) {
  let running = false;
  let lastSlow = 0;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const sent = await runBroadcastTick();
      if (sent.sent || sent.failed || sent.started || sent.completed) logger.info({ broadcast: sent }, "Broadcast worker run");

      if (Date.now() - lastSlow >= SLOW_EVERY_MS) {
        lastSlow = Date.now();
        await retryFailedEvents();
        await syncDueAccounts();
        await pendingTemplateSync();
      }
    } catch (err) {
      logger.error({ err: err.message }, "Broadcast worker run failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
