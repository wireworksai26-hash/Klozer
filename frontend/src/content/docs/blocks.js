// Small builders for the documentation text, so each guide reads as plain prose in the source.
//   h("Judul")                 a heading inside a guide
//   p("Paragraf")              a paragraph; **tebal** and `kode` work inside every text
//   steps(["...", "..."])      numbered steps, in order
//   list(["...", "..."])       bullets, no order
//   tip("...") / warn("...")   a hint, and something to be careful about
//   terms([["Istilah", "arti"]])   a short glossary
//   faq([["Pertanyaan", "jawaban"]])  questions and answers

export const h = (text) => ({ type: "h", text });
export const p = (text) => ({ type: "p", text });
export const steps = (items) => ({ type: "steps", items });
export const list = (items) => ({ type: "list", items });
export const tip = (text) => ({ type: "tip", text });
export const warn = (text) => ({ type: "warn", text });
export const terms = (rows) => ({ type: "terms", rows });
export const faq = (rows) => ({ type: "faq", rows });

/** Every piece of text in a block, for searching and for the content checks. */
export function blockTexts(block) {
  if (block.type === "steps" || block.type === "list") return block.items;
  if (block.type === "terms" || block.type === "faq") return block.rows.flat();
  return [block.text];
}
