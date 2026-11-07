import { query } from "../../config/db.js";
import { normalizePhone } from "../../utils/helpers.js";
import { sanitizeXss } from "../../utils/sanitize.js";
import { parseLabel } from "./leadLabels.js";

/** The most rows one import takes. A bigger file is split by the caller. */
export const MAX_IMPORT_ROWS = 1000;
const CHUNK = 200;
const MAX_REPORTED = 50;

const clean = (value, max) => {
  const text = sanitizeXss(String(value ?? "")).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

/**
 * Create many contacts at once. A number that already exists in the shop (or appears twice in the file) is skipped, never
 * overwritten, so an import cannot change a contact someone already worked on. Imported contacts have no marketing consent.
 * @param {{ institutionId: number, rows: Array<{ name?: string, phone: string, city?: string, label?: string, notes?: string }> }} p
 * @returns {Promise<{ total: number, created: number, existing: number, duplicates: number, invalid: Array<{ row: number, reason: string }>, invalidCount: number }>}
 */
export async function importLeads({ institutionId, rows }) {
  const invalid = [];
  const seen = new Set();
  const candidates = [];
  let duplicates = 0;

  rows.forEach((row, index) => {
    const phone = normalizePhone(row.phone);
    if (phone.length < 8 || phone.length > 16) {
      invalid.push({ row: index + 1, reason: "Nomor tidak valid" });
      return;
    }
    if (seen.has(phone)) {
      duplicates++;
      return;
    }
    seen.add(phone);
    const label = parseLabel(row.label);
    const extra = row.label && !label.known ? `Label: ${clean(row.label, 80)}` : null;
    const notes = [clean(row.notes, 1500), extra].filter(Boolean).join(" | ") || null;
    candidates.push([institutionId, phone, phone, clean(row.name, 150) ?? "Pelanggan", clean(row.city, 100), label.status, "Impor Excel", notes, label.isVip ? 1 : 0]);
  });

  const phones = candidates.map((c) => c[1]);
  const known = new Set();
  for (let i = 0; i < phones.length; i += 500) {
    const found = await query("SELECT phone_number FROM leads WHERE institution_id = ? AND phone_number IN (?)", [institutionId, phones.slice(i, i + 500)]);
    for (const r of found) known.add(r.phone_number);
  }
  const fresh = candidates.filter((c) => !known.has(c[1]));

  let created = 0;
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const result = await query(
      "INSERT IGNORE INTO leads (institution_id, phone_number, external_id, name, city, status, source, notes, is_vip) VALUES ?",
      [fresh.slice(i, i + CHUNK)]
    );
    created += Number(result.affectedRows) || 0;
  }

  return {
    total: rows.length,
    created,
    existing: candidates.length - created,
    duplicates,
    invalid: invalid.slice(0, MAX_REPORTED),
    invalidCount: invalid.length,
  };
}
