import { queryOne } from "../config/db.js";
import { audit } from "../services/auditService.js";
import { handBack, takeOver } from "../services/handoff/handoffService.js";
import { assignLead, claimLead, routingOverview } from "../services/routing/assignmentService.js";
import { setAvailability } from "../services/routing/presenceService.js";
import { getRoutingSettings, updateRoutingSettings } from "../services/routing/routingSettings.js";
import { notFound } from "../utils/errors.js";

const leadIdOf = (req) => Number(req.params.id);

async function assertLead(req) {
  const lead = await queryOne("SELECT id FROM leads WHERE id = ? AND institution_id = ?", [leadIdOf(req), req.tenantId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
}

/** GET /routing/settings */
export async function getSettings(req, res) {
  res.json({ success: true, data: await getRoutingSettings(req.tenantId) });
}

/** PUT /routing/settings */
export async function putSettings(req, res) {
  const data = await updateRoutingSettings(req.tenantId, req.body);
  await audit(req, "routing.update", { entityType: "routing_settings", entityId: req.tenantId, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, message: "Pengaturan pembagian chat tersimpan.", data });
}

/** GET /routing/overview: rules, agents with their load and presence, and the waiting queue. */
export async function overview(req, res) {
  res.json({ success: true, data: await routingOverview(req.tenantId) });
}

/** POST /leads/:id/assign: a manager picks an agent (userId) or lets the rule pick (null). */
export async function assign(req, res) {
  const data = await assignLead({ institutionId: req.tenantId, leadId: leadIdOf(req), userId: req.body.userId });
  await audit(req, "lead.assign", { entityType: "lead", entityId: leadIdOf(req), metadata: { to: data.userId } });
  res.json({ success: true, message: "Percakapan ditugaskan.", data });
}

/** POST /leads/:id/claim: an agent takes a conversation nobody has. */
export async function claim(req, res) {
  const data = await claimLead({ institutionId: req.tenantId, leadId: leadIdOf(req), userId: req.user.id });
  res.json({ success: true, message: "Percakapan diambil.", data });
}

/** POST /leads/:id/handoff: a person takes over from the AI. */
export async function handoff(req, res) {
  const data = await takeOver({ institutionId: req.tenantId, leadId: leadIdOf(req), userId: req.user.id });
  res.json({ success: true, message: "Percakapan kini ditangani manusia.", data });
}

/** POST /leads/:id/handback: give the conversation back to the AI. */
export async function handback(req, res) {
  await assertLead(req);
  const data = await handBack({ institutionId: req.tenantId, leadId: leadIdOf(req), reason: "manual" });
  res.json({ success: true, message: data.changed ? "Percakapan dikembalikan ke AI." : "Percakapan sudah ditangani AI.", data });
}

/** PUT /users/me/availability: stop or resume receiving new conversations without logging out. */
export async function putAvailability(req, res) {
  const data = await setAvailability({ institutionId: req.tenantId, userId: req.user.id, available: req.body.available });
  res.json({ success: true, data });
}
