import { audit } from "../services/auditService.js";
import { getBroadcastSettings, updateBroadcastSettings } from "../services/broadcast/broadcastSettings.js";
import { campaignReport, cancelCampaign, createCampaign, creditBalance, launchCampaign, listCampaigns, listRecipients, pauseCampaign, previewForCampaign, resumeCampaign, sendTestMessage } from "../services/broadcast/campaignService.js";
import { consentSummary, importConsent, setConsent } from "../services/broadcast/consentService.js";
import { createTemplate, deleteTemplate, getTemplateRow, listTemplates, syncTemplates, toPublicTemplate } from "../services/broadcast/templateService.js";

const idOf = (req) => Number(req.params.id);

// ---------------------------------------------------------------- templates
/** GET /broadcast/templates */
export async function templates(req, res) {
  res.json({ success: true, data: await listTemplates(req.tenantId, req.query) });
}

/** GET /broadcast/templates/:id */
export async function template(req, res) {
  res.json({ success: true, data: toPublicTemplate(await getTemplateRow(req.tenantId, idOf(req))) });
}

/** POST /broadcast/templates: submit a new template to Meta for review. */
export async function createTemplateHandler(req, res) {
  const data = await createTemplate({ institutionId: req.tenantId, ...req.body });
  await audit(req, "template.create", { entityType: "message_template", entityId: data.id, metadata: { name: data.name, category: data.category } });
  res.status(201).json({ success: true, message: "Templat dikirim ke Meta untuk ditinjau. Biasanya selesai dalam hitungan menit sampai 24 jam.", data });
}

/** POST /broadcast/templates/sync: pull the account's templates and their review status from Meta. */
export async function syncTemplatesHandler(req, res) {
  const data = await syncTemplates({ institutionId: req.tenantId, channelId: req.body.channelId });
  res.json({ success: true, data });
}

/** DELETE /broadcast/templates/:id */
export async function removeTemplate(req, res) {
  await deleteTemplate(req.tenantId, idOf(req));
  await audit(req, "template.delete", { entityType: "message_template", entityId: idOf(req) });
  res.json({ success: true, message: "Templat dihapus." });
}

// ---------------------------------------------------------------- settings and credits
/** GET /broadcast/settings */
export async function getSettings(req, res) {
  res.json({ success: true, data: await getBroadcastSettings(req.tenantId), credits: await creditBalance(req.tenantId) });
}

/** PUT /broadcast/settings */
export async function putSettings(req, res) {
  const data = await updateBroadcastSettings(req.tenantId, req.body);
  await audit(req, "broadcast.settings", { entityType: "broadcast_settings", entityId: req.tenantId, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, message: "Pengaturan broadcast tersimpan.", data });
}

// ---------------------------------------------------------------- campaigns
/** POST /broadcast/audience/preview */
export async function preview(req, res) {
  res.json({ success: true, data: await previewForCampaign({ institutionId: req.tenantId, ...req.body }) });
}

/** GET /broadcast/campaigns */
export async function campaigns(req, res) {
  res.json({ success: true, data: await listCampaigns(req.tenantId) });
}

/** POST /broadcast/campaigns */
export async function createCampaignHandler(req, res) {
  const data = await createCampaign({ institutionId: req.tenantId, userId: req.user.id, ...req.body });
  await audit(req, "broadcast.create", { entityType: "broadcast_campaign", entityId: data.id });
  res.status(201).json({ success: true, message: "Kampanye dibuat sebagai draf.", data });
}

/** GET /broadcast/campaigns/:id: the campaign and its results. */
export async function report(req, res) {
  res.json({ success: true, data: await campaignReport(req.tenantId, idOf(req)) });
}

/** POST /broadcast/campaigns/:id/launch: send now, or at `scheduledAt`. */
export async function launch(req, res) {
  const result = await launchCampaign({ institutionId: req.tenantId, id: idOf(req), scheduledAt: req.body.scheduledAt ?? null });
  const credits = await creditBalance(req.tenantId);
  await audit(req, "broadcast.launch", { entityType: "broadcast_campaign", entityId: idOf(req), metadata: { recipients: result.recipients, scheduled: result.campaign.status === "scheduled" } });
  res.json({
    success: true,
    message: result.campaign.status === "scheduled" ? "Kampanye dijadwalkan." : "Kampanye mulai dikirim.",
    data: result.campaign,
    recipients: result.recipients,
    credits,
    creditsShort: result.recipients !== null && result.recipients > credits.remaining,
  });
}

/** POST /broadcast/campaigns/:id/pause | resume | cancel */
export async function pause(req, res) {
  res.json({ success: true, data: await pauseCampaign(req.tenantId, idOf(req)) });
}
export async function resume(req, res) {
  res.json({ success: true, data: await resumeCampaign(req.tenantId, idOf(req)) });
}
export async function cancel(req, res) {
  const data = await cancelCampaign(req.tenantId, idOf(req));
  await audit(req, "broadcast.cancel", { entityType: "broadcast_campaign", entityId: idOf(req) });
  res.json({ success: true, data });
}

/** GET /broadcast/campaigns/:id/recipients */
export async function recipients(req, res) {
  res.json({ success: true, data: await listRecipients(req.tenantId, idOf(req), req.query) });
}

/** POST /broadcast/test: send the template to one number to see it first. */
export async function testSend(req, res) {
  const result = await sendTestMessage({ institutionId: req.tenantId, ...req.body });
  res.status(result.success ? 200 : 502).json({ success: result.success, message: result.success ? "Pesan uji terkirim." : `Gagal mengirim: ${result.error}`, preview: result.preview });
}

// ---------------------------------------------------------------- consent
/** PUT /leads/:id/consent */
export async function putConsent(req, res) {
  const data = await setConsent({ institutionId: req.tenantId, leadId: idOf(req), state: req.body.state, source: req.body.source || `diubah oleh ${req.user.name}` });
  await audit(req, "consent.set", { entityType: "lead", entityId: idOf(req), metadata: { state: req.body.state } });
  res.json({ success: true, data });
}

/** POST /broadcast/consent/import */
export async function importConsentHandler(req, res) {
  const data = await importConsent({ institutionId: req.tenantId, ...req.body });
  await audit(req, "consent.import", { entityType: "lead", metadata: { state: req.body.state, source: req.body.source, ...data } });
  res.json({ success: true, message: "Persetujuan dicatat.", data });
}

/** GET /broadcast/consent/summary */
export async function consent(req, res) {
  res.json({ success: true, data: await consentSummary(req.tenantId) });
}
