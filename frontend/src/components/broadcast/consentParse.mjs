// Reading a list of phone numbers out of pasted text or a spreadsheet, in the browser. Pure functions, no DOM.

export const MAX_PHONES = 5000;

const digitsOf = (value) => String(value ?? "").replace(/\D/g, "");

/** A cell that reads like a phone number: digits with optional +, spaces, dashes or brackets, 9 to 15 digits. */
export function looksLikePhone(value) {
  const text = String(value ?? "").trim();
  if (!/^\+?[\d\s().-]+$/.test(text)) return false;
  const n = digitsOf(text).length;
  return n >= 9 && n <= 15;
}

/** Split pasted text or CSV into rows of cells (comma, semicolon or tab separated; one row per line). */
export function textToRows(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((cells) => cells.some(Boolean));
}

/**
 * Pick the column that holds the phone numbers (the one with the most numbers in it) and read it.
 * A first row that is not a number is taken as the header and not counted as ignored.
 * @param {unknown[][]} rows
 * @returns {{ phones: string[], duplicates: number, ignored: number, tooMany: boolean }}
 */
export function extractPhones(rows) {
  const width = rows.reduce((max, r) => Math.max(max, r.length), 0);
  let best = 0;
  let bestCount = -1;
  for (let c = 0; c < width; c++) {
    const count = rows.reduce((n, r) => n + (looksLikePhone(r[c]) ? 1 : 0), 0);
    if (count > bestCount) (best = c), (bestCount = count);
  }
  const seen = new Set();
  const phones = [];
  let duplicates = 0;
  let ignored = 0;
  rows.forEach((row, index) => {
    const cell = String(row[best] ?? "").trim();
    if (!cell) return;
    if (!looksLikePhone(cell)) {
      if (index > 0) ignored++;
      return;
    }
    const key = digitsOf(cell).replace(/^0/, "62").replace(/^8/, "628");
    if (seen.has(key)) {
      duplicates++;
      return;
    }
    seen.add(key);
    phones.push(cell);
  });
  return { phones, duplicates, ignored, tooMany: phones.length > MAX_PHONES };
}
