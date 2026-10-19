import { normalizeForMatch } from "../handoff/handoffPolicy.js";
import { normalizePhone } from "../../utils/helpers.js";

/**
 * What a customer's short reply means during an order. Pure functions over plain text, deliberately simple and
 * deterministic: the steps that commit money (confirming an order, choosing how to pay, picking a courier) are
 * never decided by a language model.
 */

const words = (text) => normalizeForMatch(text).split(" ").filter(Boolean);
const hasAny = (tokens, list) => tokens.some((t) => list.has(t));
const hasPhrase = (text, phrases) => {
  const haystack = ` ${normalizeForMatch(text)} `;
  return phrases.some((p) => haystack.includes(` ${p} `));
};

const BUY_WORDS = new Set(["pesan", "pesen", "beli", "order", "ambil", "checkout", "booking", "bungkus", "borong", "keranjang", "co"]);
const BUY_PHRASES = ["mau beli", "mau pesan", "mau order", "mau ambil", "aku mau", "saya mau", "gue mau", "minta", "tambah", "tambahin", "kirim ke"];
const QUANTITY = /\b\d{1,3}\s*(pcs|pc|buah|biji|pack|box|porsi|set|botol|bungkus|kg|gram|lusin|pasang|unit)\b/i;

/** Does this message sound like someone starting or changing an order? */
export function isBuyIntent(text) {
  const tokens = words(text);
  return hasAny(tokens, BUY_WORDS) || hasPhrase(text, BUY_PHRASES) || QUANTITY.test(String(text));
}

const AFFIRM = new Set(["ya", "iya", "yaa", "yap", "yup", "y", "ok", "oke", "okey", "okay", "sip", "siap", "betul", "benar", "bener", "setuju", "lanjut", "gas", "yoi", "boleh", "deal", "yes", "sudah", "udah", "mantap", "oce"]);
const FILLER = new Set(["kak", "ka", "kakak", "min", "admin", "ya", "dong", "deh", "aja", "saja", "banget", "sih", "yuk", "nih", "kok", "lah"]);
const NEGATION = new Set(["tidak", "nggak", "ngga", "gak", "ga", "enggak", "bukan", "belum", "ubah", "ganti", "salah", "revisi", "edit", "tapi", "batal", "jangan", "kurang", "lebih", "tambah"]);

/** A plain "yes, go ahead": short, starts with an agreement word, contains nothing that changes or refuses. */
export function isAffirmative(text) {
  const tokens = words(text);
  if (tokens.length === 0 || tokens.length > 6) return false;
  if (hasAny(tokens, NEGATION)) return false;
  const meaningful = tokens.filter((t) => !FILLER.has(t) || t === "ya");
  if (meaningful.length === 0) return false;
  return AFFIRM.has(meaningful[0]) || AFFIRM.has(tokens[0]);
}

const CANCEL_PHRASES = ["batal", "dibatalkan", "cancel", "gak jadi", "ga jadi", "nggak jadi", "ngga jadi", "tidak jadi", "gk jadi", "urung", "jangan dilanjut", "batalkan", "batalin"];

/** The customer gives up on the order. */
export function isCancel(text) {
  return hasPhrase(text, CANCEL_PHRASES);
}

/** The customer wants to change something already shown. */
export function wantsChange(text) {
  const tokens = words(text);
  return hasAny(tokens, new Set(["ubah", "ganti", "salah", "revisi", "edit", "koreksi", "tambah", "kurang", "kurangi", "hapus"]));
}

const QRIS_WORDS = new Set(["qris", "qr", "scan", "gopay", "ovo", "dana", "shopeepay", "linkaja", "ewallet", "e-wallet"]);
const TRANSFER_WORDS = new Set(["transfer", "tf", "rekening", "bank", "bca", "bri", "mandiri", "bni", "va"]);

/** "qris" / "transfer" / "cod" said in words, or null. */
export function detectPaymentChoice(text) {
  const tokens = words(text).map((t) => (t.length > 4 && t.endsWith("nya") ? t.slice(0, -3) : t)); // "qrisnya", "transfernya"
  if (hasAny(tokens, new Set(["cod"])) || hasPhrase(text, ["bayar di tempat", "bayar ditempat", "bayar di rumah", "bayar ke kurir"])) return "cod";
  if (hasAny(tokens, QRIS_WORDS)) return "qris";
  if (hasAny(tokens, TRANSFER_WORDS)) return "bank_transfer";
  return null;
}

/** A bare number choosing from a numbered list ("2", "no 2", "opsi 2 aja"), within 1..max. */
export function parseChoiceNumber(text, max) {
  const m = String(text ?? "").trim().toLowerCase().match(/^(?:no\.?|nomor|opsi|pilihan|pilih)?\s*(\d{1,2})\s*(?:aja|saja|kak|ya)?[.!]?$/);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= max ? n : null;
}

/** "where is my order": resi, tracking, delivery status. */
export function isOrderStatusQuestion(text) {
  const tokens = words(text);
  // "resi", "resinya", "lacak", "lacakin", "tracking"
  if (tokens.some((t) => /^(resi|lacak|tracking|track)(nya|ku|in)?$/.test(t))) return true;
  return hasPhrase(text, ["status pesanan", "pesanan saya", "pesananku", "pesanan ku", "kapan sampai", "kapan dikirim", "sudah dikirim", "udah dikirim", "sampai mana", "cek pesanan", "paketnya mana", "paket saya"]);
}

/** "I already paid": the next step is a photo of the proof. */
export function claimsPayment(text) {
  const tokens = words(text);
  return hasPhrase(text, ["sudah bayar", "udah bayar", "sudah transfer", "udah transfer", "sudah tf", "udah tf", "sudah dibayar", "sdh bayar", "sdh transfer", "bukti transfer"]) || (tokens.includes("transfer") && hasAny(tokens, new Set(["sudah", "udah", "sdh", "barusan"])));
}

const OPT_OUT_PHRASES = ["stop", "berhenti", "unsubscribe", "jangan hubungi", "jangan chat", "jangan kirim", "jangan ganggu", "jangan ingatkan", "gak usah ingatkan", "ga usah ingatkan", "tidak usah ingatkan", "gausah ingatkan", "jangan spam", "stop pesan", "stop chat"];

/** The customer asks not to be messaged proactively. */
export function isOptOut(text) {
  const tokens = words(text);
  if (tokens.length > 12) return false;
  return hasPhrase(text, OPT_OUT_PHRASES);
}

/** A five-digit Indonesian postal code standing on its own (not part of a longer number), or null. */
export function extractPostalCode(text) {
  const matches = [...String(text ?? "").matchAll(/(?<![\d])(\d{5})(?![\d])/g)].map((m) => m[1]);
  return matches.length ? matches[matches.length - 1] : null;
}

/** An Indonesian mobile number in international form (628...), or null. */
export function extractPhone(text) {
  const m = String(text ?? "").match(/(?<!\d)(?:\+?62[\s-]*|0)8\d[\d\s-]{7,12}\d/);
  if (!m) return null;
  const phone = normalizePhone(m[0]);
  return phone.length >= 10 && phone.length <= 15 ? phone : null;
}
