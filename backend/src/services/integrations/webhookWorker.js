import { query } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { runWebhookDeliveries } from "./webhookDispatcher.js";

/** Delivers queued webhook events every few seconds, and clears old delivery records daily. Safe on several instances. */
export function startWebhookWorker({ intervalMs = 5_000 } = {}) {
  let running = false;
  let lastPrune = 0;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runWebhookDeliveries();
      if (result.delivered || result.failed || result.dropped) logger.info({ webhooks: result }, "Webhook worker run");
      if (Date.now() - lastPrune > 24 * 3600_000) {
        lastPrune = Date.now();
        await query("DELETE FROM webhook_deliveries WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)");
      }
    } catch (err) {
      logger.error({ err: err.message }, "Webhook worker run failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
