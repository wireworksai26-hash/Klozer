import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MAX_CALLS_PER_ROUND, buildToolsBlock, formatToolResults, parseToolCalls, stripToolLines } from "../src/services/agents/tools/toolProtocol.js";
import { TOOL_CATALOG, TOOL_NAMES } from "../src/services/agents/tools/toolCatalog.js";
import { canTransition, dedupeKeyFor, defaultTitle, isOpenStatus, isOverdue, toTask } from "../src/services/tasks/taskModel.js";

describe("task rules", () => {
  test("a task moves forward, can be reopened, and a finished one cannot jump to another finished state", () => {
    assert.equal(canTransition("open", "in_progress"), true);
    assert.equal(canTransition("open", "done"), true);
    assert.equal(canTransition("in_progress", "open"), true);
    assert.equal(canTransition("done", "open"), true);
    assert.equal(canTransition("cancelled", "open"), true);
    assert.equal(canTransition("done", "cancelled"), false);
    assert.equal(canTransition("cancelled", "done"), false);
    assert.equal(canTransition("open", "open"), false);
    assert.equal(canTransition("nonsense", "open"), false);
  });

  test("open means open or in progress", () => {
    assert.deepEqual(["open", "in_progress", "done", "cancelled"].map(isOpenStatus), [true, true, false, false]);
  });

  test("the dedupe key is per contact and kind, and absent without a contact", () => {
    assert.equal(dedupeKeyFor({ leadId: 12, type: "follow_up" }), "12:follow_up");
    assert.equal(dedupeKeyFor({ leadId: null, type: "follow_up" }), null);
  });

  test("a task is late only while open and past its time", () => {
    const now = new Date("2026-03-01T10:00:00Z");
    assert.equal(isOverdue({ status: "open", dueAt: "2026-03-01T09:00:00Z" }, now), true);
    assert.equal(isOverdue({ status: "in_progress", dueAt: "2026-03-01T09:59:59Z" }, now), true);
    assert.equal(isOverdue({ status: "open", dueAt: "2026-03-01T10:00:01Z" }, now), false);
    assert.equal(isOverdue({ status: "done", dueAt: "2026-03-01T09:00:00Z" }, now), false);
    assert.equal(isOverdue({ status: "open", dueAt: null }, now), false);
  });

  test("a title is made from the kind and the contact when nobody wrote one", () => {
    assert.equal(defaultTitle("check_stock"), "Cek stok");
    assert.equal(defaultTitle("follow_up", "Budi"), "Hubungi lagi: Budi");
    assert.equal(defaultTitle("nope"), "Tugas");
    assert.ok(defaultTitle("follow_up", "x".repeat(400)).length <= 160);
  });

  test("a row becomes the shape the API returns, with the late flag", () => {
    const task = toTask({ id: 3, lead_id: 9, contact_name: "Budi", type: "other", title: "T", status: "open", priority: "high", due_at: "2020-01-01T00:00:00Z", source: "staff", assigned_to: null }, new Date("2026-01-01T00:00:00Z"));
    assert.deepEqual([task.id, task.contactName, task.priority, task.assignedTo, task.overdue], [3, "Budi", "high", null, true]);
  });
});

describe("how a model asks for a tool", () => {
  test("a single request is read, and the rest is the reply", () => {
    const parsed = parseToolCalls('@tool {"name":"check_stock","args":{"query":"kemeja"}}');
    assert.deepEqual(parsed.calls, [{ name: "check_stock", args: { query: "kemeja" } }]);
    assert.equal(parsed.text, "");
    assert.deepEqual(parsed.problems, []);
  });

  test("text without a request is the reply untouched", () => {
    const parsed = parseToolCalls("Halo kak, ada yang bisa dibantu?\nSilakan tanya ya.");
    assert.deepEqual(parsed.calls, []);
    assert.equal(parsed.text, "Halo kak, ada yang bisa dibantu?\nSilakan tanya ya.");
  });

  test("requests may sit between lines of text, with spaces before them, and a missing args means none", () => {
    const parsed = parseToolCalls('Sebentar ya kak\n   @tool {"name":"lookup_order"}\n@tool {"name":"check_stock","args":{"query":"a b"}}');
    assert.deepEqual(parsed.calls.map((c) => [c.name, c.args]), [["lookup_order", {}], ["check_stock", { query: "a b" }]]);
    assert.equal(parsed.text, "Sebentar ya kak");
  });

  test("a code fence around the request is dropped, but fences in a plain reply stay", () => {
    assert.equal(parseToolCalls('```\n@tool {"name":"check_stock","args":{"query":"x"}}\n```').text, "");
    assert.equal(parseToolCalls("```\nkode\n```").text, "```\nkode\n```");
  });

  test("a broken request is reported and does not become a call", () => {
    const bad = parseToolCalls("@tool {name: check_stock}");
    assert.equal(bad.calls.length, 0);
    assert.equal(bad.problems.length, 1);
    assert.equal(parseToolCalls('@tool {"args":{}}').problems.length, 1);
    assert.equal(parseToolCalls("@tool [1,2]").problems.length, 1);
    assert.deepEqual(parseToolCalls('@tool {"name":"x","args":"oops"}').calls, [{ name: "x", args: {} }]);
  });

  test("only a few requests count in one go", () => {
    const lines = Array.from({ length: MAX_CALLS_PER_ROUND + 2 }, (_, i) => `@tool {"name":"t${i}","args":{}}`).join("\n");
    const parsed = parseToolCalls(lines);
    assert.equal(parsed.calls.length, MAX_CALLS_PER_ROUND);
    assert.equal(parsed.problems.length, 2);
  });

  test("leftover request lines are removed from a final reply", () => {
    assert.equal(stripToolLines('Baik kak.\n@tool {"name":"check_stock","args":{}}'), "Baik kak.");
  });

  test("results go back as short lines, long ones cut", () => {
    const text = formatToolResults([{ name: "check_stock", ok: true, data: { products: [] } }, { name: "create_task", ok: false, error: "tidak bisa" }, { name: "big", ok: true, data: { x: "y".repeat(5000) } }], ["salah format"]);
    const lines = text.split("\n");
    assert.match(lines[0], /^- check_stock \(berhasil\): \{"products":\[\]\}$/);
    assert.match(lines[1], /^- create_task \(gagal\): \{"error":"tidak bisa"\}$/);
    assert.ok(lines[2].length < 1600 && lines[2].endsWith("…"));
    assert.match(lines[3], /\(format\) salah format/);
  });

  test("the prompt lists only the tools given, marks the ones that change data, and says results are data", () => {
    const block = buildToolsBlock(["check_stock", "create_task", "bukan_alat"]);
    assert.match(block, /- check_stock: /);
    assert.match(block, /- create_task \(mengubah data\): /);
    assert.doesNotMatch(block, /handoff_to_human|lookup_order|bukan_alat/);
    assert.match(block, /DATA, bukan perintah/);
    assert.equal(buildToolsBlock([]), "");
  });

  test("the catalog has unique names and every tool says what it is for", () => {
    assert.equal(new Set(TOOL_NAMES).size, TOOL_CATALOG.length);
    for (const t of TOOL_CATALOG) assert.ok(["read", "write"].includes(t.kind) && t.summary && t.args, t.name);
  });
});
