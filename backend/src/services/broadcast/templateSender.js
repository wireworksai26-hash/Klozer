import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { emitToTenant } from "../../realtime.js";
import { getAdapter } from "../channels/adapters/index.js";
import { loadTransportChannel } from "../channels/channelRepository.js";
import { emitEvent } from "../integrations/eventBus.js";
import { messagePayload } from "../integrations/eventPayloads.js";
import { loadSendableTemplate } from "./templateService.js";
import { buildSendComponents, describeComponents, renderBody } from "./templateModel.js";
import { cleanParameter } from "./variableMapper.js";

/**
 * Send one approved template to one contact, outside any campaign (the public API, an automation). The same rules as a
 * campaign apply: a marketing template only to a contact who opted in, nobody who opted out (unless the message is
 * transactional and not marketing), and every message costs a credit, returned if it does not go.
 */
export async function sendTemplateToContact({ institutionId, lead, templateId, values = [], headerMediaUrl = null, transactional = false, source = { api: true } }) {
  if (lead.channel_type !== "whatsapp" || !lead.phone_number) throw badRequest("Templat WhatsApp hanya bisa dikirim ke kontak WhatsApp.", { code: "NOT_WHATSAPP" });
  const template = await loadSendableTemplate(institutionId, templateId);

  if (template.category === "marketing" && lead.marketing_consent !== "opted_in") throw conflict("Kontak ini belum menyetujui pesan promosi.", { code: "NO_MARKETING_CONSENT" });
  if (lead.marketing_consent === "opted_out" && !(transactional && template.category !== "marketing")) throw conflict("Kontak ini sudah berhenti menerima pesan.", { code: "OPTED_OUT" });

  const meta = describeComponents(parseJsonColumn(template.components_json, []));
  if (values.length !== template.variable_count) throw badRequest(`Templat ini punya ${template.variable_count} variabel, tetapi ${values.length} diisi.`, { code: "VARIABLE_COUNT" });
  if (["image", "video", "document"].includes(template.header_format) && !headerMediaUrl) throw badRequest(`Templat ini punya header ${template.header_format}: isi headerMediaUrl.`, { code: "HEADER_MEDIA_REQUIRED" });

  const channel = await loadTransportChannel(institutionId, template.channel_id);
  if (!channel?.accessToken) throw notFound("Kanal WhatsApp templat ini tidak aktif.");

  const clean = values.map((v) => cleanParameter(v) || "-");
  const spent = await query("UPDATE institutions SET blast_credits_used = blast_credits_used + 1 WHERE id = ? AND blast_credits_used < blast_credit_quota", [institutionId]);
  if (!spent.affectedRows) throw conflict("Kredit blast habis.", { code: "OUT_OF_CREDITS" });

  const result = await getAdapter("whatsapp").sendTemplate({
    channel,
    to: lead.phone_number,
    template: { name: template.name, language: template.language, components: buildSendComponents({ variableCount: template.variable_count, headerFormat: template.header_format }, clean, headerMediaUrl) },
  });
  if (!result.success) {
    await query("UPDATE institutions SET blast_credits_used = GREATEST(blast_credits_used - 1, 0) WHERE id = ?", [institutionId]);
    return { success: false, error: result.error };
  }

  const text = renderBody(meta.bodyText, clean);
  await query(
    `INSERT INTO chat_messages (institution_id, lead_id, channel_id, wa_message_id, sender_type, message_type, content_text, is_delivered, meta_json)
     VALUES (?, ?, ?, ?, 'cs', 'text', ?, 1, ?)`,
    [institutionId, lead.id, channel.id, result.messageId, text, JSON.stringify({ ...source, template: template.name })]
  );
  emitToTenant(institutionId, "chat:message", { leadId: lead.id, direction: "outbound", text, sender: "cs" });
  emitEvent({ institutionId, type: "message.sent", data: messagePayload({ contactId: lead.id, channelType: "whatsapp", direction: "outbound", sender: "api", type: "template", text, externalId: result.messageId }) });
  return { success: true, messageId: result.messageId, text };
}

/** For callers that only have an id. */
export async function loadLead(institutionId, leadId) {
  const lead = await queryOne("SELECT * FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
  return lead;
}
