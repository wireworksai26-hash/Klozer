/**
 * Text shaping for outgoing messages. Pure functions: every platform has its own limits and its own idea of
 * formatting, and the AI writes WhatsApp-style text.
 */

/**
 * Remove WhatsApp bold markers for platforms that show them literally: "*Ready* kak" -> "Ready kak".
 * Only a pair of asterisks around a word or phrase counts, so a lone * (or a price like 2*3) is left alone.
 */
export function stripChatMarkup(text = "") {
  return String(text).replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:;])/g, "$1$2");
}

const BREAKS = ["\n\n", "\n", ". ", "! ", "? ", ", ", " "];

/**
 * Split a long message into parts of at most `max` characters, cutting at a paragraph, line, sentence or word
 * boundary where one exists in the second half of the part, and hard at `max` otherwise.
 * @returns {string[]} never empty strings; a short text comes back as a single part
 */
export function splitText(text, max) {
  const source = String(text ?? "").trim();
  if (!source) return [];
  if (!Number.isInteger(max) || max < 10 || source.length <= max) return [source];

  const parts = [];
  let rest = source;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    let cut = -1;
    for (const separator of BREAKS) {
      const at = window.lastIndexOf(separator);
      if (at >= max / 2) {
        cut = at + (separator.trim() === "" ? 0 : separator.length - 1); // keep the punctuation, drop the space
        break;
      }
    }
    if (cut < 0) cut = max;
    const part = rest.slice(0, cut).trim();
    if (part) parts.push(part);
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
