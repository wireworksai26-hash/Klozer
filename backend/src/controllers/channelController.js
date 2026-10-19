import { queryOne } from "../config/db.js";
import { audit } from "../services/auditService.js";
import { supportedChannelTypes } from "../services/channels/adapters/index.js";
import { channelLimitFor } from "../services/channels/channelPlans.js";
import { createChannel, deleteChannel, getChannel, listChannels, updateChannel } from "../services/channels/channelRepository.js";
import { verifyChannel } from "../services/channels/channelService.js";

/** GET /channels: connected accounts (no tokens) and how many the plan allows. */
export async function list(req, res) {
  const [channels, inst] = await Promise.all([listChannels(req.tenantId), queryOne("SELECT subscription_tier FROM institutions WHERE id = ?", [req.tenantId])]);
  res.json({ success: true, data: channels, limit: channelLimitFor(inst?.subscription_tier), supportedTypes: supportedChannelTypes() });
}

/** POST /channels: connect a new account. */
export async function create(req, res) {
  const channel = await createChannel({ institutionId: req.tenantId, ...req.body });
  await audit(req, "channel.create", { entityType: "channel", entityId: channel.id, metadata: { type: channel.type } });
  res.status(201).json({ success: true, message: "Kanal terhubung.", data: channel });
}

/** PUT /channels/:id */
export async function update(req, res) {
  const channel = await updateChannel({ institutionId: req.tenantId, id: Number(req.params.id), ...req.body });
  await audit(req, "channel.update", { entityType: "channel", entityId: channel.id, metadata: { fields: Object.keys(req.body).filter((k) => k !== "accessToken") } });
  res.json({ success: true, message: "Kanal diperbarui.", data: channel });
}

/** DELETE /channels/:id */
export async function remove(req, res) {
  await deleteChannel(req.tenantId, Number(req.params.id));
  await audit(req, "channel.delete", { entityType: "channel", entityId: Number(req.params.id) });
  res.json({ success: true, message: "Kanal dihapus." });
}

/** POST /channels/:id/test: ask the platform whether the stored credentials still work. */
export async function test(req, res) {
  await getChannel(req.tenantId, Number(req.params.id)); // 404 for another tenant's channel
  const result = await verifyChannel({ institutionId: req.tenantId, id: Number(req.params.id) });
  res.json({ success: result.ok, ...result });
}
