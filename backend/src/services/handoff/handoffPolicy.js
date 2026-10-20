/**
 * Rules for passing a conversation from the AI to a person. Pure functions: no database, no network.
 */

/** Phrases that mean a person should take over (complaints, money problems, legal threats, "let me talk to a human"). */
export const DEFAULT_HANDOFF_KEYWORDS = Object.freeze([
  "komplain",
  "complain",
  "refund",
  "pengembalian dana",
  "uang kembali",
  "penipuan",
  "ditipu",
  "tipu",
  "scam",
  "lapor polisi",
  "somasi",
  "pengacara",
  "salah kirim",
  "barang rusak",
  "belum sampai",
  "tidak sesuai pesanan",
  "kecewa",
  "bicara dengan manusia",
  "bicara dengan orang",
  "bicara dengan admin",
  "hubungi manusia",
  "minta cs",
  "mau cs",
  "customer service asli",
]);

/** Lower-case, letters and digits only, single spaces: "Saya KECEWA!!" -> "saya kecewa". */
export function normalizeForMatch(text = "") {
  return (String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join(" ");
}

/**
 * The first keyword found in the message as a whole word or phrase, or null.
 * Matching on whole words keeps "tipu" from firing on "tipuan" and "scam" on "scammer"-free text.
 */
export function detectHandoff(text, keywords = DEFAULT_HANDOFF_KEYWORDS) {
  const haystack = ` ${normalizeForMatch(text)} `;
  if (haystack.trim() === "") return null;
  for (const keyword of keywords) {
    const needle = normalizeForMatch(keyword);
    if (needle && haystack.includes(` ${needle} `)) return keyword;
  }
  return null;
}

/** Readable reasons for the timeline note shown to staff. */
const REASON_LABELS = {
  customer_request: "Pelanggan meminta berbicara dengan manusia",
  guardrail: "Pesan perlu ditangani manusia",
  ai_unsure: "AI tidak yakin dan meneruskan ke tim",
  ai_unavailable: "AI sedang tidak tersedia",
  payment_proof: "Bukti pembayaran perlu dicek",
  cs_replied: "CS membalas langsung",
  manual: "Diambil alih manual",
  commerce_shipping: "Pesanan masuk, ongkir perlu dihitung tim",
  commerce_payment: "Pesanan masuk, cara bayar perlu dibantu tim",
  commerce_problem: "Pesanan di chat perlu dibantu tim",
};

export function reasonLabel(reason = "") {
  if (reason.startsWith("keyword:")) return `Kata kunci "${reason.slice(8)}" terdeteksi`;
  if (reason.startsWith("ai:")) return `AI meminta bantuan tim: ${reason.slice(3)}`;
  return REASON_LABELS[reason] || "Dialihkan ke tim";
}

/** Fixed text sent to the customer when the hand-off starts. Never produced by the model. */
export function handoffReply({ agentAvailable }) {
  const base = "Siap kak, aku sambungkan ke tim kami ya biar dibantu langsung.";
  return agentAvailable ? `${base} Ditunggu sebentar ya 🙏` : `${base} Saat ini tim sedang tidak online, jadi pesan kakak aku catat dan dibalas begitu ada yang online 🙏`;
}

/**
 * Is a person currently in charge of this conversation? True from the moment of hand-off (or the CS's last message,
 * which renews it) until `holdMinutes` pass without human activity.
 */
export function isHumanHolding(lead, holdMinutes, now = new Date()) {
  if (lead.handled_by !== "human" || !lead.handoff_at) return false;
  return now - new Date(lead.handoff_at) < holdMinutes * 60_000;
}
