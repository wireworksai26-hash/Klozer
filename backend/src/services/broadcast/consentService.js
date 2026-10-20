import { query, queryOne, retryOnDeadlock } from "../../config/db.js";
import { normalizePhone } from "../../utils/helpers.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { cancelPending } from "../followup/followupService.js";

/**
 * Who may be sent promotions. Marketing templates go only to contacts who said yes (`opted_in`); anyone who said
 * stop (`opted_out`) gets no promotion and no reminder, ever, until they say otherwise. `unknown` is the state of a
 * customer who simply chatted: that is not consent to marketing.
 */

export const CONSENT_STATES = Object.freeze(["unknown", "opted_in", "opted_out"]);
export const MAX_IMPORT = 5000;

/** Record a decision for one contact. Opting out also stops reminders and drops them from campaigns not yet sent. */
export async function setConsent({ institutionId, leadId, state, source }) {
  const lead = await queryOne("SELECT id FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
  await query(
    "UPDATE leads SET marketing_consent = ?, marketing_consent_at = UTC_TIMESTAMP(), marketing_consent_source = ?, followup_opt_out = IF(? = 'opted_out', 1, followup_opt_out) WHERE id = ?",
    [state, String(source || "").slice(0, 160) || null, state, lead.id]
  );
  if (state === "opted_out") await stopEverything({ institutionId, leadId: lead.id });
  return { leadId: lead.id, state };
}

/** What changes for a contact who opted out. */
async function stopEverything({ institutionId, leadId }) {
  await cancelPending({ leadId, status: "cancelled" });
  await query(
    "UPDATE broadcast_recipients SET status = 'skipped', error_code = 'opted_out', error_message = 'Pelanggan berhenti menerima pesan.' WHERE lead_id = ? AND institution_id = ? AND status = 'pending'",
    [leadId, institutionId]
  );
}

/** The customer asked to stop in chat. */
export const recordOptOutFromChat = ({ institutionId, leadId }) => setConsent({ institutionId, leadId, state: "opted_out", source: "pelanggan meminta berhenti di chat" });

/**
 * Record consent for many phone numbers at once (a list the business collected, e.g. a sign-up form). The caller
 * must state that the consent exists; numbers we do not know yet become contacts so they can receive broadcasts.
 * @returns {Promise<{ updated: number, created: number, invalid: number }>}
 */
export async function importConsent({ institutionId, phones, state = "opted_in", source, attested }) {
  if (state === "opted_in" && attested !== true) throw badRequest("Konfirmasikan bahwa kontak ini sudah menyetujui menerima promosi.", { code: "ATTESTATION_REQUIRED" });
  if (!source || !String(source).trim()) throw badRequest("Sebutkan sumber persetujuan (mis. formulir pendaftaran Oktober).", { code: "SOURCE_REQUIRED" });
  if (phones.length > MAX_IMPORT) throw badRequest(`Maksimal ${MAX_IMPORT} nomor per impor.`, { code: "TOO_MANY" });

  let updated = 0;
  let created = 0;
  let invalid = 0;
  const seen = new Set();
  for (const raw of phones) {
    const phone = normalizePhone(raw);
    if (phone.length < 9 || phone.length > 15 || seen.has(phone)) {
      if (!seen.has(phone)) invalid++;
      continue;
    }
    seen.add(phone);
    const existing = await queryOne("SELECT id FROM leads WHERE institution_id = ? AND phone_number = ?", [institutionId, phone]);
    let leadId;
    if (existing) {
      leadId = existing.id;
      await query(
        "UPDATE leads SET marketing_consent = ?, marketing_consent_at = UTC_TIMESTAMP(), marketing_consent_source = ?, followup_opt_out = IF(? = 'opted_out', 1, followup_opt_out) WHERE id = ?",
        [state, String(source).trim().slice(0, 160), state, leadId]
      );
      updated++;
    } else {
      const result = await retryOnDeadlock(() =>
        query(
          `INSERT INTO leads (institution_id, channel_type, external_id, phone_number, name, source, status, marketing_consent, marketing_consent_at, marketing_consent_source, followup_opt_out)
           VALUES (?, 'whatsapp', ?, ?, 'Pelanggan', 'import', 'new', ?, UTC_TIMESTAMP(), ?, ?)
           ON DUPLICATE KEY UPDATE marketing_consent = VALUES(marketing_consent), marketing_consent_at = UTC_TIMESTAMP(), id = LAST_INSERT_ID(id)`,
          [institutionId, phone, phone, state, String(source).trim().slice(0, 160), state === "opted_out" ? 1 : 0]
        )
      );
      leadId = result.insertId;
      created++;
    }
    if (state === "opted_out") await stopEverything({ institutionId, leadId });
  }
  return { updated, created, invalid };
}

export async function consentSummary(institutionId) {
  const rows = await query("SELECT marketing_consent AS state, COUNT(*) AS n FROM leads WHERE institution_id = ? AND channel_type = 'whatsapp' GROUP BY marketing_consent", [institutionId]);
  const summary = { unknown: 0, opted_in: 0, opted_out: 0 };
  for (const r of rows) summary[r.state] = Number(r.n);
  return summary;
}
