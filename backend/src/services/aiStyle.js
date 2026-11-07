// Reads how one customer writes, so the assistant can answer in the same register: serious with a serious customer,
// relaxed with a relaxed one, short with someone who writes short. Pure functions (no database, no network).
//
// This is not training of a model. It is a reading of the customer's own recent messages, redone on every turn, so it is
// per customer (each number has its own history) and needs no stored state.

const ONE = (list) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${list.join("|")})(?![\\p{L}\\p{N}])`, "iu");

// Phrases people use when they write carefully, or to someone they do not know.
const FORMAL = [
  "selamat (?:pagi|siang|sore|malam)", "mohon", "permisi", "izin (?:bertanya|tanya|menanyakan)", "dengan hormat", "berkenan",
  "bapak", "ibu", "bpk", "kami (?:ingin|membutuhkan|bermaksud|berminat)", "saya (?:ingin|bermaksud|membutuhkan|berminat|mohon|hendak)",
  "apakah", "terima ?kasih", "menanyakan", "mengenai", "sehubungan", "informasi",
].map((p) => ONE([p]));

// Slang, chat spellings and laughter.
const CASUAL = [
  "wk(?:wk)+", "ha(?:ha)+", "he(?:he)+", "gk", "ga", "gak", "nggak", "ngga", "yg", "udh", "udah", "dong", "deh", "nih", "sih", "banget", "bgt",
  "bro", "gan", "cuy", "sis", "sob", "plis", "pls", "thx", "makasih", "mksh", "tq", "kok", "lho", "loh", "dgn", "utk", "krn", "aja", "yaudah", "oke ?deh",
].map((p) => ONE([p]));

const SERIOUS = ONE([
  "komplain", "complain", "kecewa", "marah", "kesal", "kesel", "lapor", "penipuan", "tipu", "refund", "rusak", "salah kirim", "belum sampai",
  "lama banget", "urgent", "segera", "darurat", "mendesak", "penting", "tidak sesuai", "mengecewakan",
]);

const GREETING_ONLY = /^(?:p|halo|hai|hi|hello|hey|assalamu'?alaikum|assalamualaikum|permisi|selamat (?:pagi|siang|sore|malam))\b[\s!.,]*(?:kak|min|admin|gan|sis|bro|pak|bu)?[\s!.,]*$/iu;
const EMOJI = /\p{Extended_Pictographic}/u;

const median = (nums) => {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * @param {string[]} messages what the customer wrote, oldest first, the newest last (at most the last 8 are read)
 * @returns {{ samples: number, formality: "formal"|"casual"|"neutral", brevity: "terse"|"normal"|"chatty", usesEmoji: boolean, serious: boolean }}
 */
export function detectCustomerStyle(messages) {
  const texts = (Array.isArray(messages) ? messages : [])
    .map((m) => String(m ?? "").trim())
    .filter(Boolean)
    .slice(-8);

  let formal = 0;
  let proper = 0;
  let casual = 0;
  let emojiMessages = 0;
  let serious = false;
  for (const text of texts) {
    formal += FORMAL.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
    // a message that starts with a capital, is a full sentence and ends with a full stop reads as carefully written
    if (text.length > 30 && /^\p{Lu}/u.test(text) && /[.?!]$/.test(text)) proper += 1;
    casual += CASUAL.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
    if (EMOJI.test(text)) {
      casual += 1;
      emojiMessages++;
    }
    if (SERIOUS.test(text)) serious = true;
  }

  if (formal >= 1) formal += proper; // careful writing only backs up a formal word; capitals alone prove nothing

  let formality = "neutral";
  if (formal >= 1 && casual === 0 && (texts.length === 1 || formal >= 2)) formality = "formal";
  else if (formal >= 2 && formal >= casual * 1.5) formality = "formal";
  else if (casual >= 1 && casual > formal) formality = "casual";

  const real = texts.filter((t) => !GREETING_ONLY.test(t));
  const typical = median(real.map((t) => t.length));
  const words = real.length ? real[real.length - 1].split(/\s+/).length : 0;
  let brevity = "normal";
  if (real.length >= 2 && typical <= 22) brevity = "terse";
  else if (real.length === 1 && words >= 2 && real[0].length <= 24 && formality !== "formal") brevity = "terse";
  else if (typical >= 110) brevity = "chatty";

  return { samples: texts.length, formality, brevity, usesEmoji: emojiMessages > 0, serious };
}

/**
 * The block added to the system prompt, or "" when the customer shows nothing to follow (the shop's own persona then
 * decides). It states that it overrides the default voice, so a formal customer is not answered in slang.
 */
export function styleBlock(style) {
  if (!style || style.samples === 0) return "";
  const lines = [];

  if (style.serious) {
    lines.push("- Pelanggan ini sedang serius atau kesal. Tanpa emoji, tanpa candaan. Akui dulu masalahnya dengan kata-katanya sendiri dalam satu kalimat, baru tawarkan SATU langkah yang jelas.");
  }
  if (style.formality === "formal") {
    lines.push("- Pelanggan ini menulis formal. Balas dengan kalimat utuh yang sopan. Sebut dirimu \"saya\" (atau \"kami\" mewakili toko), tanpa kata gaul, tanpa singkatan. Panggil \"Kak\" kecuali dia memakai \"Pak\" atau \"Bu\": ikuti panggilannya.");
  } else if (style.formality === "casual") {
    lines.push("- Pelanggan ini santai. Boleh pakai \"aku\" dan bahasa chat sehari-hari, hangat dan akrab, tapi tetap sopan.");
  }
  if (style.brevity === "terse") {
    lines.push("- Pelanggan ini ringkas dan langsung. Jawab to the point: satu atau dua kalimat, langsung ke jawaban atau angkanya, tanpa basa-basi dan tanpa pembukaan panjang. Jangan menawarkan hal lain kecuali sangat perlu.");
  } else if (style.brevity === "chatty") {
    lines.push("- Pelanggan ini suka bercerita dan menulis panjang. Tanggapi hal spesifik yang dia ceritakan, boleh sedikit lebih lengkap dan hangat, seperti ngobrol dengan orang yang sungguh memperhatikan.");
  }
  if (!style.serious) {
    lines.push(style.usesEmoji ? "- Dia memakai emoji, jadi satu emoji yang pas boleh." : style.formality === "formal" || style.brevity === "terse" ? "- Jangan pakai emoji." : "");
  }

  const body = lines.filter(Boolean);
  if (!body.length) return "";
  return `\n[GAYA PELANGGAN INI]\nDibaca dari cara dia menulis. Untuk nada, sapaan, dan panjang jawaban, bagian ini MENANG atas gaya bawaan dan gaya dari pemilik toko di atas. Ikuti cara dia, jangan sebaliknya.\n${body.join("\n")}\n`;
}
