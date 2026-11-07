import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { generateAiCsResponse } from "../src/services/aiBrainService.js";
import { OFF_LIMIT_REPLY } from "../src/services/personaRules.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json });
const modelAnswer = (content) => ok({ choices: [{ message: { content } }], usage: { prompt_tokens: 500, completion_tokens: 100 } });

/** Pretend to be the model: `answers` are given in turn (the last one repeats). Every request is kept for inspection. */
function mockModel(answers) {
  const calls = [];
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    if (!String(url).includes("integrate.api.nvidia.com")) throw new Error(`unexpected fetch ${url}`);
    calls.push(JSON.parse(opts.body));
    const next = answers[Math.min(calls.length - 1, answers.length - 1)];
    return typeof next === "function" ? next(calls.length) : modelAnswer(next);
  });
  return calls;
}

const setPersona = (t, persona) => query("UPDATE institutions SET ai_persona_json = ? WHERE id = ?", [JSON.stringify(persona), t.institutionId]);
const savedPersona = async (t) => {
  const [row] = await query("SELECT ai_persona_json FROM institutions WHERE id = ?", [t.institutionId]);
  return typeof row.ai_persona_json === "string" ? JSON.parse(row.ai_persona_json) : row.ai_persona_json;
};
const ask = (t, messageText, extra = {}) => generateAiCsResponse({ institutionId: t.institutionId, customerName: "Budi", messageText, history: [], ...extra });
const systemPromptOf = (calls) => calls[0].messages[0].content;

const GOOD_DRAFT = JSON.stringify({
  botName: "Kira",
  goal: "both",
  toneStyles: ["ramah", "empatis"],
  tone: "Hangat dan sabar seperti teman yang perhatian.",
  brandValues: "Cepat, Solutif, Tulus",
  greetingMessage: "Halo kak! Lagi cari apa hari ini?",
  abandonedMessage: "Kak, pesanan tadi belum dibayar ya. Gapapa kalau sibuk.",
  customFaqKeywords: "ongkir, stok, cara bayar",
  preferredWords: "siap, tentu",
  forbiddenWords: "anjir",
  offLimitTopics: "politik, SARA",
});

describe("saving the tuned persona", () => {
  test("every field from the intake form is kept and returned, and a bad choice is refused", async () => {
    const t = await createTenant();
    const body = {
      botName: "Sabrina", goal: "sales", toneStyles: ["ramah", "empatis"], tone: "Ramah", brandValues: "Cepat, Solutif", greetingMessage: "Halo",
      preferredWords: "siap", forbiddenWords: "anjir, bro", offLimitTopics: "politik", bigOrderAmount: 5000000, adaptiveStyle: false,
    };
    assert.equal((await api().put("/api/v1/ai/persona").set(bearer(t.ownerToken)).send(body)).status, 200);
    const read = (await api().get("/api/v1/ai/persona").set(bearer(t.csToken))).body.persona;
    for (const [key, value] of Object.entries(body)) assert.deepEqual(read[key], value, key);

    for (const bad of [{ goal: "internal" }, { toneStyles: ["marah"] }, { bigOrderAmount: -1 }, { forbiddenWords: "x".repeat(301) }]) {
      assert.equal((await api().put("/api/v1/ai/persona").set(bearer(t.ownerToken)).send(bad)).status, 400, JSON.stringify(bad).slice(0, 40));
    }
    assert.equal((await api().put("/api/v1/ai/persona").set(bearer(t.csToken)).send({ tone: "x" })).status, 403, "only managers tune the persona");
  });
});

describe("what the assistant is told", () => {
  test("goal, tone, brand values and words reach the system prompt", async () => {
    const t = await createTenant();
    await setPersona(t, { botName: "Sabrina", goal: "sales", toneStyles: ["empatis"], brandValues: "Cepat, Tulus", preferredWords: "siap", forbiddenWords: "anjir", offLimitTopics: "politik" });
    const calls = mockModel(["Siap kak, ada yang bisa aku bantu?"]);
    const reply = await ask(t, "halo, ada produk apa?");
    assert.equal(reply.success, true);
    const prompt = systemPromptOf(calls);
    for (const part of ["Penjualan: pahami kebutuhan", "Empatis dan edukatif", "Cepat, Tulus", "siap", "DILARANG", "anjir", "Topik terlarang", "politik"]) assert.ok(prompt.includes(part), part);
  });
});

describe("topics the owner put off limits", () => {
  test("the customer gets a fixed refusal and the model is never called", async () => {
    const t = await createTenant();
    await setPersona(t, { offLimitTopics: "politik, SARA" });
    const calls = mockModel(["seharusnya tidak dipanggil"]);
    const reply = await ask(t, "kak menurut kakak partai mana yang bagus, politik lagi panas nih");
    assert.equal(calls.length, 0, "no model call, so no tokens");
    assert.equal(reply.replyText, OFF_LIMIT_REPLY);
    assert.equal(reply.guardrailViolation, "off_limit_topic");
    assert.equal(reply.needsEscalation, false);
  });

  test("a topic is matched as a whole word, and everything else is answered", async () => {
    const t = await createTenant();
    await setPersona(t, { offLimitTopics: "sara" });
    const calls = mockModel(["Ready kak."]);
    const reply = await ask(t, "kemeja ini cocok untuk acara pernikahan saudara saya?");
    assert.equal(calls.length, 1, "'saudara' is not the word 'sara'");
    assert.notEqual(reply.replyText, OFF_LIMIT_REPLY);
  });
});

