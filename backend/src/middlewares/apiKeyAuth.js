import { queryOne } from "../config/db.js";
import { forbidden, unauthorized } from "../utils/errors.js";
import { authenticateApiKey } from "../services/integrations/apiKeys.js";

/** The key from `Authorization: Bearer klz_live_...` or `X-API-Key`. */
function readKey(req) {
  const auth = String(req.headers.authorization || "");
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return String(req.headers["x-api-key"] || "").trim();
}

/**
 * Guard for the public API: the caller must send a valid API key that has every scope the route needs, and the
 * tenant's package must include API access. Sets `req.tenantId` and `req.apiKey` (id and scopes).
 */
export function apiKeyAuth(...requiredScopes) {
  return async function authenticateKey(req, res, next) {
    try {
      const key = readKey(req);
      if (!key) throw unauthorized("API key tidak ditemukan. Kirim di header Authorization: Bearer <key>.", { code: "MISSING_API_KEY" });
      const apiKey = await authenticateApiKey(key);

      const missing = requiredScopes.filter((s) => !apiKey.scopes.includes(s));
      if (missing.length) throw forbidden(`API key ini tidak punya cakupan: ${missing.join(", ")}`, { code: "INSUFFICIENT_SCOPE", details: { required: requiredScopes } });

      const inst = await queryOne("SELECT features_json FROM institutions WHERE id = ?", [apiKey.institutionId]);
      if (inst?.features_json?.publicApi === false) throw forbidden("Akses API tidak termasuk dalam paket Anda.", { code: "FEATURE_DISABLED" });

      req.apiKey = apiKey;
      req.tenantId = apiKey.institutionId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
