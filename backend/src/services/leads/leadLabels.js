/**
 * The words people write in a "label" column (Lead, Closing, VIP, Repeat...) turned into what Klozer stores: a lead
 * status plus a manual VIP mark. Pure, so the same rule serves the import and the tests.
 */

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * @param {unknown} text a cell such as "Pelanggan VIP", "closing", "Belum beli" or "lead baru"
 * @returns {{ status: "new"|"in_progress"|"closing"|"repeat"|"closed_lost", isVip: boolean, known: boolean }}
 *   `known` is false when nothing in the text was recognised (the caller may keep the text as a note)
 */
export function parseLabel(text) {
  const t = stripAccents(String(text ?? "").toLowerCase()).replace(/\s+/g, " ").trim();
  if (!t || t === "-") return { status: "new", isVip: false, known: true };

  const isVip = /\bvip\b/.test(t);
  let status = null;

  if (/\b(belum|tidak|bukan)\s+(beli|closing|deal|order)/.test(t)) status = "new";
  else if (/\b(lost|hilang|batal|gagal|tidak jadi)\b/.test(t)) status = "closed_lost";
  else if (/\b(repeat|langganan|loyal|reorder|re-order)\b/.test(t)) status = "repeat";
  else if (/\b(closing|closed|deal|pembeli|sudah beli|customer)\b/.test(t)) status = "closing";
  else if (/\b(follow ?up|negosiasi|proses|in progress|tanya)\b/.test(t)) status = "in_progress";
  else if (/\b(lead|prospek|prospect|calon|baru|new)\b/.test(t)) status = "new";

  if (status === null && !isVip) return { status: "new", isVip: false, known: false };
  return { status: status ?? "new", isVip, known: true };
}
