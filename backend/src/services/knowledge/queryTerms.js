/**
 * Turns a customer's message into search terms for MySQL FULLTEXT (natural-language mode).
 * Pure function, shared by the knowledge base and the correction examples.
 */

// Words that carry no topic in Indonesian chat; leaving them in makes every message "match" every passage.
const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "ini", "itu", "ada", "apa", "apakah", "saya", "aku", "kak", "kakak", "gan", "min",
  "bisa", "boleh", "mau", "ingin", "tidak", "nggak", "ngga", "gak", "enggak", "tak", "ya", "yaa", "dong", "nih", "sih", "aja", "saja", "atau", "juga",
  "sudah", "udah", "belum", "akan", "bagaimana", "gimana", "berapa", "kapan", "dimana", "mana", "pada", "adalah", "karena", "kalau", "kalo", "jika",
  "sama", "lagi", "banget", "sekali", "yg", "dg", "dgn", "utk", "tp", "tapi", "terus", "lalu", "nya", "pak", "bu", "halo", "hai", "hallo", "pagi", "siang",
  "sore", "malam", "makasih", "terima", "kasih", "tolong", "mohon", "silakan", "the", "and", "for", "you", "are", "can", "how", "what",
]);

export const MIN_TERM_LENGTH = 3;
export const MAX_TERMS = 12;

/** @returns {string[]} lower-cased, de-duplicated search words in the order they were written */
export function extractQueryTerms(text = "", { max = MAX_TERMS } = {}) {
  const words = String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const seen = new Set();
  const terms = [];
  for (const word of words) {
    if (word.length < MIN_TERM_LENGTH || STOPWORDS.has(word) || /^\d+$/.test(word) || seen.has(word)) continue;
    seen.add(word);
    terms.push(word);
    if (terms.length >= max) break;
  }
  return terms;
}

/** The string handed to MATCH ... AGAINST, or "" when the message has nothing searchable. */
export function toFulltextQuery(text, options) {
  return extractQueryTerms(text, options).join(" ");
}
