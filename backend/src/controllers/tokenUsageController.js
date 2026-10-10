import { getTokenBalance, getUsageSummary } from "../services/tokenService.js";

/** GET /ai/token-usage (superadmin) — platform-wide aggregates from the usage ledger. */
export async function getTokenUsageSummary(req, res) {
  res.json({ success: true, ...(await getUsageSummary(req.query.range)) });
}

/** GET /ai/token-balance — remaining AI quota for the caller's tenant. */
export async function getTenantTokenBalance(req, res) {
  res.json({ success: true, balance: await getTokenBalance(req.tenantId) });
}
