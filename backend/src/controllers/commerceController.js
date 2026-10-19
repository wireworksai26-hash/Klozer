import { query, queryOne } from "../config/db.js";
import { audit } from "../services/auditService.js";
import { getCommerceSettings, updateCommerceSettings } from "../services/commerce/commerceSettings.js";
import { closeDraft, getDraft, listOpenDrafts } from "../services/commerce/draftRepository.js";
import { priceLines } from "../services/commerce/draftModel.js";
import { loadCatalog } from "../services/commerce/catalog.js";
import { isGatewayConfigured } from "../services/ipaymuService.js";
import { cancelPending, followupOverview } from "../services/followup/followupService.js";
import { isBiteshipConfigured } from "../services/shipping/biteship.js";
import { notFound } from "../utils/errors.js";

/** What the tenant's setup still lacks for the assistant to take orders end to end. */
async function readiness(institutionId, settings) {
  const [{ banks }] = await query("SELECT COUNT(*) AS banks FROM bank_accounts WHERE institution_id = ? AND is_active = 1", [institutionId]);
  const [{ products }] = await query("SELECT COUNT(*) AS products FROM products WHERE institution_id = ? AND is_active = 1 AND stock_quantity > 0", [institutionId]);
  const problems = [];
  if (!Number(products)) problems.push("Belum ada produk aktif dengan stok.");
  if (!(settings.payQris && isGatewayConfigured()) && !(settings.payTransfer && Number(banks) > 0) && !settings.payCod) problems.push("Belum ada cara bayar yang bisa dipakai (QRIS belum dikonfigurasi di server dan belum ada rekening transfer).");
  if (settings.shippingMode === "provider" && !isBiteshipConfigured()) problems.push("Mode ongkir 'provider' dipilih tetapi BITESHIP_API_KEY belum diisi di server; ongkir akan diserahkan ke tim.");
  if (settings.shippingMode === "provider" && !settings.originPostalCode) problems.push("Kode pos asal pengiriman belum diisi.");
  if (settings.shippingMode === "ask_team") problems.push("Ongkir diserahkan ke tim: setiap pesanan akan berhenti di tim kami setelah alamat diterima.");
  return problems;
}

/** GET /commerce/settings */
export async function getSettings(req, res) {
  const settings = await getCommerceSettings(req.tenantId);
  res.json({ success: true, data: settings, readiness: await readiness(req.tenantId, settings), capabilities: { qrisGateway: isGatewayConfigured(), shippingProvider: isBiteshipConfigured() } });
}

/** PUT /commerce/settings */
export async function putSettings(req, res) {
  const data = await updateCommerceSettings(req.tenantId, req.body);
  await audit(req, "commerce.update", { entityType: "commerce_settings", entityId: req.tenantId, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, message: "Pengaturan chat commerce tersimpan.", data, readiness: await readiness(req.tenantId, data) });
}

/** GET /commerce/drafts: orders being put together in chat right now. */
export async function listDrafts(req, res) {
  const [drafts, catalog] = await Promise.all([listOpenDrafts(req.tenantId), loadCatalog(req.tenantId)]);
  res.json({
    success: true,
    data: drafts.map((d) => {
      const { lines } = priceLines(d.items, catalog);
      return { id: d.id, leadId: d.leadId, leadName: d.leadName, status: d.status, items: lines, subtotal: lines.reduce((s, l) => s + l.subtotal, 0), recipient: { name: d.recipientName, phone: d.recipientPhone, address: d.addressText, city: d.city, postalCode: d.postalCode }, lastActivityAt: d.lastActivityAt };
    }),
  });
}

/** POST /commerce/drafts/:id/cancel */
export async function cancelDraft(req, res) {
  const draft = await getDraft(req.tenantId, Number(req.params.id));
  if (!draft) throw notFound("Draf pesanan tidak ditemukan.");
  await closeDraft(req.tenantId, draft.id, "cancelled");
  await cancelPending({ draftId: draft.id, status: "cancelled" });
  await audit(req, "commerce.draft_cancel", { entityType: "order_draft", entityId: draft.id });
  res.json({ success: true, message: "Draf pesanan dibatalkan." });
}

/** GET /commerce/followups: reminder statistics and what is scheduled next. */
export async function followups(req, res) {
  res.json({ success: true, data: await followupOverview(req.tenantId) });
}

/** POST /commerce/followups/:id/cancel */
export async function cancelFollowup(req, res) {
  const result = await query("UPDATE proactive_followup_jobs SET status = 'cancelled' WHERE id = ? AND institution_id = ? AND status = 'pending'", [req.params.id, req.tenantId]);
  if (!result.affectedRows) throw notFound("Pengingat tidak ditemukan atau sudah diproses.");
  res.json({ success: true, message: "Pengingat dibatalkan." });
}

/** PUT /leads/:id/followup-opt-out: record that a customer asked not to be reminded (or that they are fine with it again). */
export async function setOptOut(req, res) {
  const lead = await queryOne("SELECT id FROM leads WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
  await query("UPDATE leads SET followup_opt_out = ? WHERE id = ?", [req.body.optOut ? 1 : 0, lead.id]);
  if (req.body.optOut) await cancelPending({ leadId: lead.id, status: "cancelled" });
  res.json({ success: true, data: { leadId: lead.id, optOut: req.body.optOut } });
}
