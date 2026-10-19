import "./setupProof.js"; // env + an NVIDIA key (fetch is mocked below, nothing leaves the machine)
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { invalidateAiSettingsCache } from "../src/services/platformSettings.js";
import { generateAiCsResponse } from "../src/services/aiBrainService.js";
import { LEARNING_LIMITS } from "../src/services/aiLearningService.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => {
  mock.restoreAll();
  invalidateAiSettingsCache();
});

/** A lead with one customer question and the AI's answer to it. Returns the ids. */
async function conversation(t, { question = "apakah bisa cod ke luar kota?", answer = "Maaf kak, belum bisa COD." } = {}) {
  const phone = `62812${Math.floor(1e6 + Math.random() * 9e6)}`;
  const lead = await query("INSERT INTO leads (institution_id, phone_number, name) VALUES (?, ?, 'Budi')", [t.institutionId, phone]);
  const asked = await query("INSERT INTO chat_messages (institution_id, lead_id, sender_type, message_type, content_text) VALUES (?, ?, 'customer', 'text', ?)", [t.institutionId, lead.insertId, question]);
  const replied = await query(
    "INSERT INTO chat_messages (institution_id, lead_id, sender_type, message_type, content_text, model_used, meta_json) VALUES (?, ?, 'ai_agent', 'text', ?, 'm-1', ?)",
    [t.institutionId, lead.insertId, answer, JSON.stringify({ sources: [{ documentId: 1, title: "SOP" }], fallbackUsed: true })]
  );
  return { leadId: lead.insertId, askedId: asked.insertId, replyId: replied.insertId };
}

const capture = () => {
  const prompts = [];
  mock.method(globalThis, "fetch", async (url, init) => {
    prompts.push(JSON.parse(init.body).messages[0].content);
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Siap kak" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } }) };
  });
  return prompts;
};

describe("reviewing AI replies", () => {
  test("the feed pairs each AI reply with the question it answered, plus what it used", async () => {
    const t = await createTenant();
    const c = await conversation(t);
    const res = await api().get("/api/v1/ai/evaluation").set(bearer(t.ownerToken));
    assert.equal(res.status, 200);
    const item = res.body.items.find((i) => i.messageId === c.replyId);
    assert.equal(item.customerMessage, "apakah bisa cod ke luar kota?");
    assert.equal(item.aiReply, "Maaf kak, belum bisa COD.");
    assert.equal(item.fallbackUsed, true);
    assert.deepEqual(item.sources, [{ documentId: 1, title: "SOP" }]);
    assert.equal(item.feedback, null);
    assert.equal(item.correction, null);
  });

  test("rating a reply moves it between filters and into the summary; null clears it", async () => {
    const t = await createTenant();
    const good = await conversation(t, { question: "harga serum?", answer: "Rp 159.000 kak." });
    const bad = await conversation(t);

    const rate = (id, rating, token = t.csToken) => api().post(`/api/v1/ai/evaluation/${id}/feedback`).set(bearer(token)).send({ rating });
    assert.equal((await rate(good.replyId, "good")).status, 200, "a CS agent can rate");
    assert.equal((await rate(bad.replyId, "bad")).status, 200);

    const filtered = async (filter) => (await api().get(`/api/v1/ai/evaluation?filter=${filter}`).set(bearer(t.ownerToken))).body.items.map((i) => i.messageId);
    assert.deepEqual(await filtered("good"), [good.replyId]);
    assert.deepEqual(await filtered("bad"), [bad.replyId]);
    assert.deepEqual(await filtered("unreviewed"), []);

    const summary = (await api().get("/api/v1/ai/evaluation/summary").set(bearer(t.ownerToken))).body;
    assert.equal(summary.total, 2);
    assert.equal(summary.good, 1);
    assert.equal(summary.bad, 1);
    assert.equal(summary.approvalRate, 50);

    await rate(bad.replyId, null);
    assert.deepEqual(await filtered("unreviewed"), [bad.replyId]);
    assert.equal((await rate(bad.replyId, "meh")).status, 400);
  });

  test("tenants are isolated, and customer or staff messages cannot be rated as AI replies", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const c = await conversation(a);

    assert.equal((await api().post(`/api/v1/ai/evaluation/${c.replyId}/feedback`).set(bearer(b.ownerToken)).send({ rating: "good" })).status, 404);
    assert.equal((await api().post(`/api/v1/ai/evaluation/${c.replyId}/correct`).set(bearer(b.ownerToken)).send({ correctedReply: "x" })).status, 404);
    assert.equal((await api().get("/api/v1/ai/evaluation").set(bearer(b.ownerToken))).body.items.length, 0);
    assert.equal((await api().post(`/api/v1/ai/evaluation/${c.askedId}/feedback`).set(bearer(a.ownerToken)).send({ rating: "good" })).status, 404, "a customer message is not an AI reply");
  });
});

