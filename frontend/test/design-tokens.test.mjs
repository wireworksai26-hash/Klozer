import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Guards DESIGN.md "Implementation Tokens": components use the tokens from globals.css,
// never hex colours, raw palette steps or arbitrary px font sizes.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const css = fs.readFileSync(path.join(srcDir, "app", "globals.css"), "utf8");

// The thermal receipt is a printed HTML document: it must stay pure black on white.
const PRINT_ONLY = [path.join("src", "utils", "thermalPrinter.js")];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "phrases") walk(full, out);
    } else if (/\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sources = walk(srcDir)
  .filter((file) => !PRINT_ONLY.includes(path.relative(root, file)))
  .map((file) => ({ rel: path.relative(root, file).replace(/\\/g, "/"), text: fs.readFileSync(file, "utf8") }));

function offenders(pattern) {
  const found = [];
  for (const { rel, text } of sources) {
    for (const match of text.matchAll(pattern)) found.push(`${rel}: ${match[0]}`);
  }
  return found;
}

test("no hex colours in components (use a colour token or var(--color-*))", () => {
  assert.deepEqual(offenders(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![\w-])/g), []);
});

test("no raw Tailwind palette steps: cool grays and unnamed hues are replaced by tokens", () => {
  const hues = "gray|slate|zinc|neutral|stone|red|green|emerald|amber|yellow|orange|rose|blue|sky|indigo|violet|purple|pink|teal|cyan|lime|fuchsia";
  assert.deepEqual(offenders(new RegExp(`\\b(?:[a-z0-9-]+:)*(?:bg|text|border|ring|from|to|via|divide|fill|stroke|shadow|outline|placeholder|accent|caret|decoration)-(?:${hues})-\\d{2,3}\\b`, "g")), []);
});

test("no arbitrary font sizes, shadows or font weights outside the scale", () => {
  assert.deepEqual(offenders(/\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/g), [], "use text-micro..text-display-lg");
  assert.deepEqual(offenders(/\bshadow-\[[^\]]+\]/g), [], "use shadow-soft/card/lift/float/brand");
  assert.deepEqual(offenders(/\bfont-(?:extrabold|black|thin|light)\b/g), [], "weights are 400/500/600/700");
  assert.deepEqual(offenders(/(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)\b/g), [], "use the DESIGN.md type scale");
  assert.deepEqual(offenders(/fontFamily\s*:/g), [], "use font-sans/font-display/font-mono");
});

test("every semantic status class points at a token that exists in globals.css", () => {
  const defined = new Set([...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]));
  const missing = new Set();
  const semantic = /\b(?:[a-z0-9-]+:)*(?:bg|text|border|ring|from|to|via|divide|fill|stroke|shadow|outline|placeholder|accent|caret|decoration)-((?:success|warning|danger|accent)-\d{2,3})(?:\/\d+)?\b/g;
  for (const { rel, text } of sources) {
    for (const match of text.matchAll(semantic)) if (!defined.has(match[1])) missing.add(`${rel}: ${match[1]}`);
  }
  assert.deepEqual([...missing], []);
});

test("every shadow-* utility used in components is a token", () => {
  const known = new Set([...css.matchAll(/--shadow-([a-z0-9-]+):/g)].map((m) => m[1]));
  // Tailwind's own scale is allowed as well.
  for (const name of ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "none", "inner"]) known.add(name);
  const unknown = new Set();
  for (const { rel, text } of sources) {
    for (const match of text.matchAll(/(?<![\w-])shadow-([a-z0-9]+(?:-[a-z]+)?)\b(?!\[)/g)) {
      const name = match[1];
      if (known.has(name)) continue;
      // shadow-<color> utilities (shadow-brand/20) are colour tokens, not elevation.
      if (css.includes(`--color-${name}:`) || css.includes(`--color-${name.split("-")[0]}-`)) continue;
      unknown.add(`${rel}: shadow-${name}`);
    }
  }
  assert.deepEqual([...unknown], []);
});
