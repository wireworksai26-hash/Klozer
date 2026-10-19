/**
 * Splits a document into passages small enough to hand to the AI one by one.
 * Pure functions (no database, no network) so the rules can be unit-tested.
 */

export const CHUNK_TARGET_CHARS = 900;
export const CHUNK_OVERLAP_CHARS = 120;
export const MAX_CHUNKS_PER_DOCUMENT = 600;

/** A short line that does not end like a sentence is treated as a heading and kept with the paragraph below it. */
const HEADING_MAX_CHARS = 80;
const looksLikeHeading = (line) => line.length > 0 && line.length <= HEADING_MAX_CHARS && !/[.!?:;,]$/.test(line) && !line.includes("\n");

const BYTE_ORDER_MARK = 0xfeff;
const NO_BREAK_SPACE = 0xa0;

/** Drops control characters (keeps line feeds); tabs and no-break spaces become plain spaces. */
function cleanCharacters(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === 10) out += ch;
    else if (code === 9 || code === NO_BREAK_SPACE) out += " ";
    else if (code >= 32 && code !== 127) out += ch;
  }
  return out;
}

/** Line endings, control characters and runs of whitespace, without touching paragraph breaks. */
export function normalizeText(text = "") {
  let value = String(text);
  if (value.charCodeAt(0) === BYTE_ORDER_MARK) value = value.slice(1);
  return cleanCharacters(value.replace(/\r\n?/g, "\n"))
    .replace(/ +/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Break one over-long block at sentence ends, then at spaces, so no piece exceeds `max`. */
function splitLongBlock(block, max) {
  const sentences = block.split(/(?<=[.!?])\s+/);
  const pieces = [];
  let current = "";
  const flush = () => {
    if (current) pieces.push(current);
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > max) {
      flush();
      let rest = sentence;
      while (rest.length > max) {
        let cut = rest.lastIndexOf(" ", max);
        if (cut < max * 0.5) cut = max; // no usable space: cut hard rather than loop
        pieces.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      current = rest;
      continue;
    }
    if (current && current.length + 1 + sentence.length > max) flush();
    current = current ? `${current} ${sentence}` : sentence;
  }
  flush();
  return pieces;
}

/** The last ~`overlap` characters of a chunk, cut at a word boundary, to carry context into the next chunk. */
function tail(chunk, overlap) {
  if (overlap <= 0 || chunk.length <= overlap) return "";
  const slice = chunk.slice(-overlap);
  const space = slice.indexOf(" ");
  return space > 0 ? slice.slice(space + 1) : slice;
}

/**
 * @param {string} text raw document text
 * @param {{ target?: number, overlap?: number }} [options]
 * @returns {string[]} chunks in reading order (never empty strings)
 */
export function splitIntoChunks(text, { target = CHUNK_TARGET_CHARS, overlap = CHUNK_OVERLAP_CHARS } = {}) {
  const clean = normalizeText(text);
  if (!clean) return [];

  // 1. paragraphs, with headings glued to what follows them
  const paragraphs = [];
  let pendingHeading = "";
  for (const raw of clean.split(/\n{2,}/)) {
    const paragraph = raw.trim();
    if (!paragraph) continue;
    if (looksLikeHeading(paragraph) && paragraph.length < target / 4) {
      pendingHeading = pendingHeading ? `${pendingHeading}\n${paragraph}` : paragraph;
      continue;
    }
    paragraphs.push(pendingHeading ? `${pendingHeading}\n${paragraph}` : paragraph);
    pendingHeading = "";
  }
  if (pendingHeading) paragraphs.push(pendingHeading);

  // 2. paragraphs that are still too long become several blocks
  const blocks = paragraphs.flatMap((p) => (p.length > target ? splitLongBlock(p, target) : [p]));

  // 3. pack blocks into chunks of about `target` characters, repeating a short tail between chunks
  const chunks = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + 2 + block.length > target) {
      chunks.push(current);
      const carry = tail(current, overlap);
      current = carry ? `${carry}\n${block}` : block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current) chunks.push(current);

  return chunks.map((c) => c.trim()).filter(Boolean);
}
