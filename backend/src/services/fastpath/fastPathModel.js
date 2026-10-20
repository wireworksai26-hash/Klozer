import { normalizeForMatch } from "../handoff/handoffPolicy.js";
import { claimsPayment, isBuyIntent, isOrderStatusQuestion } from "../commerce/purchaseIntent.js";
import { rupiah } from "../commerce/messages.js";

/**
 * The fast path: repetitive questions answered from the shop's own data, by code, with no language model and so no
 * tokens. Only short messages that are clearly one of these questions qualify; anything longer, mixed, or about an order
 * goes to the normal flow (order rules, then the assistant, then a person). This file is the decision and the wording;
 * it reads nothing from the database.
 */

export const FAST_TOPICS = Object.freeze(["greeting", "thanks", "payment", "catalog", "product", "info"]);
export const DEFAULT_TOPICS = Object.freeze(Object.fromEntries(FAST_TOPICS.map((t) => [t, true])));

/** More than this many words is a real conversation, not a lookup. */
export const MAX_WORDS = 12;
/** A product list longer than this is cut, and the customer is asked to name what they want. */
export const MAX_LISTED_PRODUCTS = 12;
export const MAX_CANDIDATES = 5;

/** Lower case, letters and digits only, and "rekeningnya" read as "rekening" (a trailing -nya is chat habit, not another word). */
const normalized = (text) => normalizeForMatch(text).replace(/\b([a-z]{3,})nya\b/g, "$1");
const words = (text) => normalized(text).split(" ").filter(Boolean);
const padded = (text) => ` ${normalized(text)} `;
const hasPhrase = (text, phrases) => phrases.some((p) => padded(text).includes(` ${p} `));
const hasWord = (tokens, set) => tokens.some((t) => set.has(t));

const GREETING_CORE = new Set(["halo", "hallo", "hai", "hi", "hello", "p", "pagi", "siang", "sore", "malam", "assalamualaikum", "permisi", "selamat"]);
const ADDRESSING = new Set(["kak", "ka", "kakak", "min", "admin", "gan", "sis", "bro", "om", "bu", "pak", "mba", "mbak", "mas", "alaikum", "assalamu", "wr", "wb", "dong", "ya", "yaa", "nih"]);
const THANKS_CORE = new Set(["makasih", "terimakasih", "thanks", "thx", "tks", "trims", "thank"]);
const THANKS_FILLER = new Set(["ok", "oke", "siap", "sip", "ya", "yaa", "kak", "ka", "banyak", "sangat", "deh", "nih", "min", "admin", "udah", "sudah", "jelas", "paham", "ngerti", "you", "kk", "mantap"]);

const PAYMENT_PHRASES = ["rekening", "no rek", "norek", "nomor rek", "transfer kemana", "transfer ke mana", "bayar kemana", "bayar ke mana", "cara bayar", "cara pembayaran", "metode pembayaran", "pembayaran lewat apa", "bayar lewat apa", "bayar pakai apa", "bisa bayar pakai apa", "bisa bayar lewat apa", "ada qris", "bisa qris", "bisa transfer"];
const CATALOG_PHRASES = ["list produk", "daftar produk", "katalog", "menu", "produk apa", "jual apa", "ada apa aja", "ada apa saja", "ada produk apa", "pricelist", "price list", "daftar harga", "list harga", "lihat produk", "produknya apa"];
const ADDRESS_PHRASES = ["alamat", "lokasi", "dimana", "di mana", "maps", "toko dimana", "letak toko"];
const HOURS_PHRASES = ["jam buka", "buka jam", "jam operasional", "buka sampai", "tutup jam", "jam tutup", "jam berapa buka", "jam berapa tutup", "buka hari", "buka setiap hari", "hari libur"];
const PRODUCT_ASK_WORDS = new Set(["harga", "berapa", "stok", "stock", "ready", "tersedia", "kosong", "sisa", "ada"]);
const PRODUCT_NAME_NOISE = new Set(["dan", "untuk", "yang", "dengan", "motif", "warna", "ukuran"]);

/** Words of a product name that identify it (short filler words are not evidence). */
const nameTokens = (name) => words(name).filter((t) => (t.length >= 3 || /\d/.test(t)) && !PRODUCT_NAME_NOISE.has(t));

// Words that say what the customer wants to know, or are plain chat, and so never identify a product on their own.
const NOT_PRODUCT_WORDS = new Set([...PRODUCT_ASK_WORDS, "apa", "aja", "saja", "kak", "kakak", "min", "admin", "dong", "nih", "gak", "tidak", "ini", "itu", "yang", "untuk", "dan", "atau", "bisa", "mau", "minta", "lihat", "liat", "tanya", "info", "produk", "barang", "toko", "ukuran", "warna", "motif", "size", "dengan", "kalau", "kalo", "masih", "lagi", "sekarang", "hari"]);

/**
 * The products a message names. First by the whole name (every identifying word of the name appears; a typed word may be
 * the start of the name's word, 4 letters or more); when one name contains another ("Kemeja Batik" and "Kemeja Batik
 * Anak") the longest that fits wins. When no whole name fits, a single distinctive word ("sarung" for "Sarung Tenun")
 * points at the products that contain it.
 * @param {{ id: number, name: string }[]} products
 * @returns {{ id: number, name: string }[]} empty when nothing fits, one when it is clear, several when it is not
 */
