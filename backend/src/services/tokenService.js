import { query, queryOne, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { paymentRequired, notFound } from "../utils/errors.js";

/** Very rough token estimate (~3.5 chars/token) used only when the provider reports no usage. */
export const estimateTokens = (text = "") => Math.ceil(String(text).length / 3.5);

export async function getTokenBalance(institutionId) {
  const inst = await queryOne("SELECT id, name, ai_token_quota, ai_tokens_used FROM institutions WHERE id = ?", [institutionId]);
  if (!inst) throw notFound("Instansi tidak ditemukan.");
  const quota = Number(inst.ai_token_quota);
  const used = Number(inst.ai_tokens_used);
  return {
    institutionId: inst.id,
    institutionName: inst.name,
    totalQuota: quota,
    consumedTokens: used,
    remainingTokens: Math.max(0, quota - used),
  };
}

/** Reject the request with HTTP 402 when the tenant has no AI tokens left. */
export async function assertTokenQuota(institutionId) {
  const balance = await getTokenBalance(institutionId);
  if (balance.remainingTokens <= 0) {
    throw paymentRequired("Kuota token AI habis. Silakan tambah kuota untuk melanjutkan.", { code: "TOKEN_QUOTA_EXHAUSTED" });
  }
  return balance;
}

/** Append to the usage ledger and bump the tenant counter atomically. */
export async function recordTokenUsage({
  institutionId,
  userId = null,
  model,
  usageType = "chat_cs",
  promptTokens = 0,
  completionTokens = 0,
  latencyMs = 0,
  status = "ok",
}) {
  const total = promptTokens + completionTokens;
  const cost = +(total * config.ai.costIdrPerToken).toFixed(4);

  await transaction(async (tx) => {
    await tx.query(
      `INSERT INTO ai_token_usage_logs
         (institution_id, user_id, model, usage_type, prompt_tokens, completion_tokens, total_tokens, latency_ms, cost_idr, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, userId, model || "unknown", usageType, promptTokens, completionTokens, total, latencyMs, cost, status]
    );
    await tx.query("UPDATE institutions SET ai_tokens_used = ai_tokens_used + ? WHERE id = ?", [total, institutionId]);
  });

  return { promptTokens, completionTokens, totalTokens: total, costIdr: cost };
}

const RANGE_HOURS = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

/** Platform-wide aggregate used by the superadmin usage dashboard. */
export async function getUsageSummary(range = "30d") {
  const hours = RANGE_HOURS[range] || RANGE_HOURS["30d"];
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const [totals] = await query(
    `SELECT COUNT(*) AS requests, COALESCE(SUM(prompt_tokens),0) AS promptTokens, COALESCE(SUM(completion_tokens),0) AS completionTokens,
            COALESCE(SUM(total_tokens),0) AS totalTokens, COALESCE(SUM(cost_idr),0) AS costIdr, COALESCE(AVG(latency_ms),0) AS avgLatencyMs
       FROM ai_token_usage_logs WHERE created_at >= ?`,
    [since]
  );

  const models = await query(
    `SELECT model AS name, COUNT(*) AS requests, SUM(total_tokens) AS totalTokens, AVG(latency_ms) AS avgLatencyMs, SUM(cost_idr) AS costIdr
       FROM ai_token_usage_logs WHERE created_at >= ? GROUP BY model ORDER BY totalTokens DESC`,
    [since]
  );

  const tenants = await query(
    `SELECT i.id AS institutionId, i.name AS institutionName, i.ai_token_quota AS totalQuota, i.ai_tokens_used AS consumedTokens,
            COALESCE(SUM(l.prompt_tokens),0) AS promptTokens, COALESCE(SUM(l.completion_tokens),0) AS completionTokens,
            COALESCE(SUM(l.total_tokens),0) AS totalTokens, COUNT(l.id) AS requests, COALESCE(SUM(l.cost_idr),0) AS costIdr
       FROM institutions i
       LEFT JOIN ai_token_usage_logs l ON l.institution_id = i.id AND l.created_at >= ?
      WHERE i.is_active = 1
      GROUP BY i.id, i.name, i.ai_token_quota, i.ai_tokens_used
      ORDER BY totalTokens DESC`,
    [since]
  );

  const recent = await query(
    `SELECT l.id, l.created_at AS createdAt, l.institution_id AS tenantId, i.name AS tenantName, l.model, l.usage_type AS type,
            l.prompt_tokens AS promptTokens, l.completion_tokens AS completionTokens, l.total_tokens AS totalTokens,
            l.latency_ms AS latencyMs, l.cost_idr AS costIdr, l.status
       FROM ai_token_usage_logs l JOIN institutions i ON i.id = l.institution_id
      ORDER BY l.id DESC LIMIT 60`
  );

  const tenantBreakdown = tenants.map((t) => {
    const quota = Number(t.totalQuota);
    const used = Number(t.consumedTokens);
    const pct = quota > 0 ? (used / quota) * 100 : 0;
    return {
      institutionId: t.institutionId,
      institutionName: t.institutionName,
      totalQuota: quota,
      consumedTokens: used,
      remainingTokens: Math.max(0, quota - used),
      quotaUsedPercent: +pct.toFixed(1),
      promptTokens: Number(t.promptTokens),
      completionTokens: Number(t.completionTokens),
      totalTokens: Number(t.totalTokens),
      requests: Number(t.requests),
      costIdr: Number(t.costIdr),
      status: pct >= 100 ? "exhausted" : pct > 85 ? "high_usage" : "normal",
    };
  });

  return {
    timeRange: range,
    metrics: {
      requests: Number(totals.requests),
      totalTokens: Number(totals.totalTokens),
      promptTokens: Number(totals.promptTokens),
      completionTokens: Number(totals.completionTokens),
      costIdr: Number(totals.costIdr),
      avgLatencyMs: +Number(totals.avgLatencyMs).toFixed(0),
      totalMaxQuota: tenantBreakdown.reduce((a, t) => a + t.totalQuota, 0),
      totalRemainingQuota: tenantBreakdown.reduce((a, t) => a + t.remainingTokens, 0),
    },
    modelBreakdown: models.map((m) => ({
      name: m.name,
      requests: Number(m.requests),
      totalTokens: Number(m.totalTokens),
      avgLatencyMs: +Number(m.avgLatencyMs).toFixed(0),
      costIdr: Number(m.costIdr),
    })),
    tenantBreakdown,
    recentLogs: recent,
  };
}
