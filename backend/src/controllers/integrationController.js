import { query, queryOne } from "../config/db.js";
import { encryptSecret } from "../utils/crypto.js";
import { conflict, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";

/** GET /whatsapp/channel — never returns the access token. */
export async function getWhatsAppChannel(req, res) {
  const row = await queryOne(
    "SELECT phone_number_id, display_phone, is_active, updated_at FROM whatsapp_channels WHERE institution_id = ?",
    [req.tenantId]
  );
  res.json({ success: true, configured: Boolean(row), channel: row || null });
}

/** PUT /whatsapp/channel — register or replace the tenant's WhatsApp Cloud API number. */
export async function upsertWhatsAppChannel(req, res) {
  const { phone_number_id, display_phone, access_token } = req.body;

  const owner = await queryOne("SELECT institution_id FROM whatsapp_channels WHERE phone_number_id = ?", [phone_number_id]);
  if (owner && owner.institution_id !== req.tenantId) {
    throw conflict("Nomor WhatsApp ini sudah terhubung ke instansi lain.");
  }

  await query(
    `INSERT INTO whatsapp_channels (institution_id, phone_number_id, display_phone, encrypted_access_token, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE phone_number_id = VALUES(phone_number_id), display_phone = VALUES(display_phone),
                             encrypted_access_token = VALUES(encrypted_access_token), is_active = 1`,
    [req.tenantId, phone_number_id, display_phone ?? null, encryptSecret(access_token)]
  );
  await audit(req, "whatsapp.channel_upsert", { entityType: "whatsapp_channel", entityId: phone_number_id });
  res.json({ success: true, message: "Kanal WhatsApp tersimpan.", configured: true });
}

/** DELETE /whatsapp/channel */
export async function deleteWhatsAppChannel(req, res) {
  const result = await query("DELETE FROM whatsapp_channels WHERE institution_id = ?", [req.tenantId]);
  if (!result.affectedRows) throw notFound("Kanal WhatsApp belum dikonfigurasi.");
  await audit(req, "whatsapp.channel_delete");
  res.json({ success: true, message: "Kanal WhatsApp dihapus." });
}

/** GET /whatsapp/status — real connection state derived from configuration and message traffic. */
export async function getWhatsAppStatus(req, res) {
  const channel = await queryOne("SELECT phone_number_id, display_phone FROM whatsapp_channels WHERE institution_id = ? AND is_active = 1", [req.tenantId]);
  const last = await queryOne(
    `SELECT MAX(CASE WHEN sender_type = 'customer' THEN created_at END) AS lastInboundAt,
            MAX(CASE WHEN sender_type <> 'customer' AND is_delivered = 1 THEN created_at END) AS lastOutboundAt
       FROM chat_messages WHERE institution_id = ?`,
    [req.tenantId]
  );
  res.json({
    success: true,
    configured: Boolean(channel),
    status: channel ? "configured" : "not_configured",
    displayPhone: channel?.display_phone ?? null,
    lastInboundAt: last?.lastInboundAt ?? null,
    lastOutboundAt: last?.lastOutboundAt ?? null,
  });
}

/** PUT /integrations/meta-capi — per-tenant Meta pixel for purchase attribution. */
export async function upsertMetaCapi(req, res) {
  const { pixel_id, access_token } = req.body;
  await query("UPDATE institutions SET meta_pixel_id = ?, encrypted_meta_capi_token = ? WHERE id = ?", [pixel_id, encryptSecret(access_token), req.tenantId]);
  await audit(req, "integration.meta_capi_upsert");
  res.json({ success: true, message: "Meta Conversions API tersimpan." });
}
