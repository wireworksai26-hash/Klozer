import { audit } from "../services/auditService.js";
import { FAST_TOPICS } from "../services/fastpath/fastPathModel.js";
import { fastPathStats } from "../services/fastpath/fastPathService.js";
import { MAX_STORE_HOURS, getFastPathSettings, updateFastPathSettings } from "../services/fastpath/fastPathSettings.js";

/** GET /ai/fast-path */
export async function get(req, res) {
  res.json({ success: true, data: await getFastPathSettings(req.tenantId), topics: FAST_TOPICS, limits: { storeHours: MAX_STORE_HOURS } });
}

/** PUT /ai/fast-path */
export async function put(req, res) {
  const data = await updateFastPathSettings(req.tenantId, req.body);
  await audit(req, "ai.fast_path_update", { entityType: "fast_path_settings", entityId: req.tenantId, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, data });
}

/** GET /ai/fast-path/stats: replies made by code, by the order rules and by the assistant. */
export async function stats(req, res) {
  res.json({ success: true, data: await fastPathStats(req.tenantId, req.query.days) });
}
