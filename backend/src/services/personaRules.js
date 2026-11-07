import { normalizeForMatch } from "./handoff/handoffPolicy.js";

/**
 * The persona a shop owner tunes, turned into rules. It follows the client intake form: the assistant's goal, tone of
 * voice, the brand's key values, words to prefer and words never to use, topics it must not discuss, and when a big
 * order goes to a person. Pure functions (no database, no network).
 *
 * Some of this is guidance the model is asked to follow (goal, tone, values, preferred words). Some is checked in code,
 * so it holds even when the model does not behave: topics the customer raises (before the model is called), words in the
 * model's reply, and the size of an order.
 */

export const GOALS = Object.freeze({
  support: "Customer support: bantu pelanggan menyelesaikan pertanyaan dan masalahnya dengan tuntas. Jangan menjual dengan agresif.",
  sales: "Penjualan: pahami kebutuhan pelanggan, rekomendasikan produk yang tepat, dan arahkan dengan halus sampai pesanan.",
  both: "Melayani sekaligus menjual: selesaikan pertanyaan pelanggan dulu, lalu tawarkan produk yang relevan kalau memang pas.",
});

export const TONE_STYLES = Object.freeze({
  formal: "Formal dan profesional: kalimat utuh, sopan, rapi, tanpa kata gaul.",
  ramah: "Ramah dan kasual: hangat, akrab, bahasa chat sehari-hari yang sopan.",
  empatis: "Empatis dan edukatif: dengarkan dan akui perasaan pelanggan dulu, lalu jelaskan dengan sabar dan jelas.",
});

const MAX_ITEMS = 30;
const MAX_ITEM_LENGTH = 60;

/** "politik, SARA; isu hukum" -> ["politik", "SARA", "isu hukum"] (a comma, semicolon or new line separates). */
export function splitList(text) {
  if (Array.isArray(text)) text = text.join(",");
  const seen = new Set();
  const out = [];
  for (const part of String(text ?? "").split(/[,;\n]+/)) {
    const item = part.replace(/\s+/g, " ").trim().slice(0, MAX_ITEM_LENGTH);
    const key = normalizeForMatch(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

/** The first of `terms` that appears in `text` as a whole word or phrase, or null. "tipu" does not match "tipuan". */
export function findTerm(text, terms) {
  const haystack = ` ${normalizeForMatch(text)} `;
  if (haystack.trim() === "") return null;
  for (const term of terms) {
    const needle = normalizeForMatch(term);
    if (needle && haystack.includes(` ${needle} `)) return term;
  }
  return null;
}

/** What the code enforces, read from the saved persona. */
export function personaRules(persona = {}) {
  const amount = Number(persona?.bigOrderAmount);
  return {
    offLimitTopics: splitList(persona?.offLimitTopics),
    forbiddenWords: splitList(persona?.forbiddenWords),
    bigOrderAmount: Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0,
  };
}

/** A big order goes to a person. Off when no amount is set. */
export const isBigOrder = (total, persona) => {
  const { bigOrderAmount } = personaRules(persona);
  return bigOrderAmount > 0 && Number(total) >= bigOrderAmount;
};

/** The fixed answer when a customer raises a topic the owner put off limits. Never produced by the model. */
export const OFF_LIMIT_REPLY = "Maaf kak, untuk hal itu aku belum bisa bantu ya 🙏 Kalau ada pertanyaan soal produk atau pesanan, aku bantu dengan senang hati.";

/**
 * The persona lines for the system prompt, beyond bot name, free-text tone, greeting and topics (aiPrompt adds those).
 * @returns {string[]}
 */
export function personaPromptLines(persona = {}) {
  const lines = [];
  if (GOALS[persona.goal]) lines.push(`- Tujuan utamamu: ${GOALS[persona.goal]}`);

  const styles = (Array.isArray(persona.toneStyles) ? persona.toneStyles : []).filter((s) => TONE_STYLES[s]);
  if (styles.length) lines.push(`- Gaya bicara yang dipilih pemilik toko: ${styles.map((s) => TONE_STYLES[s]).join(" Sekaligus ")}`);

  const values = splitList(persona.brandValues);
  if (values.length) lines.push(`- Karakter dan nilai brand (tercermin dalam caramu menjawab): ${values.join(", ")}`);

  const preferred = splitList(persona.preferredWords);
  if (preferred.length) lines.push(`- Kata atau istilah yang dianjurkan, pakai bila pas: ${preferred.join(", ")}`);

  const { forbiddenWords, offLimitTopics } = personaRules(persona);
  if (forbiddenWords.length) lines.push(`- Kata atau istilah yang DILARANG, jangan pernah dipakai dalam balasan: ${forbiddenWords.join(", ")}`);
  if (offLimitTopics.length) lines.push(`- Topik terlarang, tolak dengan sopan dan arahkan kembali ke produk atau pesanan: ${offLimitTopics.join(", ")}`);
  return lines;
}
