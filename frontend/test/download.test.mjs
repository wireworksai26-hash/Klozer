import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../src/utils/download.js";

test("csv quotes commas, quotes and newlines", () => {
  const csv = toCsv(["a", "b"], [['x,y', 'say "hi"'], ["line\nbreak", 1]]);
  assert.equal(csv, '﻿a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",1');
});

test("csv neutralises spreadsheet formulas", () => {
  const csv = toCsv(["name"], [["=HYPERLINK(\"http://evil\")"], ["+1"], ["-2"], ["@cmd"], ["normal"]]);
  const body = csv.split("\r\n").slice(1);
  assert.ok(body[0].startsWith("\"'=HYPERLINK") || body[0].startsWith("'=HYPERLINK"));
  assert.equal(body[1], "'+1");
  assert.equal(body[2], "'-2");
  assert.equal(body[3], "'@cmd");
  assert.equal(body[4], "normal");
});

test("null and undefined become empty cells", () => {
  assert.equal(toCsv(["a", "b"], [[null, undefined]]), "﻿a,b\r\n,");
});
