import { logger } from "../../config/logger.js";
import { announceOverdue } from "./taskService.js";

/**
 * Once a minute: tell the team about tasks that have just gone past their time. Each task is announced once (the
 * claim happens in the database), so several servers, or a slow run overlapping the next, do no harm.
 */
export function startTaskWorker({ intervalMs = 60_000 } = {}) {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const announced = await announceOverdue();
      if (announced) logger.info({ announced }, "Task worker announced late tasks");
    } catch (err) {
      logger.error({ err: err.message }, "Task worker run failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
