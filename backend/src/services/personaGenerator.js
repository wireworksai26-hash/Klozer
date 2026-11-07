import { sanitizeXss } from "../utils/sanitize.js";
import { GOALS, TONE_STYLES, splitList } from "./personaRules.js";

/**
 * The "buat dengan AI" button on the persona screen: the model drafts a persona from what the shop already tells Klozer
 * (name, kind of business, some products) and a few words from the owner. The result only fills the form; nothing is saved
 * until the owner reviews it and presses save. Pure functions, so the prompt and the reading of the answer can be tested.
 */

/** Same limits as the persona form on the server (validation/schemas.js aiPersonaBody). */
export const LIMITS = Object.freeze({ botName: 80, tone: 300, greetingMessage: 500, abandonedMessage: 500, customFaqKeywords: 500, brandValues: 200, preferredWords: 300, forbiddenWords: 300, offLimitTopics: 400 });

export function buildPersonaPrompt({ shopName, mode, sector, products = [], hint = "", currentBotName = "" }) {
  const kind = mode === "ngo" ? "lembaga sosial atau donasi (NGO)" : "bisnis yang berjualan";
  const names = products.slice(0, 12).map((p) => p.name).filter(Boolean);
  return `
Kamu membantu pemilik toko menyusun persona untuk admin chat WhatsApp mereka. Tulis persona yang terdengar seperti orang sungguhan di lapangan, bukan robot dan bukan brosur.

DATA TOKO
- Nama: ${shopName || "Toko"}
- Jenis: ${kind}${sector ? ` (${sector})` : ""}
- ${names.length ? `Contoh produk atau program: ${names.join(", ")}` : "Produk atau program belum diisi."}
- Nama admin saat ini: ${currentBotName || "belum ada"}
${hint ? `- Arahan dari pemilik: ${hint}` : ""}

PRINSIP PERSONA
- Hangat, sabar, dan tidak defensif. Konsisten dari awal sampai akhir obrolan.
- Menyesuaikan diri dengan pelanggan: formal dengan yang formal, santai dengan yang santai, singkat dengan yang singkat.
- Kalau pelanggan kesal: dengarkan, akui perasaannya dengan kata-katanya sendiri, baru tawarkan satu langkah. Jangan menumpuk daftar solusi.
- Seperti marketing sungguhan: tanggapi hal spesifik yang pelanggan sebut, bukan jawaban template.
- Jujur. Jangan mengarang harga, diskon, alamat, atau janji. Jangan mengaku sebagai manusia.

KELUARAN
Balas HANYA dengan satu objek JSON, tanpa teks lain dan tanpa blok kode, dengan kunci persis ini:
{
  "botName": "nama panggilan admin, satu atau dua kata, maks ${LIMITS.botName} karakter",
  "goal": "salah satu dari: support, sales, both",
  "toneStyles": ["satu sampai dua dari: formal, ramah, empatis"],
  "tone": "gaya bicara dalam beberapa kalimat pendek, maks ${LIMITS.tone} karakter",
  "brandValues": "3 sampai 5 kata kunci karakter brand dipisah koma, maks ${LIMITS.brandValues} karakter",
  "greetingMessage": "sapaan pembuka untuk pesan pertama pelanggan, maks ${LIMITS.greetingMessage} karakter",
  "abandonedMessage": "pesan lembut untuk pelanggan yang belum menyelesaikan pembayaran, maks ${LIMITS.abandonedMessage} karakter, tanpa menekan",
  "customFaqKeywords": "topik yang sering ditanyakan dipisah koma, maks ${LIMITS.customFaqKeywords} karakter",
  "preferredWords": "kata atau istilah yang cocok dengan brand, dipisah koma, boleh kosong",
  "forbiddenWords": "kata kasar atau tidak pantas untuk brand ini, dipisah koma, boleh kosong",
  "offLimitTopics": "topik yang sebaiknya tidak dibahas admin, dipisah koma, mis. politik, SARA, boleh kosong"
}

Aturan tulis: bahasa Indonesia sehari-hari, tanpa tanda pisah panjang (—), tanpa markdown, paling banyak satu emoji per pesan. Jangan menyebut harga atau diskon di sapaan.`.trim();
}

const pickEnum = (value, allowed) => (typeof value === "string" && allowed.includes(value.trim().toLowerCase()) ? value.trim().toLowerCase() : undefined);

/** Text the model wrote, made safe to store: no markup, no control characters, no long dashes, cut at a word at the limit. */
function cleanText(value, max) {
  if (typeof value !== "string") return "";
  let text = sanitizeXss(value).replace(/\p{Cc}/gu, (ch) => (ch === "\n" ? ch : "")).replace(/\s*[—–]\s*/g, ", ").replace(/[ \t]+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return (at > max * 0.6 ? cut.slice(0, at) : cut).trim();
}

/**
 * Read the model's answer. Accepts the JSON object anywhere in the text (models add a sentence or a fence).
 * @returns {object|null} persona fields that fit the form, or null when there is nothing usable
 */
export function parsePersonaAnswer(text) {
  const raw = String(text ?? "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let data;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const out = {};
  for (const key of ["botName", "tone", "greetingMessage", "abandonedMessage", "customFaqKeywords", "brandValues", "preferredWords", "forbiddenWords", "offLimitTopics"]) {
    const value = Array.isArray(data[key]) ? data[key].join(", ") : data[key];
    const cleaned = cleanText(value, LIMITS[key]);
    if (cleaned) out[key] = cleaned;
  }
  const goal = pickEnum(data.goal, Object.keys(GOALS));
  if (goal) out.goal = goal;
  const styles = [...new Set(splitList(data.toneStyles).map((s) => s.toLowerCase()).filter((s) => TONE_STYLES[s]))].slice(0, 2);
  if (styles.length) out.toneStyles = styles;

  // the voice is the point of the feature: without a tone and a greeting there is nothing worth filling in
  return out.tone && out.greetingMessage ? out : null;
}