describe("corrections and rules", () => {
  test("correcting a reply saves the right answer, marks the reply bad, and a second correction replaces the first", async () => {
    const t = await createTenant();
    const c = await conversation(t);
    const post = (correctedReply, token = t.ownerToken) => api().post(`/api/v1/ai/evaluation/${c.replyId}/correct`).set(bearer(token)).send({ correctedReply, note: "COD hanya Jawa" });

    const first = await post("Bisa kak, COD tersedia untuk wilayah Jawa.");
    assert.equal(first.status, 201);
    assert.equal(first.body.data.customerMessage, "apakah bisa cod ke luar kota?");
    assert.equal(first.body.data.originalReply, "Maaf kak, belum bisa COD.");

    const second = await post("Bisa kak, COD untuk Jawa dan Bali.");
    assert.equal(second.body.data.id, first.body.data.id, "same correction, updated");

    const list = (await api().get("/api/v1/ai/corrections?kind=example").set(bearer(t.ownerToken))).body;
    assert.equal(list.total, 1);
    assert.equal(list.items[0].correctedReply, "Bisa kak, COD untuk Jawa dan Bali.");

    const feed = (await api().get("/api/v1/ai/evaluation?filter=corrected").set(bearer(t.ownerToken))).body.items[0];
    assert.equal(feed.feedback, "bad");
    assert.equal(feed.correction.correctedReply, "Bisa kak, COD untuk Jawa dan Bali.");

    assert.equal((await post("Coba koreksi", t.csToken)).status, 403, "only owner and supervisor correct answers");
  });

  test("the next similar question is answered using the correction, and unrelated ones are not", async () => {
    const t = await createTenant();
    const c = await conversation(t);
    await api().post(`/api/v1/ai/evaluation/${c.replyId}/correct`).set(bearer(t.ownerToken)).send({ correctedReply: "Bisa kak, COD tersedia untuk wilayah Jawa dan Bali." });
    const prompts = capture();

    const similar = await generateAiCsResponse({ institutionId: t.institutionId, customerName: "Sari", messageText: "kak kalau ke luar kota bisa cod nggak?" });
    assert.match(prompts[0], /\[ATURAN & KOREKSI DARI PEMILIK TOKO\]/);
    assert.match(prompts[0], /COD tersedia untuk wilayah Jawa dan Bali/);
    assert.ok(similar.correctionIds.length >= 1);

    await generateAiCsResponse({ institutionId: t.institutionId, customerName: "Sari", messageText: "ada diskon untuk pembelian grosir?" });
    assert.doesNotMatch(prompts[1], /\[ATURAN & KOREKSI/);
  });

  test("a standing rule is sent with every reply, can be switched off, and one tenant's rule never reaches another", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const rule = await api().post("/api/v1/ai/rules").set(bearer(a.ownerToken)).send({ ruleText: "Jangan pernah menjanjikan stok kosong akan datang kembali." });
    assert.equal(rule.status, 201);
    const prompts = capture();

    await generateAiCsResponse({ institutionId: a.institutionId, customerName: "Sari", messageText: "halo" });
    assert.match(prompts[0], /Jangan pernah menjanjikan stok kosong/);
    await generateAiCsResponse({ institutionId: b.institutionId, customerName: "Sari", messageText: "halo" });
    assert.doesNotMatch(prompts[1], /Jangan pernah menjanjikan/);

    await api().put(`/api/v1/ai/corrections/${rule.body.data.id}`).set(bearer(a.ownerToken)).send({ isActive: false });
    await generateAiCsResponse({ institutionId: a.institutionId, customerName: "Sari", messageText: "halo" });
    assert.doesNotMatch(prompts[2], /Jangan pernah menjanjikan/);

    assert.equal((await api().delete(`/api/v1/ai/corrections/${rule.body.data.id}`).set(bearer(a.ownerToken))).status, 200);
    assert.equal((await api().delete(`/api/v1/ai/corrections/${rule.body.data.id}`).set(bearer(a.ownerToken))).status, 404);
  });

  test("text is stored as written, and over-long or empty input is refused", async () => {
    const t = await createTenant();
    const raw = "Kalau total < 100rb dan > 50rb, ongkir 10rb.";
    const rule = await api().post("/api/v1/ai/rules").set(bearer(t.ownerToken)).send({ ruleText: raw });
    assert.equal(rule.body.data.ruleText, raw);
    assert.equal((await api().post("/api/v1/ai/rules").set(bearer(t.ownerToken)).send({ ruleText: "x" })).status, 400);
    assert.equal((await api().post("/api/v1/ai/rules").set(bearer(t.ownerToken)).send({ ruleText: "y".repeat(301) })).status, 400);
  });

  test("the rule ceiling is enforced", async () => {
    const t = await createTenant();
    const values = Array.from({ length: LEARNING_LIMITS.maxRules }, (_, i) => [t.institutionId, "rule", `Aturan nomor ${i}`]);
    await query("INSERT INTO ai_corrections (institution_id, kind, rule_text) VALUES ?", [values]);
    const res = await api().post("/api/v1/ai/rules").set(bearer(t.ownerToken)).send({ ruleText: "Satu aturan lagi yang melewati batas." });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "RULE_LIMIT");
  });

  test("the package can switch evaluation and learning off", async () => {
    const t = await createTenant();
    const c = await conversation(t);
    await api().post(`/api/v1/ai/evaluation/${c.replyId}/correct`).set(bearer(t.ownerToken)).send({ correctedReply: "Bisa kak." });
    await query("UPDATE institutions SET features_json = JSON_OBJECT('aiLearning', false) WHERE id = ?", [t.institutionId]);

    const off = await api().get("/api/v1/ai/evaluation").set(bearer(t.ownerToken));
    assert.equal(off.status, 403);
    assert.equal(off.body.code, "FEATURE_DISABLED");

    const prompts = capture();
    await generateAiCsResponse({ institutionId: t.institutionId, customerName: "Sari", messageText: "bisa cod ke luar kota?" });
    assert.doesNotMatch(prompts[0], /\[ATURAN & KOREKSI/, "nothing is injected while the feature is off");
  });
});
