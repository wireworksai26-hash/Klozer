import { friendlyFirstName } from "../aiPrompt.js";

/**
 * Filling a template's {{1}}, {{2}}... for one contact. A campaign says, per variable, either a fixed text or a field
 * of the contact; this resolves it. Pure: no database.
 */

export const LEAD_FIELDS = Object.freeze(["name", "first_name", "city"]);

/** A value WhatsApp will accept as a template parameter: one line, no tabs, no runs of spaces. */
export const cleanParameter = (value) => String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 200);

function fieldOf(lead, field) {
  if (field === "first_name") return friendlyFirstName(lead.name);
  if (field === "name") return friendlyFirstName(lead.name) ? String(lead.name).trim() : "";
  if (field === "city") return lead.city ? String(lead.city).trim() : "";
  return "";
}

/**
 * @param {({ type: "text", value: string } | { type: "field", field: string, fallback?: string })[]} spec one entry per variable
 * @param {{ name?: string|null, city?: string|null }} lead
 * @returns {string[]} one string per variable; never empty (WhatsApp rejects an empty parameter)
 */
export function resolveVariables(spec, lead) {
  return spec.map((v) => {
    const value = v.type === "text" ? v.value : fieldOf(lead, v.field) || v.fallback || "";
    return cleanParameter(value) || "-";
  });
}

/** Problems with a campaign's variable setup against its template, in plain language (empty when fine). */
export function validateVariableSpec(spec, variableCount) {
  const problems = [];
  if (spec.length !== variableCount) problems.push(`Templat ini punya ${variableCount} variabel, tetapi ${spec.length} diisi.`);
  for (const v of spec) {
    if (v.type === "field" && !LEAD_FIELDS.includes(v.field)) problems.push(`Kolom kontak "${v.field}" tidak dikenal.`);
    if (v.type === "text" && !cleanParameter(v.value)) problems.push("Teks variabel tidak boleh kosong.");
  }
  return problems;
}