export function matchProducts(text, products) {
  const said = words(text);
  const fits = (token) => said.some((w) => w === token || (w.length >= 4 && token.startsWith(w)));
  const named = products.map((p) => ({ product: p, tokens: nameTokens(p.name) })).filter((x) => x.tokens.length > 0);

  const whole = named.filter((x) => x.tokens.every(fits)).sort((a, b) => b.tokens.length - a.tokens.length);
  if (whole.length) {
    const best = whole[0];
    const covered = whole.every((x) => x.tokens.every((t) => best.tokens.includes(t)));
    return covered ? [best.product] : whole.map((x) => x.product);
  }

  const clues = said.filter((w) => w.length >= 4 && !NOT_PRODUCT_WORDS.has(w) && !/^\d+$/.test(w));
  if (!clues.length) return [];
  return named.filter((x) => clues.some((c) => x.tokens.some((t) => t === c || t.startsWith(c)))).map((x) => x.product);
}

/**
 * Which fast topic a message is, or null when it should go the normal way.
 * @param {string} text
 * @param {{ products?: { id: number, name: string }[], topics?: Record<string, boolean> }} [ctx]
 * @returns {{ topic: string, products?: object[], info?: "address"|"hours"|"both" }|null}
 */
export function detectTopic(text, { products = [], topics = DEFAULT_TOPICS } = {}) {
  const tokens = words(text);
  if (tokens.length === 0 || tokens.length > MAX_WORDS) return null;
  // orders, payments already made and order status belong to the order flow
  if (isBuyIntent(text) || claimsPayment(text) || isOrderStatusQuestion(text)) return null;

  const found = [];
  if (tokens.some((t) => GREETING_CORE.has(t)) && tokens.every((t) => GREETING_CORE.has(t) || ADDRESSING.has(t))) found.push({ topic: "greeting" });
  const thanksText = tokens.join(" ").replace(/terima kasih/g, "terimakasih").split(" ");
  if (hasWord(thanksText, THANKS_CORE) && thanksText.every((t) => THANKS_CORE.has(t) || THANKS_FILLER.has(t))) found.push({ topic: "thanks" });
  if (hasPhrase(text, PAYMENT_PHRASES)) found.push({ topic: "payment" });
  if (hasPhrase(text, CATALOG_PHRASES)) found.push({ topic: "catalog" });
  const wantsAddress = hasPhrase(text, ADDRESS_PHRASES);
  const wantsHours = hasPhrase(text, HOURS_PHRASES);
  if (wantsAddress || wantsHours) found.push({ topic: "info", info: wantsAddress && wantsHours ? "both" : wantsAddress ? "address" : "hours" });
  if (hasWord(tokens, PRODUCT_ASK_WORDS)) {
    const matched = matchProducts(text, products);
    if (matched.length >= 1 && matched.length <= MAX_CANDIDATES) found.push({ topic: "product", products: matched });
  }

  // one clear question only: a message that asks two different things is a conversation
  if (found.length !== 1) return null;
  return topics[found[0].topic] === false ? null : found[0];
}

// ---------------------------------------------------------------- wording
export const greetingText = ({ botName, shopName, greeting }) =>
  greeting?.trim() || `Halo kak, selamat datang di ${shopName || "toko kami"}${botName ? `, aku ${botName}` : ""}. Mau lihat produk, tanya pembayaran, atau ada yang lain?`;

export const thanksText = () => "Sama-sama kak. Kalau ada yang mau ditanyakan lagi, chat saja ya.";

/** @param {{ accounts: { bank: string, accountNumber: string, holder: string }[], qris: boolean }} p */
export function paymentText({ accounts, qris }) {
  const rows = accounts.map((a) => `- ${a.bank}: ${a.accountNumber} a.n. ${a.holder}`);
  if (qris) rows.push("- QRIS: kode QR dikirim otomatis setelah pesanan dibuat");
  return `Pembayaran bisa lewat:\n${rows.join("\n")}\n\nSetelah membayar, kirim foto bukti pembayarannya di sini ya kak.`;
}

export function catalogText({ products, total }) {
  const shown = products.slice(0, MAX_LISTED_PRODUCTS);
  const rows = shown.map((p, i) => `${i + 1}. ${p.name}: ${rupiah(p.price)}${p.stock <= 0 ? " (stok habis)" : ""}`);
  const more = total > shown.length ? `\n\nMasih ada ${total - shown.length} produk lain. Sebut nama produk yang kakak cari ya.` : "\n\nMau pesan yang mana kak?";
  return `Ini produk kami:\n${rows.join("\n")}${more}`;
}

export function productText({ product }) {
  const stock = product.stock <= 0 ? "stoknya sedang habis" : `stok tersedia ${product.stock}`;
  return `${product.name}: ${rupiah(product.price)}, ${stock}.${product.stock > 0 ? " Mau pesan kak? Sebut jumlahnya ya." : ""}`;
}

export function ambiguousText({ products }) {
  const rows = products.map((p) => `- ${p.name}: ${rupiah(p.price)}${p.stock <= 0 ? " (stok habis)" : ""}`);
  return `Maksud kakak yang mana?\n${rows.join("\n")}`;
}

/** @returns {string|null} null when the shop has not given what was asked (then the question is not a fast one) */
export function infoText({ kind, address, hours }) {
  const parts = [];
  if ((kind === "address" || kind === "both") && address) parts.push(`Alamat kami: ${address}`);
  if ((kind === "hours" || kind === "both") && hours) parts.push(`Jam buka: ${hours}`);
  // asked for both but only one is known: not fully answerable from data, so not a fast question
  if (parts.length < (kind === "both" ? 2 : 1)) return null;
  return parts.join("\n");
}
