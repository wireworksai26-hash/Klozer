// Wording for the chat screen that more than one component needs. Every function takes `t` so it follows the dashboard language.

/** Why the conversation went to the team, in words (mirrors backend/src/services/handoff/handoffPolicy.js). */
export function handoffReasonText(t, reason) {
  if (!reason) return t("Dialihkan ke tim");
  if (reason.startsWith("keyword:")) return t("Kata kunci \"{word}\" terdeteksi", { word: reason.slice(8) });
  if (reason.startsWith("ai:")) return t("AI meminta bantuan tim: {reason}", { reason: reason.slice(3) });
  const known = {
    customer_request: t("Pelanggan meminta berbicara dengan manusia"),
    guardrail: t("Pesan perlu ditangani manusia"),
    ai_unsure: t("AI tidak yakin dan meneruskan ke tim"),
    ai_unavailable: t("AI sedang tidak tersedia"),
    payment_proof: t("Bukti pembayaran perlu dicek"),
    cs_replied: t("CS membalas langsung"),
    manual: t("Diambil alih manual"),
    commerce_shipping: t("Pesanan masuk, ongkir perlu dihitung tim"),
    commerce_payment: t("Pesanan masuk, cara bayar perlu dibantu tim"),
    commerce_problem: t("Pesanan di chat perlu dibantu tim"),
  };
  return known[reason] ?? t("Dialihkan ke tim");
}

/** What an AI agent did besides answering, as a short phrase. */
export function toolLabel(t, name) {
  const known = {
    check_stock: t("cek stok"),
    lookup_order: t("cek pesanan"),
    create_task: t("buat tugas"),
    handoff_to_human: t("oper ke tim"),
    consult_agent: t("tanya agen lain"),
    transfer_to_agent: t("pindah agen"),
  };
  return known[name] ?? name;
}

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export const clock = (iso, locale = "id-ID") => (iso ? new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "");

/** `meta_json` of a message: the database may hand it over as text or already parsed. */
export function parseMeta(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
