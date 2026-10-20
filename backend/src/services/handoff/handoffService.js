import { query, queryOne } from "../../config/db.js";
import { emitToTenant } from "../../realtime.js";
import { notFound } from "../../utils/errors.js";
import { emitEvent } from "../integrations/eventBus.js";
import { reasonLabel } from "./handoffPolicy.js";

const announce = (institutionId, contactId, handledBy, reason) => emitEvent({ institutionId, type: "conversation.handoff", data: { contact_id: contactId, handled_by: handledBy, reason } });

/**
 * Who is answering a conversation: the AI or a person. The AI hands over (customer asked for a person, a risky
 * message, a payment proof to check) and a person can hand back. While a person holds the conversation the AI stays
 * quiet; the hold ends after `humanHoldMinutes` without human activity, or when someone hands it back.
 */

/** A note in the conversation only staff see (hand-offs, assignments, order summaries). */
export async function addSystemNote({ institutionId, leadId, channelId = null, text }) {
  await query(
    "INSERT INTO chat_messages (institution_id, lead_id, channel_id, sender_type, message_type, content_text, is_delivered) VALUES (?, ?, ?, 'system', 'text', ?, 1)",
    [institutionId, leadId, channelId, text]
  );
  emitToTenant(institutionId, "chat:message", { leadId, direction: "system", text, sender: "system" });
}

/**
 * The AI gives the conversation to a person. Idempotent: a second hand-off while a person already holds it only
 * refreshes nothing and writes no second note.
 * @returns {Promise<{ changed: boolean }>}
 */
export async function startHandoff({ institutionId, leadId, channelId = null, reason }) {
  const result = await query(
    "UPDATE leads SET handled_by = 'human', handoff_reason = ?, handoff_at = UTC_TIMESTAMP() WHERE id = ? AND institution_id = ? AND handled_by <> 'human'",
    [reason.slice(0, 120), leadId, institutionId]
  );
  if (result.affectedRows === 0) return { changed: false };

  await addSystemNote({ institutionId, leadId, channelId, text: `Dialihkan ke tim: ${reasonLabel(reason)}.` });
  emitToTenant(institutionId, "lead:handoff", { leadId, handledBy: "human", reason });
  announce(institutionId, leadId, "human", reason);
  if (reason !== "manual") emitToTenant(institutionId, "chat:needs_human", { leadId, reason });
  return { changed: true };
}

/**
 * A person is writing to the customer. They now hold the conversation (and keep holding it as long as they keep
 * writing); if nobody was assigned yet it becomes theirs.
 */
export async function noteHumanReply({ institutionId, leadId, userId }) {
  const current = await queryOne("SELECT handled_by FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!current) return;
  const takingOver = current.handled_by !== "human";
  await query(
    `UPDATE leads SET handoff_reason = IF(handled_by = 'human', handoff_reason, 'cs_replied'),
                      handled_by = 'human', handoff_at = UTC_TIMESTAMP(),
                      assigned_cs_id = COALESCE(assigned_cs_id, ?), assigned_at = IF(assigned_cs_id IS NULL, UTC_TIMESTAMP(), assigned_at)
      WHERE id = ? AND institution_id = ?`,
    [userId, leadId, institutionId]
  );
  if (takingOver) {
    emitToTenant(institutionId, "lead:handoff", { leadId, handledBy: "human", reason: "cs_replied" });
    announce(institutionId, leadId, "human", "cs_replied");
  }
}

/** A person (or the hold timing out) gives the conversation back to the AI. */
export async function handBack({ institutionId, leadId, reason = "manual", note = true }) {
  const result = await query(
    "UPDATE leads SET handled_by = 'ai', handoff_reason = NULL, handoff_at = NULL WHERE id = ? AND institution_id = ? AND handled_by = 'human'",
    [leadId, institutionId]
  );
  if (result.affectedRows === 0) return { changed: false };
  if (note) await addSystemNote({ institutionId, leadId, text: reason === "expired" ? "AI melanjutkan percakapan (tidak ada balasan tim)." : "Percakapan dikembalikan ke AI." });
  emitToTenant(institutionId, "lead:handoff", { leadId, handledBy: "ai", reason });
  announce(institutionId, leadId, "ai", reason);
  return { changed: true };
}

/** Staff button: take the conversation from the AI now. */
export async function takeOver({ institutionId, leadId, userId }) {
  const lead = await queryOne("SELECT id, channel_id FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
  const { changed } = await startHandoff({ institutionId, leadId, channelId: lead.channel_id, reason: "manual" });
  await noteHumanReply({ institutionId, leadId, userId });
  return { changed };
}
