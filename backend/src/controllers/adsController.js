import { query, queryOne } from "../config/db.js";
import { audit } from "../services/auditService.js";
import { deleteSpend, listSpend, upsertSpend } from "../services/ads/adSpendService.js";
import { getAdsSettings, removeAdsSettings, saveAdsSettings, syncMetaSpend } from "../services/ads/metaAdsSync.js";
import { roasReport } from "../services/ads/roasReport.js";
import { sendPurchaseEvent } from "../services/metaCapiService.js";
import { badRequest, notFound } from "../utils/errors.js";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/** GET /ads/roas?from&to&groupBy=campaign|ad|day (default: last 30 days, by campaign) */
export async function roas(req, res) {
  const from = req.query.from ?? daysAgo(29);
  const to = req.query.to ?? today();
  if (from > to) throw badRequest("Tanggal mulai harus sebelum tanggal akhir.");
  res.json({ success: true, data: await roasReport({ institutionId: req.tenantId, from, to, groupBy: req.query.groupBy ?? "campaign" }) });
}

/** GET /ads/spend */
export async function spend(req, res) {
  res.json({ success: true, data: await listSpend(req.tenantId, req.query) });
}

/** POST /ads/spend: enter (or correct) spend by hand. */
export async function putSpend(req, res) {
  const written = await upsertSpend(req.tenantId, req.body.rows, "manual");
  await audit(req, "ads.spend", { entityType: "ad_spend", metadata: { rows: written } });
  res.json({ success: true, message: "Biaya iklan tersimpan.", data: { rows: written } });
}

/** DELETE /ads/spend/:id */
export async function removeSpend(req, res) {
  await deleteSpend(req.tenantId, Number(req.params.id));
  res.json({ success: true, message: "Data biaya iklan dihapus." });
}

/** GET /ads/settings: the connected ad account (never the token). */
export async function settings(req, res) {
  res.json({ success: true, data: await getAdsSettings(req.tenantId) });
}

/** PUT /ads/settings */
export async function putSettings(req, res) {
  const data = await saveAdsSettings(req.tenantId, req.body);
  await audit(req, "ads.connect", { entityType: "meta_ads_settings", entityId: req.tenantId });
  res.json({ success: true, message: "Akun iklan tersimpan. Jalankan sinkronisasi untuk mengambil biaya.", data });
}

/** DELETE /ads/settings */
export async function disconnect(req, res) {
  await removeAdsSettings(req.tenantId);
  await audit(req, "ads.disconnect", { entityType: "meta_ads_settings", entityId: req.tenantId });
  res.json({ success: true, message: "Akun iklan diputus." });
}

/** POST /ads/sync: pull spend from Meta now. */
export async function sync(req, res) {
  const data = await syncMetaSpend({ institutionId: req.tenantId, days: req.body.days });
  res.json({ success: true, message: `${data.rows} baris biaya iklan diperbarui.`, data });
}

/** GET /ads/capi: conversion events sent to Meta and whether the tenant has set it up. */
export async function capi(req, res) {
  const inst = await queryOne("SELECT meta_pixel_id, encrypted_meta_capi_token FROM institutions WHERE id = ?", [req.tenantId]);
  const [counts, recent] = await Promise.all([
    query("SELECT is_success, COUNT(*) AS n FROM meta_capi_event_logs WHERE institution_id = ? GROUP BY is_success", [req.tenantId]),
    query(
      `SELECT e.id, e.order_id, o.order_number, e.response_status_code, e.is_success, e.attempts, e.next_retry_at, e.sent_at, e.event_payload_json
         FROM meta_capi_event_logs e JOIN orders o ON o.id = e.order_id WHERE e.institution_id = ? ORDER BY e.id DESC LIMIT 30`,
      [req.tenantId]
    ),
  ]);
  const tally = { sent: 0, failed: 0 };
  for (const c of counts) tally[c.is_success ? "sent" : "failed"] = Number(c.n);
  res.json({
    success: true,
    data: {
      configured: Boolean(inst?.meta_pixel_id && inst?.encrypted_meta_capi_token),
      pixelId: inst?.meta_pixel_id ?? null,
      ...tally,
      recent: recent.map((e) => {
        const payload = typeof e.event_payload_json === "string" ? JSON.parse(e.event_payload_json) : e.event_payload_json;
        return { id: Number(e.id), orderId: e.order_id, orderNumber: e.order_number, status: e.response_status_code, success: Boolean(e.is_success), attempts: e.attempts, nextRetryAt: e.next_retry_at, sentAt: e.sent_at, mode: payload?.data?.[0]?.action_source ?? null };
      }),
    },
  });
}

/** POST /ads/capi/orders/:orderId/send: send (or resend) the purchase event for a paid order. */
export async function sendCapi(req, res) {
  const order = await queryOne("SELECT id, status FROM orders WHERE id = ? AND institution_id = ?", [req.params.orderId, req.tenantId]);
  if (!order) throw notFound("Pesanan tidak ditemukan.");
  if (!["paid", "processing", "shipped", "delivered", "completed"].includes(order.status)) throw badRequest("Hanya pesanan yang sudah dibayar yang bisa dikirim sebagai konversi.");
  const result = await sendPurchaseEvent({ institutionId: req.tenantId, orderId: order.id });
  res.json({ success: Boolean(result.success), data: result });
}
