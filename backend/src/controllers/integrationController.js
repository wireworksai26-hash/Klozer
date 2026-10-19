import { query, queryOne } from "../config/db.js";
import { encryptSecret } from "../utils/crypto.js";
import { conflict, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";
import { createChannel, deleteChannel } from "../services/channels/channelRepository.js";

/**
 * The original single-number WhatsApp endpoints. They keep working for the existing settings page and now act on
 * the tenant's default WhatsApp channel; several numbers are managed through /channels.
 */

const loadDefaultRow = (institutionId, { activeOnly = true } = {}) =>
  queryOne(
    `SELECT * FROM channels WHERE institution_id = ? AND type = 'whatsapp' ${activeOnly ? "AND is_active = 1" : ""} ORDER BY is_default DESC, id ASC LIMIT 1`,
    [institutionId]
  );

/** GET /whatsapp/channel — never returns the access token. */
export async function getWhatsAppChannel(req, res) {
  const channel = await loadDefaultRow(req.tenantId, { activeOnly: false });
  res.json({
    success: true,
    configured: Boolean(channel),
    channel: channel ? { phone_number_id: channel.external_id, display_phone: channel.display_handle, is_active: channel.is_active, updated_at: channel.updated_at } : null,
  });
}

/** PUT /whatsapp/channel — register or replace the tenant's default WhatsApp Cloud API number. */
export async function upsertWhatsAppChannel(req, res) {
  const { phone_number_id, display_phone, access_token } = req.body;
  const current = await loadDefaultRow(req.tenantId, { activeOnly: false });

  if (current) {
    // replacing the default number: the new number must not belong to someone else (or to another of our channels)
    const owner = await queryOne("SELECT id, institution_id FROM channels WHERE type = 'whatsapp' AND external_id = ?", [phone_number_id]);
    if (owner && (owner.institution_id !== req.tenantId || owner.id !== current.id)) {
      throw conflict(owner.institution_id === req.tenantId ? "Nomor ini sudah terhubung sebagai kanal lain di toko Anda." : "Nomor WhatsApp ini sudah terhubung ke instansi lain.");
    }
    await query(
      "UPDATE channels SET external_id = ?, display_handle = ?, encrypted_access_token = ?, is_active = 1 WHERE id = ? AND institution_id = ?",
      [phone_number_id, display_phone ?? null, encryptSecret(access_token), current.id, req.tenantId]
    );
  } else {
    await createChannel({
      institutionId: req.tenantId,
      type: "whatsapp",
      name: display_phone || "WhatsApp",
      externalId: phone_number_id,
      displayHandle: display_phone ?? null,
      accessToken: access_token,
    });
  }
  await audit(req, "whatsapp.channel_upsert", { entityType: "whatsapp_channel", entityId: phone_number_id });
  res.json({ success: true, message: "Kanal WhatsApp tersimpan.", configured: true });
}

/** DELETE /whatsapp/channel — removes the default WhatsApp channel. */
export async function deleteWhatsAppChannel(req, res) {
  const current = await loadDefaultRow(req.tenantId, { activeOnly: false });
  if (!current) throw notFound("Kanal WhatsApp belum dikonfigurasi.");
  await deleteChannel(req.tenantId, current.id);
  await audit(req, "whatsapp.channel_delete");
  res.json({ success: true, message: "Kanal WhatsApp dihapus." });
}

/** GET /whatsapp/status — real connection state derived from configuration and message traffic. */
export async function getWhatsAppStatus(req, res) {
  const channel = await loadDefaultRow(req.tenantId);
  const last = await queryOne(
    `SELECT MAX(CASE WHEN sender_type = 'customer' THEN created_at END) AS lastInboundAt,
            MAX(CASE WHEN sender_type IN ('cs', 'ai_agent') AND is_delivered = 1 THEN created_at END) AS lastOutboundAt
       FROM chat_messages WHERE institution_id = ?`,
    [req.tenantId]
  );
  res.json({
    success: true,
    configured: Boolean(channel),
    status: channel ? "configured" : "not_configured",
    displayPhone: channel?.display_handle ?? null,
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
