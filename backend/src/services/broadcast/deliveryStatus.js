import { query } from "../../config/db.js";

/**
 * WhatsApp tells us, after the fact, what happened to each message (sent, delivered, read, failed). For campaign
 * messages that updates the recipient row. Statuses only move forward: a late "delivered" never undoes "read".
 */

const REPLY_WINDOW_HOURS = 48;

/**
 * @param {{ id: string, status: string, timestamp?: string|number, errors?: { code?: number, title?: string, message?: string, error_data?: { details?: string } }[] }} status
 * @returns {Promise<boolean>} true when a campaign recipient was affected
 */
export async function applyDeliveryStatus(status) {
  if (!status?.id) return false;
  const at = status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date();

  if (status.status === "delivered") {
    const r = await query("UPDATE broadcast_recipients SET status = IF(status IN ('sending', 'sent'), 'delivered', status), delivered_at = COALESCE(delivered_at, ?) WHERE wa_message_id = ?", [at, status.id]);
    return r.affectedRows > 0;
  }
  if (status.status === "read") {
    const r = await query("UPDATE broadcast_recipients SET status = 'read', delivered_at = COALESCE(delivered_at, ?), read_at = COALESCE(read_at, ?) WHERE wa_message_id = ? AND status IN ('sending', 'sent', 'delivered', 'read')", [at, at, status.id]);
    return r.affectedRows > 0;
  }
  if (status.status === "failed") {
    const error = status.errors?.[0] || {};
    const message = String(error.error_data?.details || error.message || error.title || "Gagal terkirim.").slice(0, 250);
    // a message Meta accepted but could not deliver is not billed: give the credit back
    const row = await query("SELECT id, institution_id FROM broadcast_recipients WHERE wa_message_id = ? AND status IN ('sending', 'sent')", [status.id]);
    if (!row.length) return false;
    await query("UPDATE broadcast_recipients SET status = 'failed', error_code = ?, error_message = ? WHERE id = ?", [String(error.code ?? "").slice(0, 20), message, row[0].id]);
    await query("UPDATE institutions SET blast_credits_used = GREATEST(blast_credits_used - 1, 0) WHERE id = ?", [row[0].institution_id]);
    return true;
  }
  return false; // "sent" is already what we recorded
}

/** A contact wrote: if they were sent a campaign message recently, count it as a reply to that campaign. */
export async function markBroadcastReply({ leadId, institutionId }) {
  await query(
    `UPDATE broadcast_recipients SET replied_at = UTC_TIMESTAMP()
      WHERE lead_id = ? AND institution_id = ? AND replied_at IS NULL AND status IN ('sent', 'delivered', 'read')
        AND sent_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${REPLY_WINDOW_HOURS} HOUR)`,
    [leadId, institutionId]
  );
}
