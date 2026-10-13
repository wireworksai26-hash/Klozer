import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getTranslation, translations } from "../src/utils/i18n.js";
import { enPhrases } from "../src/utils/phrases/en/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const phrasesDir = path.join(srcDir, "utils", "phrases", "en");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const tokens = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const resolvesAsPath = (key) => key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), translations.en) !== undefined;

test("getTranslation: English phrase, placeholders and Indonesian pass-through", () => {
  assert.equal(getTranslation("en", "Pesanan Berhasil"), "Successful Orders");
  assert.equal(getTranslation("id", "Pesanan Berhasil"), "Pesanan Berhasil");
  assert.equal(getTranslation("en", "{count} aktif", { count: 3 }), "3 active");
  assert.equal(getTranslation("id", "{count} aktif", { count: 3 }), "3 aktif");
});

test("getTranslation: unknown phrase falls back to the source text, never a raw key", () => {
  assert.equal(getTranslation("en", "Kalimat yang belum diterjemahkan"), "Kalimat yang belum diterjemahkan");
  assert.equal(getTranslation("en", "nav.dashboard", "Dashboard Utama"), "Main Dashboard");
  assert.equal(getTranslation("en", "nav.tidakAda", "Cadangan"), "Cadangan");
});

test("getTranslation: a ||context suffix picks a variant in English and is never displayed", () => {
  assert.equal(getTranslation("en", "Pesanan||singular"), "Order");
  assert.equal(getTranslation("en", "Pesanan"), "Orders");
  assert.equal(getTranslation("id", "Pesanan||singular"), "Pesanan");
  assert.equal(getTranslation("en", "Frasa baru||konteks"), "Frasa baru");
});

test("every t(\"...\") literal in src has an English translation", () => {
  const callPattern = /(?:\bt|tRef\.current|\btt)\(\s*"((?:[^"\\]|\\.)*)"/g;
  const missing = new Map();
  for (const file of walk(srcDir)) {
    if (file.startsWith(phrasesDir) || file.endsWith(path.join("utils", "i18n.js"))) continue;
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(callPattern)) {
      const key = JSON.parse(`"${match[1]}"`);
      if (Object.hasOwn(enPhrases, key) || resolvesAsPath(key)) continue;
      if (!missing.has(key)) missing.set(key, path.relative(root, file));
    }
  }
  assert.deepEqual([...missing].map(([key, file]) => `${file}: ${key}`), []);
});

test("one Indonesian phrase never has two different English translations", () => {
  const seen = new Map();
  const conflicts = [];
  return Promise.all(
    fs.readdirSync(phrasesDir).filter((f) => f.endsWith(".js") && f !== "index.js").map(async (file) => {
      const mod = await import(pathToFileURL(path.join(phrasesDir, file)).href);
      for (const [key, value] of Object.entries(mod.default)) {
        if (seen.has(key) && seen.get(key).value !== value) conflicts.push(`${key}: "${seen.get(key).value}" (${seen.get(key).file}) vs "${value}" (${file})`);
        else seen.set(key, { value, file });
      }
    })
  ).then(() => assert.deepEqual(conflicts, []));
});

test("English phrases keep the same {placeholders} as the Indonesian source", () => {
  const broken = Object.entries(enPhrases).filter(([key, value]) => tokens(key).join() !== tokens(value).join());
  assert.deepEqual(broken.map(([key]) => key), []);
});
