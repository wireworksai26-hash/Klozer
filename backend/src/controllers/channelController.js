import { queryOne } from "../config/db.js";
import { audit } from "../services/auditService.js";
import { supportedChannelTypes } from "../services/channels/adapters/index.js";
import { channelLimitFor } from "../services/channels/channelPlans.js";
import { getChannel, listChannels, updateChannel } from "../services/channels/channelRepository.js";
import { connectChannel, disconnectChannel, verifyChannel } from "../services/channels/channelService.js";
import { completeSignup, signupConfig } from "../services/channels/whatsappSignup.js";

/** GET /channels: connected accounts (no tokens) and how many the plan allows. */
export async function list(req, res) {
  const [channels, inst] = await Promise.all([listChannels(req.tenantId), queryOne("SELECT subscription_tier FROM institutions WHERE id = ?", [req.tenantId])]);
  res.json({ success: true, data: channels, limit: channelLimitFor(inst?.subscription_tier), supportedTypes: supportedChannelTypes() });
}

/** POST /channels: connect a new account. */
export async function create(req, res) {
  const { type, name, aiEnabled, ...input } = req.body;
  const { channel } = await connectChannel({ institutionId: req.tenantId, type, name, aiEnabled, input });
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
  await disconnectChannel(req.tenantId, Number(req.params.id));
  await audit(req, "channel.delete", { entityType: "channel", entityId: Number(req.params.id) });
  res.json({ success: true, message: "Kanal dihapus." });
}

/** POST /channels/:id/test: ask the platform whether the stored credentials still work. */
export async function test(req, res) {
  await getChannel(req.tenantId, Number(req.params.id)); // 404 for another tenant's channel
  const result = await verifyChannel({ institutionId: req.tenantId, id: Number(req.params.id) });
  res.json({ success: result.ok, ...result });
}

/** GET /channels/whatsapp/signup-config: what the browser needs to open Meta's Embedded Signup window (no secrets). */
export async function signupConfigHandler(req, res) {
  res.json({ success: true, data: signupConfig() });
}

/** POST /channels/whatsapp/signup: the client gave its number in Meta's window; finish connecting it. */
export async function signup(req, res) {
  const { channel, verifiedName } = await completeSignup({ institutionId: req.tenantId, ...req.body });
  await audit(req, "channel.signup", { entityType: "channel", entityId: channel.id, metadata: { type: "whatsapp", via: "embedded_signup" } });
  res.status(201).json({ success: true, message: "WhatsApp terhubung.", data: channel, verifiedName });
}
