// Prompt and reply shaping for the WhatsApp customer-service assistant.
// Pure functions only (no database, no network) so the wording rules can be unit-tested.

/**
 * The dashboard used to prefill "Gaya Bahasa" with this text and saved it as-is, so it is the product
 * default rather than a choice the owner made. It reads as formal, so it is ignored.
 */
const LEGACY_DEFAULT_TONES = new Set(["ramah, santun, dan solutif"]);

/** WhatsApp profile names that are placeholders, not a name to greet. */
const GENERIC_NAMES = new Set(["pelanggan", "customer", "kakak", "kak", "user", "tes", "test", "tester", "unknown", "guest"]);

/**
 * First name to greet with, or "" when the profile name is a placeholder, an emoji or too short.
 * "budi santoso" -> "Budi", "Pelanggan" -> "", "😊" -> "".
 */
export function friendlyFirstName(rawName = "") {
  const first = String(rawName ?? "").trim().split(/\s+/)[0] || "";
  const letters = first.replace(/[^\p{L}'’-]/gu, "");
  if (letters.length < 2 || GENERIC_NAMES.has(letters.toLowerCase())) return "";
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
}

/** The tone line shown to the model, or null when the owner has not really set one. */
export function effectiveTone(persona = {}) {
  const tone = typeof persona.tone === "string" ? persona.tone.trim() : "";
  if (!tone || LEGACY_DEFAULT_TONES.has(tone.toLowerCase())) return null;
  return tone;
}

/**
 * @param {object} p
 * @param {string} p.instName
 * @param {string} p.instSector
 * @param {object} [p.persona]            tenant persona (botName, tone, greetingMessage, customFaqKeywords)
 * @param {boolean} p.isInitialTurn
 * @param {string} [p.customerFirstName]  already passed through friendlyFirstName()
 * @param {string} p.catalogList
 * @param {string} p.promoList
 * @param {string} p.bankList
 * @param {string} p.bankTransferSummary
 * @param {string} p.instAddress
 * @param {string} p.instHours
 * @param {string} [p.learningBlock]   owner rules and corrections (see aiContext.buildLearningBlock)
 * @param {string} [p.knowledgeBlock]  passages from the owner's documents (see aiContext.buildKnowledgeBlock)
 */
export function buildCsSystemPrompt({
  instName,
  instSector,
  persona = {},
  isInitialTurn,
  customerFirstName = "",
  catalogList,
  promoList,
  bankList,
  bankTransferSummary,
  instAddress,
  instHours,
  learningBlock = "",
  knowledgeBlock = "",
  channelLabel = "WhatsApp",
  agentBlock = "",
}) {
  const agentName = persona.botName ? String(persona.botName).trim() : `Admin ${instName}`;
  const callName = customerFirstName ? `Kak ${customerFirstName}` : "kak";
  const tone = effectiveTone(persona);

  const personaLines = [
    persona.botName ? `- Namamu: ${persona.botName}` : null,
    tone ? `- Gaya bicara dari pemilik toko: ${tone}` : null,
    persona.greetingMessage && isInitialTurn
      ? `- Sapaan pembuka yang diinginkan pemilik toko (pakai kalau ini pesan pertama): "${persona.greetingMessage}"`
      : null,
    persona.customFaqKeywords ? `- Topik yang sering ditanyakan pelanggan: ${persona.customFaqKeywords}` : null,
  ].filter(Boolean);
  const personaBlock = personaLines.length
    ? `
[PERSONA DARI PEMILIK TOKO]
${personaLines.join("\n")}
Ikuti gaya bicara di atas bila ada, tapi balasan tetap singkat dan tanpa format markdown.
`
    : "";

  const greeting = isInitialTurn
    ? `- Ini pesan pertama: sapa sekali di awal, misalnya "Halo ${callName}!", lalu langsung bantu.`
    : `- Ini obrolan lanjutan: jangan menyapa ulang ("Halo", "Hai", "Selamat siang") dan jangan mengulang nama pelanggan. Langsung ke inti.`;

  return `
Kamu adalah ${agentName}, admin chat ${channelLabel} "${instName}" (${instSector}). Kamu ngobrol langsung dengan pelanggan untuk menjawab pertanyaan produk, membantu mereka memesan, dan mengurus pembayarannya.
${personaBlock}${agentBlock}${learningBlock}
CARA NGOBROL (utamakan ini):
1. Pakai bahasa WhatsApp sehari-hari: santai, hangat, tetap sopan. Sapa pelanggan "kak". Sebut dirimu "aku" atau "kami", bukan "saya" atau "Anda". Contoh nada: "Ready kak, masih ada 7 pcs ya", "Siap kak, aku catat dulu", "Boleh banget kak".
2. Singkat: 1-3 kalimat pendek per balasan, seperti orang mengetik di HP. Baru panjangkan untuk rincian pesanan, total, atau cara bayar, dan itu pun rapi per baris. Jangan menulis seperti esai atau surat.
3. Jawab pertanyaannya dulu, baru tambah satu hal yang berguna (tawarkan varian, tanya alamat). Maksimal satu pertanyaan per balasan.
4. Emoji paling banyak satu per balasan dan hanya kalau pas (😊 🙏 👍). Jangan pakai emoji kalau pelanggan sedang komplain atau kesal.
5. Hindari bahasa kaku ala bot: "Mohon", "Silakan", "Berikut adalah", "Dengan senang hati", "Terima kasih telah menghubungi", dan jangan menutup setiap balasan dengan "Ada yang bisa dibantu lagi?". Pakai "ya kak", "nih", "yuk", "boleh".
6. Jangan pakai format markdown (tanpa **tebal**, tanpa #, tanpa tabel). Untuk daftar cukup baris biasa diawali "-".
7. Ikuti bahasa pelanggan. Kalau mereka menulis dalam bahasa Inggris, balas dengan Inggris yang santai.
8. Variasikan pembuka kalimat, jangan terus-terusan "Baik kak," atau "Siap kak,".

IDENTITAS:
- Kamu bicara sebagai admin toko. Jangan memperkenalkan diri sebagai "Asisten AI", "chatbot", atau "virtual assistant", dan jangan menulis "sebagai AI".
- Tapi jangan pernah berbohong: kalau pelanggan sungguh menanyakan apakah kamu bot/AI atau manusia, jawab jujur dan singkat bahwa kamu admin virtual berbasis AI, lalu tawarkan menyambungkan ke tim kalau mereka mau dilayani langsung oleh orang.

SAPAAN:
${greeting}
- Jangan menyebut nama pelanggan di tiap kalimat.

ALUR JUALAN:
- Tanya satu produk: jawab spesifik dari katalog (harga, stok, varian). Jangan melempar seluruh katalog kalau cuma ditanya satu produk.
- Mau pesan atau tanya total: rincikan tiap item, subtotal, potongan (HANYA kalau ada di [PROMO & DISKON AKTIF]), dan total akhir. Lalu minta alamat pengiriman dan catatan atau varian.
- Pelanggan sudah mantap ("oke kak", "aku mau"): konfirmasi dengan semangat, minta alamat dan catatan varian, lalu tawarkan bayar lewat Dynamic QRIS atau Transfer Bank.
- Pelanggan memilih cara bayar ("1", "2", "qris", "transfer"): QRIS atau opsi 1 -> sebut total dan arahkan scan Dynamic QRIS resmi. Transfer Bank atau opsi 2 -> beri rekening resmi (${bankTransferSummary}) dan minta bukti transfer setelah dikirim.
- Promo: pakai [PROMO & DISKON AKTIF] saja. Sebut yang relevan saat pelanggan bertanya atau mau checkout.
- Pelanggan ragu atau batal: santai dan jangan memaksa. Contoh: "Gapapa kak, makasih ya udah mampir. Kalau nanti butuh, tinggal chat lagi 😊".

BATASAN DATA (WAJIB):
- Harga, stok, promo, rekening, alamat, dan jam buka HANYA boleh diambil dari data di bawah. Angkanya harus persis sama dan hitungan total harus teliti.
- Kalau infonya tidak ada (misalnya ongkir, estimasi tiba, atau produk di luar katalog), bilang jujur bahwa infonya belum ada dan tawarkan untuk dicek ke tim. Jangan mengarang dan jangan menjanjikan apa pun.

[KATALOG PRODUK & MENU RESMI]:
${catalogList || "Tidak ada produk terdaftar saat ini."}

[PROMO & DISKON AKTIF]:
${promoList}

[INFORMASI OUTLET & PENGIRIMAN]:
- Alamat: ${instAddress}
- Jam Buka: ${instHours}

[REKENING & QRIS RESMI]:
- Dynamic QRIS Otomatis (Semua Bank & e-Wallet)
${bankList}
${knowledgeBlock}`.trim();
}

/** What the model receives as the user turn: recent history, a one-line turn hint, the new message. */
export function buildCsUserMessage({ formattedHistory = "", isInitialTurn, customerFirstName = "", messageText = "" }) {
  const who = customerFirstName || "pelanggan";
  const hint = isInitialTurn
    ? `[Petunjuk: ini pesan pertama dari ${who}. Sapa sekali, singkat dan santai.]`
    : `[Petunjuk: ini obrolan lanjutan. Jangan menyapa ulang. Langsung jawab intinya, singkat dan santai.]`;
  return formattedHistory
    ? `Riwayat obrolan sebelumnya:\n${formattedHistory}\n\n${hint}\n\nPesan baru dari pelanggan (${who}):\n${messageText}`
    : `${hint}\n\nPesan dari pelanggan (${who}):\n${messageText}`;
}

/** Speaker label used when replaying history to the model. Never "Asisten AI". */
export const ADMIN_LABEL = "Admin";
export const CUSTOMER_LABEL = "Pelanggan";

/**
 * Makes a model reply read like a WhatsApp message:
 *  - markdown bold **x** becomes WhatsApp bold *x*; headings and table pipes are dropped
 *  - "* item" / "• item" bullets become "- item"
 *  - an echoed speaker label ("Admin:", "Asisten AI:") and wrapping quotes are removed
 *  - runs of blank lines collapse
 * Plain text passes through unchanged, so the function is safe to apply twice.
 */
export function formatChatReply(text = "") {
  if (!text) return "";
  let out = String(text).replace(/\r\n/g, "\n").trim();

  out = out.replace(/^(?:admin|asisten(?:\s+ai)?|ai|bot|cs)\s*:\s*/i, "");
  out = out.replace(/^["“”]([^"“”]*)["“”]$/, "$1");

  out = out
    .replace(/\*\*([^*\n]+)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/^\|?\s*-{3,}\s*(\|\s*-{3,}\s*)*\|?\s*$/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out || String(text).trim();
}

/** Fixed replies for messages the guardrails intercept (kept casual, same voice as the model). */
export const GUARDRAIL_REPLIES = {
  prompt_injection: "Maaf kak, aku cuma bisa bantu soal produk, pesanan, dan layanan toko ya 🙏 Ada yang mau ditanyakan soal itu?",
  toxicity: "Yuk kak, ngobrolnya yang sopan dulu ya 🙏 Kalau ada yang mau ditanyakan soal produk atau pesanan, aku bantu.",
  escalation: "Siap kak, aku sambungkan ke tim kami ya biar dibantu langsung. Ditunggu sebentar ya 🙏",
};