describe("words the owner banned", () => {
  test("a reply that uses one is written again once, and the customer sees the clean one", async () => {
    const t = await createTenant();
    await setPersona(t, { forbiddenWords: "anjir" });
    const calls = mockModel(["Anjir, stoknya ready kak.", "Stoknya ready kak."]);
    const reply = await ask(t, "kemeja masih ada?");
    assert.equal(calls.length, 2);
    assert.match(calls[1].messages[1].content, /dilarang pemilik toko: "anjir"/);
    assert.equal(reply.replyText, "Stoknya ready kak.");
    assert.equal(reply.needsEscalation, false);
    assert.equal(reply.usage.promptTokens, 1000, "both calls are counted");
  });

  test("if it still uses the word, a person answers instead and the word never reaches the customer", async () => {
    const t = await createTenant();
    await setPersona(t, { forbiddenWords: "anjir" });
    const calls = mockModel(["Anjir, ready kak."]);
    const reply = await ask(t, "kemeja masih ada?");
    assert.equal(calls.length, 2, "one rewrite, no more");
    assert.equal(reply.needsEscalation, true);
    assert.doesNotMatch(reply.replyText, /anjir/i);
  });

  test("a word inside another word is fine, and a persona without banned words costs no extra call", async () => {
    const t = await createTenant();
    await setPersona(t, { forbiddenWords: "tipu" });
    const calls = mockModel(["Itu bukan tipuan kak, barangnya asli."]);
    assert.equal((await ask(t, "ini asli?")).needsEscalation, false);
    assert.equal(calls.length, 1);
  });
});

describe("the AI button that drafts a persona", () => {
  const generate = (t, body = {}, token = t.ownerToken) => api().post("/api/v1/ai/persona/generate").set(bearer(token)).send(body);

  test("it fills every field from the shop's profile and the owner's words, saves nothing, and counts the tokens", async () => {
    const t = await createTenant();
    await createProduct(t.institutionId, { name: "Kemeja Batik Tulis" });
    await setPersona(t, { botName: "Lama" });
    const calls = mockModel([GOOD_DRAFT]);
    const before = Number((await query("SELECT ai_tokens_used AS n FROM institutions WHERE id = ?", [t.institutionId]))[0].n);

    const res = await generate(t, { hint: "jualan batik untuk ibu-ibu, ingin terdengar seperti teman" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.goal, "both");
    assert.deepEqual(res.body.data.toneStyles, ["ramah", "empatis"]);
    assert.equal(res.body.data.offLimitTopics, "politik, SARA");
    assert.equal(res.body.usedTokens, 600);

    const prompt = systemPromptOf(calls);
    for (const part of ["Kemeja Batik Tulis", "ibu-ibu", "Lama"]) assert.ok(prompt.includes(part), part);
    assert.deepEqual(await savedPersona(t), { botName: "Lama" }, "the draft is not saved until the owner saves it");
    assert.equal(Number((await query("SELECT ai_tokens_used AS n FROM institutions WHERE id = ?", [t.institutionId]))[0].n), before + 600);
    const [log] = await query("SELECT usage_type, total_tokens FROM ai_token_usage_logs WHERE institution_id = ? ORDER BY id DESC LIMIT 1", [t.institutionId]);
    assert.deepEqual([log.usage_type, Number(log.total_tokens)], ["persona_generate", 600]);
  });

  test("what the model wrote is made safe and fits the form's limits", async () => {
    const t = await createTenant();
    const long = "Kalimat hangat. ".repeat(60);
    mockModel([JSON.stringify({ tone: long, greetingMessage: "Halo <script>alert(1)</script>kak — selamat datang", goal: "bukan-pilihan", toneStyles: ["lucu"] })]);
    const res = await generate(t);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.tone.length <= 300);
    assert.ok(!res.body.data.greetingMessage.includes("<script"));
    assert.ok(!res.body.data.greetingMessage.includes("—"));
    assert.equal(res.body.data.goal, undefined, "a value outside the choices is dropped");
    assert.equal(res.body.data.toneStyles, undefined);
  });

  test("an answer that is not a persona is refused, still costing the tokens it used", async () => {
    const t = await createTenant();
    mockModel(["Maaf, saya tidak bisa membantu."]);
    const res = await generate(t);
    assert.equal(res.status, 502);
    assert.equal(res.body.code, "PERSONA_UNUSABLE");
    const [log] = await query("SELECT usage_type FROM ai_token_usage_logs WHERE institution_id = ? ORDER BY id DESC LIMIT 1", [t.institutionId]);
    assert.equal(log.usage_type, "persona_generate");
  });

  test("no model available gives a clear 503, and no tokens left gives a 402", async () => {
    const t = await createTenant();
    mockModel([() => ({ ok: false, status: 500, headers: { get: () => null }, json: async () => ({}) })]);
    assert.equal((await generate(t)).status, 503);

    mock.restoreAll();
    const calls = mockModel([GOOD_DRAFT]);
    await query("UPDATE institutions SET ai_token_quota = 100, ai_tokens_used = 100 WHERE id = ?", [t.institutionId]);
    assert.equal((await generate(t)).status, 402);
    assert.equal(calls.length, 0, "the model is not called when there are no tokens");
  });

  test("only owners and supervisors can use it, the hint is length-limited, and another shop's data is never used", async () => {
    const t = await createTenant();
    const other = await createTenant();
    await createProduct(other.institutionId, { name: "Produk Rahasia Toko Lain" });
    const calls = mockModel([GOOD_DRAFT]);
    assert.equal((await generate(t, {}, t.csToken)).status, 403);
    assert.equal((await generate(t, {}, t.financeToken)).status, 403);
    assert.equal((await generate(t, { hint: "x".repeat(401) })).status, 400);
    assert.equal((await api().post("/api/v1/ai/persona/generate").send({})).status, 401);
    assert.equal((await generate(t)).status, 200);
    assert.ok(!systemPromptOf(calls).includes("Produk Rahasia Toko Lain"));
  });
});
