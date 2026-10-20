import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPhones, looksLikePhone, textToRows } from "../src/components/broadcast/consentParse.mjs";

test("looksLikePhone accepts formatted numbers and rejects words and short numbers", () => {
  assert.equal(looksLikePhone("0812-3456-7890"), true);
  assert.equal(looksLikePhone("+62 812 3456 7890"), true);
  assert.equal(looksLikePhone("Budi"), false);
  assert.equal(looksLikePhone("12345"), false);
});

test("extractPhones takes the column with the most numbers, skips the header and drops duplicates", () => {
  const rows = textToRows("nama,telepon,kota\nBudi,081234567890,Solo\nSiti,+62 812-3456-7890,Jakarta\nAni,081299900002,Bali\nItu,bukan nomor,Medan");
  const out = extractPhones(rows);
  assert.deepEqual(out.phones, ["081234567890", "081299900002"]);
  assert.equal(out.duplicates, 1);
  assert.equal(out.ignored, 1);
  assert.equal(out.tooMany, false);
});

test("a pasted list with one number per line works", () => {
  const out = extractPhones(textToRows("081234567890\n\n081234567891\n"));
  assert.equal(out.phones.length, 2);
});
