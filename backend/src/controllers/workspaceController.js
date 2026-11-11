import { query } from "../config/db.js";
import { generateToken } from "../middlewares/authMiddleware.js";
import { audit } from "../services/auditService.js";
import { setSessionCookie } from "../utils/session.js";
import * as crm from "../services/crmService.js";
import * as ws from "../services/workspaceService.js";
import { askAssistant, assistantHistory, clearAssistantHistory } from "../services/workspaceAssistantService.js";
import { institutionPublic, userPayload } from "./authController.js";

const days = (req) => Number(req.query.days) || 30;

// ---------------------------------------------------------------- the owner's workspace

/** GET /workspace: the workspace, its businesses, and how each did lately. */
export async function getWorkspace(req, res) {
  const workspace = await ws.requireWorkspace(req.user);
  res.json({ success: true, workspace, overview: await ws.overview(workspace, days(req)) });
}

/** GET /workspace/businesses: one row per business, with its token balance, team and open work. */
export async function businesses(req, res) {
  const workspace = await ws.requireWorkspace(req.user);
  res.json({ success: true, ...(await ws.portfolio(workspace, days(req))) });
}

/** GET /workspace/report: business against business and period against period, plus top products, payment mix and sellers. */
export async function workspaceReport(req, res) {
  const workspace = await ws.requireWorkspace(req.user);
  res.json({ success: true, ...(await ws.report(workspace, days(req))) });
}

/** GET and DELETE /workspace/assistant/history: the owner's own conversation with the assistant. */
export async function assistantLog(req, res) {
  const workspace = await ws.requireWorkspace(req.user);
  res.json({ success: true, items: await assistantHistory(workspace.id, req.user.id), enabled: workspace.assistantEnabled });
}
export async function assistantClear(req, res) {
  const workspace = await ws.requireWorkspace(req.user);
  await clearAssistantHistory(workspace.id, req.user.id);
  await audit(req, "workspace.assistant_clear");
  res.json({ success: true });
}

/** POST /workspace/switch: continue as the owner of another business of the workspace (a new session, no new password). */
export async function switchBusiness(req, res) {
  const { user, institution } = await ws.switchTarget(req.user, req.body.institutionId);
  await audit(req, "workspace.switch", { userId: req.user.id, metadata: { toInstitutionId: institution.id, asUserId: user.id } });
  await query("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [user.id]);
  const token = generateToken(user);
  setSessionCookie(res, token);
  res.set("Cache-Control", "no-store");
  res.json({ success: true, token, user: { ...userPayload(user, institution), workspace: await ws.workspaceOf(user) }, institution: institutionPublic(institution) });
}

/** GET /workspace/contacts: people joined by phone number across the businesses. Read only. */
export async function workspaceContacts(req, res) {
  const workspace = await ws.requireWorkspace(req.user);
  const { search, shared, limit, offset } = req.query;
  res.json({ success: true, ...(await ws.joinedContacts(workspace, { search, sharedOnly: shared === "1", limit, offset })) });
}

/** POST /workspace/assistant/ask: a question answered from the workspace's own data. */
export async function ask(req, res) {
  const workspace = await ws.requireWorkspace(req.user);
  const result = await askAssistant({ user: req.user, workspace }, req.body.question);
  await audit(req, "workspace.assistant_ask", { metadata: { question: req.body.question.slice(0, 200), tools: result.sources.map((s) => s.tool), tokens: result.usedTokens } });
  res.json({ success: true, ...result });
}

// ---------------------------------------------------------------- CRM of one business

export async function contactProfile(req, res) {
  res.json({ success: true, data: await crm.contactProfile(req.tenantId, req.params.id) });
}
export async function listSegments(req, res) {
  res.json({ success: true, items: await crm.listSegments(req.tenantId) });
}
export async function createSegment(req, res) {
  const id = await crm.createSegment(req.tenantId, req.user.id, req.body);
  await audit(req, "crm.segment_create", { entityType: "crm_segment", entityId: id });
  res.status(201).json({ success: true, id });
}
export async function deleteSegment(req, res) {
  await crm.deleteSegment(req.tenantId, req.params.id);
  await audit(req, "crm.segment_delete", { entityType: "crm_segment", entityId: req.params.id });
  res.json({ success: true });
}
export async function segmentContacts(req, res) {
  const segment = await crm.getSegment(req.tenantId, req.params.id);
  res.json({ success: true, segment, ...(await crm.contactsMatching(req.tenantId, segment.filters, req.query)) });
}
export async function previewSegment(req, res) {
  res.json({ success: true, ...(await crm.contactsMatching(req.tenantId, req.body.filters, { limit: 10 })) });
}
export async function mergeContacts(req, res) {
  const result = await crm.mergeContacts(req.tenantId, req.body.keepId, req.body.dropId);
  await audit(req, "crm.contacts_merge", { entityType: "lead", entityId: result.keepId, metadata: { droppedId: result.droppedId, moved: result.moved } });
  res.json({ success: true, message: "Kontak digabung.", ...result });
}

// ---------------------------------------------------------------- the Klozer team

export async function adminList(req, res) {
  res.json({ success: true, items: await ws.listWorkspaces() });
}
export async function adminCreate(req, res) {
  const id = await ws.createWorkspace(req.body.name);
  await audit(req, "workspace.create", { entityType: "workspace", entityId: id, institutionId: null });
  res.status(201).json({ success: true, id });
}
export async function adminUpdate(req, res) {
  await ws.updateWorkspace(req.params.id, req.body);
  await audit(req, "workspace.update", { entityType: "workspace", entityId: req.params.id, institutionId: null, metadata: req.body });
  res.json({ success: true });
}
export async function adminDelete(req, res) {
  await ws.deleteWorkspace(req.params.id);
  await audit(req, "workspace.delete", { entityType: "workspace", entityId: req.params.id, institutionId: null });
  res.json({ success: true });
}
export async function adminAttach(req, res) {
  await ws.attachInstitution(req.params.id, req.body.institutionId);
  await audit(req, "workspace.attach", { entityType: "workspace", entityId: req.params.id, institutionId: req.body.institutionId });
  res.json({ success: true });
}
export async function adminDetach(req, res) {
  await ws.detachInstitution(req.params.id);
  await audit(req, "workspace.detach", { entityType: "institution", entityId: req.params.id, institutionId: Number(req.params.id) });
  res.json({ success: true });
}
