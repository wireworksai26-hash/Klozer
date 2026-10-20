import http from "http";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeDb, initDb, query } from "./config/db.js";
import { createApp } from "./app.js";
import { runMigrations } from "./database/migrate.js";
import { ensureSuperadmin } from "./database/bootstrap.js";
import { attachRealtime } from "./realtime.js";
import { resetPresence } from "./services/routing/presenceService.js";
import { startCommerceWorker } from "./services/followup/followupWorker.js";
import { startBroadcastWorker } from "./services/broadcast/broadcastWorker.js";

const app = createApp();
const server = http.createServer(app);

// Socket.io: authenticated, origin-checked, tenant-isolated rooms (see realtime.js).
const io = attachRealtime(server);

// ---------- housekeeping ----------
async function pruneOldRows() {
  try {
    await query("DELETE FROM webhook_logs WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 DAY)");
    await query("DELETE FROM whatsapp_session_logs WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)");
    await query("DELETE FROM audit_logs WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 400 DAY)");
  } catch (err) {
    logger.warn({ err: err.message }, "Housekeeping failed");
  }
}

// ---------- lifecycle ----------
let shuttingDown = false;
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down");

  const force = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 15000);
  force.unref();

  try {
    io.close();
    await new Promise((resolve) => server.close(resolve));
    await closeDb();
  } catch (err) {
    logger.error({ err: err.message }, "Error during shutdown");
    exitCode = 1;
  }
  process.exit(exitCode);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  shutdown("uncaughtException", 1);
});

async function start() {
  await initDb();
  if (process.env.RUN_MIGRATIONS_ON_START !== "false") await runMigrations();
  await ensureSuperadmin();
  await resetPresence(); // nobody is connected yet; clear flags left by a restart or crash

  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "Klozer API listening");
  });

  startCommerceWorker();
  startBroadcastWorker();
  pruneOldRows();
  setInterval(pruneOldRows, 24 * 60 * 60 * 1000).unref();
}

start().catch((err) => {
  logger.fatal({ err: err.message }, "Startup failed");
  process.exit(1);
});

export { app, io };
export default server;
