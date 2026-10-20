import { audit } from "../services/auditService.js";
import { EVENTS } from "../services/integrations/eventCatalog.js";
import { SCOPES, createApiKey, listApiKeys, revokeApiKey } from "../services/integrations/apiKeys.js";
import { createEndpoint, deleteEndpoint, getDeliveryDetail, listDeliveries, listEndpoints, retryDelivery, rotateSecret, sendTestEvent, updateEndpoint } from "../services/integrations/webhookService.js";

const idOf = (req) => Number(req.params.id);

// ---------------------------------------------------------------- API keys
/** GET /integrations/api-keys */
export async function apiKeys(req, res) {
  res.json({ success: true, data: await listApiKeys(req.tenantId), scopes: SCOPES });
}

/** POST /integrations/api-keys: the key itself is in this response only. */
export async function createKey(req, res) {
  const { key, apiKey } = await createApiKey({ institutionId: req.tenantId, userId: req.user.id, ...req.body });
  await audit(req, "api_key.create", { entityType: "api_key", entityId: apiKey.id, metadata: { name: apiKey.name, scopes: apiKey.scopes } });
  res.status(201).json({ success: true, message: "API key dibuat. Simpan sekarang: tidak bisa dilihat lagi.", data: apiKey, key });
}

/** DELETE /integrations/api-keys/:id */
export async function revokeKey(req, res) {
  await revokeApiKey(req.tenantId, idOf(req));
  await audit(req, "api_key.revoke", { entityType: "api_key", entityId: idOf(req) });
  res.json({ success: true, message: "API key dicabut." });
}

// ---------------------------------------------------------------- webhooks
/** GET /integrations/events: what can be subscribed to. */
export function events(req, res) {
  res.json({ success: true, data: Object.entries(EVENTS).filter(([name]) => name !== "ping").map(([name, description]) => ({ name, description })) });
}

/** GET /integrations/webhooks */
export async function webhooks(req, res) {
  res.json({ success: true, data: await listEndpoints(req.tenantId) });
}

/** POST /integrations/webhooks: the signing secret is in this response only. */
export async function createWebhook(req, res) {
  const { endpoint, secret } = await createEndpoint({ institutionId: req.tenantId, userId: req.user.id, ...req.body });
  await audit(req, "webhook.create", { entityType: "webhook_endpoint", entityId: endpoint.id, metadata: { url: endpoint.url, events: endpoint.events } });
  res.status(201).json({ success: true, message: "Webhook dibuat. Simpan secret sekarang: tidak bisa dilihat lagi.", data: endpoint, secret });
}

/** PUT /integrations/webhooks/:id */
export async function updateWebhook(req, res) {
  const data = await updateEndpoint({ institutionId: req.tenantId, id: idOf(req), ...req.body });
  await audit(req, "webhook.update", { entityType: "webhook_endpoint", entityId: idOf(req), metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, data });
}

/** DELETE /integrations/webhooks/:id */
export async function removeWebhook(req, res) {
  await deleteEndpoint(req.tenantId, idOf(req));
  await audit(req, "webhook.delete", { entityType: "webhook_endpoint", entityId: idOf(req) });
  res.json({ success: true, message: "Webhook dihapus." });
}

/** POST /integrations/webhooks/:id/rotate-secret */
export async function rotate(req, res) {
  const { endpoint, secret } = await rotateSecret(req.tenantId, idOf(req));
  await audit(req, "webhook.rotate_secret", { entityType: "webhook_endpoint", entityId: idOf(req) });
  res.json({ success: true, message: "Secret baru dibuat; yang lama berhenti berlaku. Simpan sekarang.", data: endpoint, secret });
}

/** POST /integrations/webhooks/:id/test: a ping, sent right now. */
export async function test(req, res) {
  const result = await sendTestEvent(req.tenantId, idOf(req));
  res.status(result.ok ? 200 : 502).json({ success: result.ok, message: result.ok ? "Penerima menjawab dengan baik." : `Penerima tidak menjawab dengan baik: ${result.error}`, data: result });
}

/** GET /integrations/webhooks/:id/deliveries */
export async function deliveries(req, res) {
  res.json({ success: true, data: await listDeliveries(req.tenantId, idOf(req), req.query) });
}

/** GET /integrations/deliveries/:id: one delivery with the exact data that was sent. */
export async function delivery(req, res) {
  res.json({ success: true, data: await getDeliveryDetail(req.tenantId, idOf(req)) });
}

/** POST /integrations/deliveries/:id/retry */
export async function retry(req, res) {
  res.json({ success: true, message: "Pengiriman dijadwalkan ulang.", data: await retryDelivery(req.tenantId, idOf(req)) });
}
