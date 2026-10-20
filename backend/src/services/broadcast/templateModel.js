/**
 * WhatsApp message templates as plain data. A business may only start a conversation, or write after the customer's
 * 24-hour window has closed, with a template Meta has approved. Pure functions: nothing here touches the database or
 * the network.
 */

export const TEMPLATE_CATEGORIES = Object.freeze(["marketing", "utility", "authentication"]);
export const LANGUAGES = Object.freeze({ id: "Indonesia", en: "English", en_US: "English (US)", ms: "Melayu", ar: "Arab" });

const NAME = /^[a-z0-9_]{1,100}$/;
const PLACEHOLDER = /\{\{\s*(\d{1,2})\s*\}\}/g;
export const BODY_MAX = 1024;
export const HEADER_TEXT_MAX = 60;
export const FOOTER_MAX = 60;
export const BUTTON_TEXT_MAX = 25;
export const MAX_BUTTONS = 3;

/** The placeholder numbers used in a text, in order of first appearance: "Halo {{1}}, kode {{2}}" -> [1, 2]. */
export function placeholderNumbers(text = "") {
  const seen = [];
  for (const m of String(text).matchAll(PLACEHOLDER)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen;
}

/** Placeholders must be {{1}}..{{n}} with no gaps, as Meta requires. */
const isSequential = (numbers) => [...numbers].sort((a, b) => a - b).every((n, i) => n === i + 1);

/**
 * Check a template the owner wants to create. Returns a list of plain-language problems (empty when it is fine).
 * Rules follow what Meta enforces at submission; Meta still has the final say (review can reject).
 */
export function validateTemplateInput(input) {
  const problems = [];
  if (!NAME.test(input.name || "")) problems.push("Nama hanya boleh huruf kecil, angka, dan garis bawah.");
  if (!TEMPLATE_CATEGORIES.includes(input.category)) problems.push("Kategori tidak dikenal.");
  if (input.category === "authentication") problems.push("Templat autentikasi (OTP) tidak bisa dipakai untuk broadcast.");

  const body = String(input.body || "").trim();
  if (!body) problems.push("Isi pesan wajib diisi.");
  if (body.length > BODY_MAX) problems.push(`Isi pesan maksimal ${BODY_MAX} karakter.`);
  const bodyNumbers = placeholderNumbers(body);
  if (!isSequential(bodyNumbers)) problems.push("Variabel harus berurutan {{1}}, {{2}}, ... tanpa lompat.");
  if (/^\s*\{\{/.test(body) || /\}\}\s*$/.test(body)) problems.push("Isi pesan tidak boleh diawali atau diakhiri variabel.");
  if (/\{\{\d+\}\}\s*\{\{\d+\}\}/.test(body)) problems.push("Dua variabel tidak boleh berdempetan.");
  const examples = input.bodyExamples || [];
  if (bodyNumbers.length && examples.length !== bodyNumbers.length) problems.push(`Isi contoh untuk ${bodyNumbers.length} variabel (Meta mewajibkannya).`);
  if (bodyNumbers.length && body.length < bodyNumbers.length * 12) problems.push("Isi pesan terlalu pendek dibanding jumlah variabelnya.");

  if (input.headerText) {
    if (input.headerText.length > HEADER_TEXT_MAX) problems.push(`Judul maksimal ${HEADER_TEXT_MAX} karakter.`);
    if (placeholderNumbers(input.headerText).length > 1) problems.push("Judul hanya boleh punya satu variabel.");
  }
  if (input.footer && input.footer.length > FOOTER_MAX) problems.push(`Catatan kaki maksimal ${FOOTER_MAX} karakter.`);

  const buttons = input.buttons || [];
  if (buttons.length > MAX_BUTTONS) problems.push(`Maksimal ${MAX_BUTTONS} tombol.`);
  for (const b of buttons) {
    if (!b.text || b.text.length > BUTTON_TEXT_MAX) problems.push(`Teks tombol wajib diisi, maksimal ${BUTTON_TEXT_MAX} karakter.`);
    if (b.type === "url" && !/^https:\/\/\S+$/.test(b.url || "")) problems.push("Tombol tautan harus memakai alamat https://.");
  }
  return problems;
}

/** The `components` array Meta's API expects, built from a friendly description. */
export function buildComponents(input) {
  const components = [];
  if (input.headerText) {
    const header = { type: "HEADER", format: "TEXT", text: input.headerText };
    if (placeholderNumbers(input.headerText).length) header.example = { header_text: [input.headerExample || "Contoh"] };
    components.push(header);
  }
  const body = { type: "BODY", text: input.body.trim() };
  if (placeholderNumbers(body.text).length) body.example = { body_text: [input.bodyExamples] };
  components.push(body);
  if (input.footer) components.push({ type: "FOOTER", text: input.footer });
  if (input.buttons?.length) {
    components.push({
      type: "BUTTONS",
      buttons: input.buttons.map((b) => (b.type === "url" ? { type: "URL", text: b.text, url: b.url } : { type: "QUICK_REPLY", text: b.text })),
    });
  }
  return components;
}

/** What the rest of the system needs to know about a template's components, whoever created them. */
export function describeComponents(components = []) {
  const header = components.find((c) => c.type === "HEADER");
  const body = components.find((c) => c.type === "BODY");
  const format = header?.format ? String(header.format).toLowerCase() : "none";
  return {
    bodyText: body?.text || "",
    variableCount: placeholderNumbers(body?.text).length,
    headerFormat: ["text", "image", "video", "document"].includes(format) ? format : "none",
    headerVariables: header?.format === "TEXT" ? placeholderNumbers(header.text).length : 0,
    footer: components.find((c) => c.type === "FOOTER")?.text || null,
    buttons: (components.find((c) => c.type === "BUTTONS")?.buttons || []).map((b) => ({ type: String(b.type).toLowerCase(), text: b.text })),
  };
}

/** The sentence a customer would read, with variables filled (sample or real values). */
export function renderBody(bodyText, values = []) {
  return String(bodyText).replace(PLACEHOLDER, (whole, n) => values[Number(n) - 1] ?? whole);
}

/**
 * The `components` of a send request: body parameters in order, plus the header media when the template has one.
 * @param {{ variableCount: number, headerFormat: string }} template
 * @param {string[]} values one per body variable
 * @param {string|null} headerMediaUrl required for image, video and document headers
 */
export function buildSendComponents(template, values, headerMediaUrl = null) {
  const components = [];
  if (["image", "video", "document"].includes(template.headerFormat) && headerMediaUrl) {
    components.push({ type: "header", parameters: [{ type: template.headerFormat, [template.headerFormat]: { link: headerMediaUrl } }] });
  }
  if (template.variableCount > 0) {
    components.push({ type: "body", parameters: values.slice(0, template.variableCount).map((text) => ({ type: "text", text: String(text) })) });
  }
  return components;
}

const STATUS = { APPROVED: "approved", PENDING: "pending", IN_APPEAL: "pending", REJECTED: "rejected", PAUSED: "paused", DISABLED: "disabled", LIMIT_EXCEEDED: "paused", PENDING_DELETION: "disabled", DELETED: "disabled", FLAGGED: "paused", REINSTATED: "approved" };

/** Meta's template status words, as ours. Unknown words are treated as pending: not usable until Meta says so. */
export const mapMetaStatus = (status) => STATUS[String(status || "").toUpperCase()] ?? "pending";

export const mapMetaCategory = (category) => {
  const c = String(category || "").toLowerCase();
  return TEMPLATE_CATEGORIES.includes(c) ? c : "utility";
};
