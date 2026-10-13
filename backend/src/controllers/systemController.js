import os from "os";
import { getPool, pingDb, query } from "../config/db.js";
import { config } from "../config/env.js";

const GB = 1024 ** 3;

/** Percentage of non-idle CPU time since boot (coarse, but real). */
function cpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const value of Object.values(cpu.times)) total += value;
    idle += cpu.times.idle;
  }
  return {
    cores: cpus.length,
    model: cpus[0]?.model ?? "unknown",
    speedMhz: cpus[0]?.speed ?? 0,
    usagePercent: total > 0 ? Math.round(((total - idle) / total) * 100) : 0,
    loadAverage: os.loadavg().map((l) => +l.toFixed(2)),
  };
}

/**
 * GET /system/metrics (superadmin)
 * Everything returned here is measured from the running process, host, or
 * database. Nothing is simulated.
 */
export async function getSystemMetrics(req, res) {
  let dbLatencyMs = null;
  let dbStatus = "connected";
  let threadsConnected = null;
  try {
    dbLatencyMs = +(await pingDb()).toFixed(2);
    const [row] = await query("SHOW STATUS LIKE 'Threads_connected'");
    threadsConnected = row ? Number(row.Value) : null;
  } catch {
    dbStatus = "unreachable";
  }

  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();
  const proc = process.memoryUsage();
  const poolConfig = getPool().pool?.config?.connectionLimit ?? config.db.poolSize;

  res.json({
    success: true,
    scannedAt: new Date().toISOString(),
    platform: {
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      hostname: os.hostname(),
      nodeVersion: process.version,
      environment: config.nodeEnv,
      hostUptimeSeconds: Math.floor(os.uptime()),
      processUptimeSeconds: Math.floor(process.uptime()),
    },
    cpu: cpuSnapshot(),
    memory: {
      totalGb: +(totalMem / GB).toFixed(1),
      usedGb: +(usedMem / GB).toFixed(1),
      freeGb: +((totalMem - usedMem) / GB).toFixed(1),
      usagePercent: Math.round((usedMem / totalMem) * 100),
      processHeapUsedMb: +(proc.heapUsed / 1048576).toFixed(1),
      processRssMb: +(proc.rss / 1048576).toFixed(1),
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      threadsConnected,
      maxPoolSize: poolConfig,
    },
  });
}

/**
 * GET /system/integrations (superadmin)
 * Which platform-level integrations are configured on the server. Booleans only:
 * secrets themselves never leave the server and are changed through its environment.
 */
export async function getIntegrationStatus(req, res) {
  const { ai, meta, midtrans, smtp } = config;
  res.json({
    success: true,
    ai: { primaryProvider: ai.provider, nvidia: Boolean(ai.nvidiaKey), nvidiaModel: ai.nvidiaModel, gemini: Boolean(ai.geminiApiKey), geminiModel: ai.geminiModel },
    whatsapp: { appSecret: Boolean(meta.appSecret), verifyToken: Boolean(meta.verifyToken), graphVersion: meta.graphVersion },
    payments: { midtrans: Boolean(midtrans.serverKey), mode: midtrans.serverKey ? (midtrans.isProduction ? "production" : "sandbox") : null },
    email: { smtp: Boolean(smtp.host && smtp.user && smtp.pass) },
    webhooks: {
      whatsapp: `${config.appUrl}/api/v1/webhooks/whatsapp`,
      midtrans: `${config.appUrl}/api/v1/payments/webhook`,
    },
  });
}
