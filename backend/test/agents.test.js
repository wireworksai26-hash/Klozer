import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { api, bearer, createProduct, createTenant, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const APP_SECRET = "test-app-secret";
const signed = (body) => `sha256=${crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;
const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) });
const row = async (sql, params) => (await query(sql, params))[0];

const NLU_MARK = "mengekstrak data pesanan";
const ROUTER_MARK = "memilih agen AI";

/** Fake network: the assistant's replies record the prompt they were given; the order reader and the router answer from `state`. */
function mockNetwork(state = {}) {
  const calls = { replies: [], nlu: 0, router: [], graph: [] };
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const u = String(url);
    const body = typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : opts.body;
    if (u.includes("integrate.api.nvidia.com")) {
      const system = String(body.messages[0].content);
      const customer = String(body.messages[1].content).match(/"""\n([\s\S]*)\n"""/)?.[1] ?? "";
      const usage = { prompt_tokens: 200, completion_tokens: 20 };
      if (system.includes(NLU_MARK)) {
        calls.nlu++;
        return ok({ choices: [{ message: { content: JSON.stringify(state.nlu?.(customer) ?? {}) } }], usage });
      }
      if (system.includes(ROUTER_MARK)) {
        calls.router.push({ system, customer });
        const answer = state.router?.(customer);
        return ok({ choices: [{ message: { content: typeof answer === "string" ? answer : JSON.stringify(answer ?? {}) } }], usage });
      }
      calls.replies.push({ system, user: String(body.messages[1].content) });
      return ok({ choices: [{ message: { content: "Baik kak, aku bantu ya." } }], usage });
    }
    if (u.includes("graph.facebook.com")) {
      calls.graph.push({ url: u, body });
      return ok({ messages: [{ id: `wamid.OUT.${calls.graph.length}` }] });
    }
    throw new Error(`unexpected fetch to ${u}`);
  });
  return { calls, state };
}

let seq = 0;
async function shop() {
  const t = await createTenant();
  const pn = `PN-AG-${t.institutionId}-${++seq}`;
  const res = await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp", name: "Toko", externalId: pn, accessToken: `EAAG-token-${pn}` });
  assert.equal(res.status, 201);
  return { ...t, pn, from: "6281500000001" };
}

const agentBody = (over = {}) => ({ name: "Penjualan", description: "Membantu calon pembeli memilih produk", instructions: "Fokus membantu pelanggan menyelesaikan pembelian dengan ramah.", ...over });
const addAgent = async (t, over) => {
  const res = await api().post("/api/v1/ai/agents").set(bearer(t.ownerToken)).send(agentBody(over));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};
const usePresets = async (t) => {
  const res = await api().post("/api/v1/ai/agents/presets").set(bearer(t.ownerToken));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return Object.fromEntries(res.body.data.map((a) => [a.name, a]));
};

const inboundBody = (t, text, from = t.from) =>
  JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "W", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: t.pn }, contacts: [{ profile: { name: "Pembeli" }, wa_id: from }], messages: [{ from, id: `wamid.${crypto.randomUUID()}`, type: "text", text: { body: text } }] } }] }] });

/** The customer writes; resolves when the assistant's answer is stored. */
async function say(t, text, from = t.from) {
  const count = async () => Number((await row("SELECT COUNT(*) AS n FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent'", [t.institutionId])).n);
  const before = await count();
  const raw = inboundBody(t, text, from);
  const res = await api().post("/api/v1/webhooks/whatsapp").set("Content-Type", "application/json").set("x-hub-signature-256", signed(raw)).send(raw);
  assert.equal(res.status, 200);
  await waitFor(async () => (await count()) > before, { timeout: 6000 });
}
const leadOf = (t, from = t.from) => row("SELECT * FROM leads WHERE institution_id = ? AND phone_number = ?", [t.institutionId, from]);
const lastReply = (calls) => calls.replies.at(-1);
const logs = (t) => query("SELECT g.*, a.name AS to_name, b.name AS from_name FROM agent_routing_logs g LEFT JOIN ai_agents a ON a.id = g.to_agent_id LEFT JOIN ai_agents b ON b.id = g.from_agent_id WHERE g.institution_id = ? ORDER BY g.id", [t.institutionId]);

describe("managing agents", () => {
  test("create, read, change and delete; the same name twice is refused", async () => {
    const t = await shop();
    const a = await addAgent(t, { triggers: { intents: ["buy"] }, capabilities: { commerce: "full" }, priority: 200, botName: "Sari", tone: "santai" });
    assert.deepEqual([a.name, a.priority, a.botName, a.capabilities.commerce, a.triggers.intents, a.isActive, a.isDefault], ["Penjualan", 200, "Sari", "full", ["buy"], true, false]);
    assert.equal((await api().post("/api/v1/ai/agents").set(bearer(t.ownerToken)).send(agentBody())).body.code, "AGENT_NAME_TAKEN");

    const got = await api().get(`/api/v1/ai/agents/${a.id}`).set(bearer(t.csToken));
    assert.equal(got.body.data.stats.replies, 0);
    const changed = await api().put(`/api/v1/ai/agents/${a.id}`).set(bearer(t.ownerToken)).send({ description: "Menutup penjualan dengan cepat", triggers: { keywords: ["beli"] }, isActive: false });
    assert.deepEqual([changed.body.data.description, changed.body.data.triggers.keywords, changed.body.data.triggers.intents, changed.body.data.isActive], ["Menutup penjualan dengan cepat", ["beli"], [], false]);
    assert.equal((await api().put(`/api/v1/ai/agents/${a.id}`).set(bearer(t.ownerToken)).send({})).status, 400);

    assert.equal((await api().delete(`/api/v1/ai/agents/${a.id}`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().get(`/api/v1/ai/agents/${a.id}`).set(bearer(t.ownerToken))).status, 404);
  });

  test("only managers change agents, tenants never see each other's, and the plan limits how many", async () => {
    const a = await shop();
    const b = await shop();
    const agent = await addAgent(a);
    assert.equal((await api().post("/api/v1/ai/agents").set(bearer(a.csToken)).send(agentBody({ name: "X" }))).status, 403);
    assert.equal((await api().get("/api/v1/ai/agents").set(bearer(a.csToken))).status, 200, "staff may look");
    assert.equal((await api().get("/api/v1/ai/agents").set(bearer(b.ownerToken))).body.data.length, 0);
    assert.equal((await api().get(`/api/v1/ai/agents/${agent.id}`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await api().put(`/api/v1/ai/agents/${agent.id}`).set(bearer(b.ownerToken)).send({ isActive: false })).status, 404);
    assert.equal((await api().delete(`/api/v1/ai/agents/${agent.id}`).set(bearer(b.ownerToken))).status, 404);

    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [a.institutionId]);
    await addAgent(a, { name: "Kedua" });
    const third = await api().post("/api/v1/ai/agents").set(bearer(a.ownerToken)).send(agentBody({ name: "Ketiga" }));
    assert.equal(third.status, 409);
    assert.equal(third.body.code, "AGENT_LIMIT");
    const list = await api().get("/api/v1/ai/agents").set(bearer(a.ownerToken));
    assert.equal(list.body.limit, 2);
  });

  test("there is one default agent; making another the default takes it from the first", async () => {
    const t = await shop();
    const first = await addAgent(t, { name: "Satu", isDefault: true });
    const second = await addAgent(t, { name: "Dua", isDefault: true });
    const list = (await api().get("/api/v1/ai/agents").set(bearer(t.ownerToken))).body.data;
    assert.deepEqual(Object.fromEntries(list.map((x) => [x.name, x.isDefault])), { Satu: false, Dua: true });
    await api().put(`/api/v1/ai/agents/${first.id}`).set(bearer(t.ownerToken)).send({ isDefault: true });
    assert.deepEqual((await api().get("/api/v1/ai/agents").set(bearer(t.ownerToken))).body.data.filter((x) => x.isDefault).map((x) => x.name), ["Satu"]);
    assert.ok(second.id);
  });

  test("the starter set is created once, and only into an empty shop", async () => {
    const t = await shop();
    const presets = await usePresets(t);
    assert.deepEqual(Object.keys(presets).sort(), ["Layanan Pelanggan", "Penjualan", "Umum"]);
    assert.equal(presets.Umum.isDefault, true);
    assert.deepEqual(presets["Layanan Pelanggan"].capabilities, { commerce: "service" });
    const again = await api().post("/api/v1/ai/agents/presets").set(bearer(t.ownerToken));
    assert.equal(again.status, 409);
    assert.equal(again.body.code, "AGENTS_EXIST");
  });

  test("an agent can read only the documents given to it, and only the shop's own", async () => {
    const t = await shop();
    const other = await shop();
    const doc = (await api().post("/api/v1/knowledge/text").set(bearer(t.ownerToken)).send({ title: "Garansi", content: "Garansi produk berlaku tiga puluh hari sejak barang diterima pelanggan." })).body.data;
    const foreign = (await api().post("/api/v1/knowledge/text").set(bearer(other.ownerToken)).send({ title: "Lain", content: "Dokumen milik toko lain yang tidak boleh dipakai agen ini." })).body.data;
    const agent = await addAgent(t, { knowledgeDocumentIds: [doc.id] });
    assert.deepEqual(agent.knowledgeDocumentIds, [doc.id]);
    const bad = await api().put(`/api/v1/ai/agents/${agent.id}`).set(bearer(t.ownerToken)).send({ knowledgeDocumentIds: [foreign.id] });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, "UNKNOWN_DOCUMENT");
    const cleared = await api().put(`/api/v1/ai/agents/${agent.id}`).set(bearer(t.ownerToken)).send({ knowledgeDocumentIds: [] });
    assert.deepEqual(cleared.body.data.knowledgeDocumentIds, []);
  });

  test("routing settings are validated and kept per shop; the feature can be switched off by the package", async () => {
    const t = await shop();
    const other = await shop();
    assert.equal((await api().get("/api/v1/ai/agents/settings").set(bearer(t.ownerToken))).body.data.routerMode, "rules");
    assert.equal((await api().put("/api/v1/ai/agents/settings").set(bearer(t.ownerToken)).send({ routerMode: "smart", switchConfidence: 80 })).body.data.routerMode, "smart");
    assert.equal((await api().put("/api/v1/ai/agents/settings").set(bearer(t.ownerToken)).send({ routerMode: "guess" })).status, 400);
    assert.equal((await api().put("/api/v1/ai/agents/settings").set(bearer(t.csToken)).send({ routerMode: "rules" })).status, 403);
    assert.equal((await api().get("/api/v1/ai/agents/settings").set(bearer(other.ownerToken))).body.data.routerMode, "rules");

    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.multiAgent', false) WHERE id = ?", [t.institutionId]);
    const off = await api().get("/api/v1/ai/agents").set(bearer(t.ownerToken));
    assert.deepEqual([off.status, off.body.code], [403, "FEATURE_DISABLED"]);
  });
});

describe("agents in conversations", () => {
  test("a shop with no agents is answered exactly as before", async () => {
    const t = await shop();
    const net = mockNetwork();
    await say(t, "mau pesan kemeja batik");
    assert.equal(net.calls.replies.length, 1);
    assert.doesNotMatch(lastReply(net.calls).system, /PERAN KAMU SAAT INI/);
    const lead = await leadOf(t);
    assert.equal(lead.ai_agent_id, null);
    assert.equal((await logs(t)).length, 0);
    assert.equal((await row("SELECT ai_agent_id FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent'", [t.institutionId])).ai_agent_id, null);
  });

  test("the message goes to the agent whose rules fit, the agent's role reaches the prompt, and the reply is attributed to it", async () => {
    const t = await shop();
    const net = mockNetwork();
    const sales = await addAgent(t, { name: "Penjualan", instructions: "Fokus menutup penjualan; tawarkan satu pilihan terbaik dulu.", triggers: { intents: ["buy"] }, botName: "Sari", tone: "santai dan ceria" });
    await addAgent(t, { name: "Umum", description: "Pertanyaan umum toko", instructions: "Jawab pertanyaan umum dengan ramah.", isDefault: true });

    await say(t, "mau pesan kemeja batik");
    const prompt = lastReply(net.calls).system;
    assert.match(prompt, /\[PERAN KAMU SAAT INI: Penjualan\]/);
    assert.match(prompt, /tawarkan satu pilihan terbaik dulu/);
    assert.match(prompt, /Namamu: Sari/);
    assert.match(prompt, /santai dan ceria/);
    assert.doesNotMatch(prompt, /Jawab pertanyaan umum dengan ramah/, "another agent's instructions are not in this prompt");

    const lead = await leadOf(t);
    assert.equal(lead.ai_agent_id, sales.id);
    assert.equal((await row("SELECT ai_agent_id FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent'", [t.institutionId])).ai_agent_id, sales.id);
    const [log] = await logs(t);
    assert.deepEqual([log.to_name, log.method, log.reason, log.from_name], ["Penjualan", "rule", "maksud buy", null]);
  });

  test("a new conversation with no rule match goes to the default agent; it stays there until a rule moves it", async () => {
    const t = await shop();
    const net = mockNetwork();
    const presets = await usePresets(t);

    await say(t, "jam buka sampai jam berapa?");
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Umum\]/);
    assert.equal((await leadOf(t)).ai_agent_id, presets.Umum.id);

    await say(t, "oke makasih kak");
    assert.equal((await logs(t)).length, 1, "staying with the same agent is not a switch and is not logged");

    await say(t, "resinya mana ya kak?");
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Layanan Pelanggan\]/);
    const note = await row("SELECT content_text FROM chat_messages WHERE institution_id = ? AND sender_type = 'system' ORDER BY id DESC LIMIT 1", [t.institutionId]);
    assert.match(note.content_text, /Agen AI: Umum → Layanan Pelanggan \(maksud order_status\)/);

    await say(t, "ok ditunggu ya");
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Layanan Pelanggan\]/, "no rule: the conversation stays");
    assert.deepEqual((await logs(t)).map((l) => [l.from_name, l.to_name, l.method]), [[null, "Umum", "default"], ["Umum", "Layanan Pelanggan", "rule"]]);
  });

  test("a conversation pinned by staff does not move; releasing it returns to automatic choice", async () => {
    const t = await shop();
    const net = mockNetwork();
    const presets = await usePresets(t);
    await say(t, "halo kak");
    const lead = await leadOf(t);

    const pin = await api().put(`/api/v1/leads/${lead.id}/agent`).set(bearer(t.csToken)).send({ agentId: presets["Layanan Pelanggan"].id, pinned: true });
    assert.deepEqual(pin.body.data, { leadId: lead.id, agentId: presets["Layanan Pelanggan"].id, pinned: true });
    await say(t, "mau pesan kemeja batik");
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Layanan Pelanggan\]/, "a buying message does not pull a pinned conversation away");

    await api().put(`/api/v1/leads/${lead.id}/agent`).set(bearer(t.csToken)).send({ agentId: null });
    await say(t, "mau pesan kemeja batik lagi");
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Penjualan\]/);

    const inactive = await addAgent(t, { name: "Tidak aktif", isActive: false });
    assert.equal((await api().put(`/api/v1/leads/${lead.id}/agent`).set(bearer(t.csToken)).send({ agentId: inactive.id })).body.code, "UNKNOWN_AGENT");
    const other = await shop();
    assert.equal((await api().put(`/api/v1/leads/${lead.id}/agent`).set(bearer(other.csToken)).send({ agentId: null })).status, 404);
  });

  test("an agent limited to some documents sees only those", async () => {
    const t = await shop();
    const net = mockNetwork();
    const warranty = (await api().post("/api/v1/knowledge/text").set(bearer(t.ownerToken)).send({ title: "Garansi", content: "Kebijakan garansi toko: garansi produk berlaku tiga puluh hari sejak barang diterima." })).body.data;
    await api().post("/api/v1/knowledge/text").set(bearer(t.ownerToken)).send({ title: "Pengiriman", content: "Kebijakan garansi pengiriman: paket hilang diganti penuh oleh ekspedisi rekanan kami." });
    await addAgent(t, { name: "Khusus Garansi", description: "Pertanyaan garansi produk", instructions: "Jawab soal garansi.", triggers: { keywords: ["garansi"] }, knowledgeDocumentIds: [warranty.id] });

    await say(t, "bagaimana kebijakan garansi toko?");
    const prompt = lastReply(net.calls).system;
    assert.match(prompt, /tiga puluh hari/, "its own document is read");
    assert.doesNotMatch(prompt, /paket hilang diganti/, "another document is not");

    const plain = await shop();
    const net2 = mockNetwork();
    await api().post("/api/v1/knowledge/text").set(bearer(plain.ownerToken)).send({ title: "Garansi", content: "Kebijakan garansi toko: garansi produk berlaku tiga puluh hari sejak barang diterima." });
    await api().post("/api/v1/knowledge/text").set(bearer(plain.ownerToken)).send({ title: "Pengiriman", content: "Kebijakan garansi pengiriman: paket hilang diganti penuh oleh ekspedisi rekanan kami." });
    await addAgent(plain, { name: "Semua", description: "Pertanyaan garansi", instructions: "Jawab soal garansi.", triggers: { keywords: ["garansi"] } });
    await say(plain, "bagaimana kebijakan garansi toko?");
    assert.match(lastReply(net2.calls).system, /tiga puluh hari/);
    assert.match(lastReply(net2.calls).system, /paket hilang diganti/, "no scope means every document");
  });

  test("a deleted or switched-off agent is replaced at the next message", async () => {
    const t = await shop();
    const net = mockNetwork();
    const presets = await usePresets(t);
    await say(t, "mau pesan kemeja");
    assert.equal((await leadOf(t)).ai_agent_id, presets.Penjualan.id);

    await api().delete(`/api/v1/ai/agents/${presets.Penjualan.id}`).set(bearer(t.ownerToken));
    assert.equal((await leadOf(t)).ai_agent_id, null, "the conversation is released");
    await say(t, "oke kak");
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Umum\]/);

    await api().put(`/api/v1/ai/agents/${presets.Umum.id}`).set(bearer(t.ownerToken)).send({ isActive: false });
    await say(t, "halo lagi");
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Layanan Pelanggan\]/, "the strongest active agent when no default is left");
  });
});

describe("smart routing", () => {
  async function smartShop(confidenceNeeded = 70) {
    const t = await shop();
    await addAgent(t, { name: "Konsultasi", description: "Membantu pelanggan memilih ukuran dan bahan", instructions: "Bantu pelanggan memilih ukuran dan bahan yang pas.", isDefault: true });
    const retur = await addAgent(t, { name: "Retur", description: "Menangani penukaran dan pengembalian barang", instructions: "Bantu proses penukaran dan pengembalian barang." });
    await api().put("/api/v1/ai/agents/settings").set(bearer(t.ownerToken)).send({ routerMode: "smart", switchConfidence: confidenceNeeded });
    return { t, retur };
  }

  test("when no rule decides, the model picks; a confident answer switches, and a first pick is taken even when unsure", async () => {
    const { t, retur } = await smartShop();
    const net = mockNetwork({ router: () => ({ agentId: retur.id, confidence: 92 }) });
    await say(t, "bajunya kekecilan, bagaimana caranya ya?");
    assert.equal(net.calls.router.length, 1);
    assert.match(net.calls.router[0].system, /Retur \| Menangani penukaran/);
    assert.equal((await leadOf(t)).ai_agent_id, retur.id);
    const [log] = await logs(t);
    assert.deepEqual([log.method, log.confidence], ["smart", 92]);
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Retur\]/);

    const other = await smartShop();
    const net2 = mockNetwork({ router: () => ({ agentId: other.retur.id, confidence: 40 }) });
    await say(other.t, "bagaimana ya kak", "6281500000009");
    assert.equal(net2.calls.router.length, 1);
    assert.match(lastReply(net2.calls).system, /\[PERAN KAMU SAAT INI: Retur\]/, "a conversation with no agent yet takes the model's pick even when unsure");
  });

  test("with an agent already handling, a doubtful answer leaves it where it is", async () => {
    const { t, retur } = await smartShop();
    const net = mockNetwork({ router: () => ({ agentId: retur.id, confidence: 95 }) });
    await say(t, "bajunya kekecilan");
    assert.equal((await leadOf(t)).ai_agent_id, retur.id);
    net.state.router = () => ({ agentId: retur.id, confidence: 50 });
    await say(t, "terima kasih banyak");
    assert.equal((await leadOf(t)).ai_agent_id, retur.id);
    assert.equal((await logs(t)).length, 1);
  });

  test("a rule decides without asking the model; unusable answers are ignored; rules mode never asks", async () => {
    const t = await shop();
    const presets = await usePresets(t);
    await api().put("/api/v1/ai/agents/settings").set(bearer(t.ownerToken)).send({ routerMode: "smart" });
    const net = mockNetwork({ router: () => "saya tidak yakin" });
    await say(t, "mau pesan kemeja");
    assert.equal(net.calls.router.length, 0, "a buying message is decided by rule, no model call");
    assert.equal((await leadOf(t)).ai_agent_id, presets.Penjualan.id);

    await say(t, "bagaimana ya kak");
    assert.equal(net.calls.router.length, 1);
    assert.equal((await leadOf(t)).ai_agent_id, presets.Penjualan.id, "an unusable answer changes nothing");
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM ai_token_usage_logs WHERE institution_id = ? AND usage_type = 'agent_router'", [t.institutionId])).n), 1, "the routing call is metered");

    await api().put("/api/v1/ai/agents/settings").set(bearer(t.ownerToken)).send({ routerMode: "rules" });
    await say(t, "terima kasih ya");
    assert.equal(net.calls.router.length, 1, "rules mode never asks");
  });

  test("a model that is down does not stop the conversation", async () => {
    const { t } = await smartShop();
    mock.method(globalThis, "fetch", async (url, opts = {}) => {
      const u = String(url);
      if (u.includes("integrate.api.nvidia.com")) {
        const system = JSON.parse(opts.body).messages[0].content;
        if (String(system).includes(ROUTER_MARK)) return { ok: false, status: 503, json: async () => ({}), text: async () => "" };
        return ok({ choices: [{ message: { content: "Baik kak." } }], usage: { prompt_tokens: 10, completion_tokens: 2 } });
      }
      return ok({ messages: [{ id: "wamid.X" }] });
    });
    await say(t, "bagaimana ya kak");
    assert.ok((await leadOf(t)).ai_agent_id, "the default agent answered");
  });
});

describe("agents and orders", () => {
  async function commerceShop() {
    const t = await shop();
    const kemeja = await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, hpp: 90000, stock: 10 });
    await api().post("/api/v1/bank-accounts").set(bearer(t.ownerToken)).send({ bank_code: "BCA", account_number: "1234567890", account_holder: "Toko Batik" });
    await api().put("/api/v1/commerce/settings").set(bearer(t.ownerToken)).send({ enabled: true, shippingMode: "flat", shippingFlatFee: 15000, payQris: false, payTransfer: true });
    return { ...t, kemeja };
  }
  const nluFor = (t) => (text) => (/kemeja/i.test(text) ? { items: [{ productId: t.kemeja, quantity: 2, mode: "add" }] } : /mawar/i.test(text) ? { recipient: { name: "Budi", address: "Jl. Mawar 5", city: "Solo" } } : {});

  test("the selling agent takes the order; an order in progress is not pulled away by a rule for another agent", async () => {
    const t = await commerceShop();
    const net = mockNetwork({ nlu: nluFor(t) });
    const presets = await usePresets(t);

    await say(t, "mau pesan 2 kemeja");
    assert.equal((await leadOf(t)).ai_agent_id, presets.Penjualan.id);
    assert.equal(net.calls.replies.length, 0, "the order flow answered, not the general assistant");
    assert.ok(await row("SELECT id FROM order_drafts WHERE institution_id = ? AND active = 1", [t.institutionId]));

    await say(t, "transfer aja kak, alamat Jl. Mawar 5 Solo");
    assert.equal((await leadOf(t)).ai_agent_id, presets.Penjualan.id, "'transfer' matches the after-sales rules, but an order is in progress");
    const [log] = await logs(t);
    assert.equal(log.method, "rule");
    assert.equal((await logs(t)).length, 1);
  });

  test("an agent set to service only answers about existing orders and never starts a new one", async () => {
    const t = await commerceShop();
    const net = mockNetwork({ nlu: nluFor(t) });
    const presets = await usePresets(t);
    await say(t, "halo kak");
    const lead = await leadOf(t);
    await api().put(`/api/v1/leads/${lead.id}/agent`).set(bearer(t.csToken)).send({ agentId: presets["Layanan Pelanggan"].id, pinned: true });

    await say(t, "mau pesan 2 kemeja");
    assert.equal((await query("SELECT id FROM order_drafts WHERE institution_id = ?", [t.institutionId])).length, 0, "no draft: this agent does not take orders");
    assert.equal(net.calls.nlu, 0);
    assert.match(lastReply(net.calls).system, /\[PERAN KAMU SAAT INI: Layanan Pelanggan\]/);
  });

  test("an agent set to off leaves orders entirely, including status questions", async () => {
    const t = await commerceShop();
    const net = mockNetwork({ nlu: nluFor(t) });
    const informational = await addAgent(t, { name: "Informasi", description: "Hanya informasi umum toko", instructions: "Jawab informasi umum saja.", isDefault: true, capabilities: { commerce: "off" } });
    const product = t.kemeja;
    const order = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ phone_number: "6281500000001", customer_name: "Budi", customer_phone: "6281500000001", items: [{ product_id: product, quantity: 1 }] });
    assert.equal(order.status, 201);
    await say(t, "pesanan saya sampai mana ya");
    assert.equal((await leadOf(t)).ai_agent_id, informational.id);
    assert.equal(net.calls.replies.length, 1, "the general assistant answered; the deterministic order-status reply did not run");
  });

  test("agents are listed with how they are doing: replies, conversations and ratings", async () => {
    const t = await shop();
    mockNetwork();
    const presets = await usePresets(t);
    await say(t, "mau pesan kemeja");
    await say(t, "mau pesan lagi dong");
    await say(t, "halo", "6281500000002");
    const replies = await query("SELECT id, ai_agent_id FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent' ORDER BY id", [t.institutionId]);
    await api().post(`/api/v1/ai/evaluation/${replies[0].id}/feedback`).set(bearer(t.csToken)).send({ rating: "good" });

    const list = (await api().get("/api/v1/ai/agents").set(bearer(t.ownerToken))).body.data;
    const by = Object.fromEntries(list.map((a) => [a.name, a.stats]));
    assert.deepEqual([by.Penjualan.replies, by.Penjualan.conversations, by.Penjualan.good, by.Penjualan.currentConversations], [2, 1, 1, 1]);
    assert.deepEqual([by.Umum.replies, by.Umum.conversations], [1, 1]);
    assert.equal(presets.Umum.id > 0, true);
  });
});

describe("trying the rules out", () => {
  test("the preview says which agent a made-up message would reach, and why, without sending anything", async () => {
    const t = await shop();
    const net = mockNetwork();
    const presets = await usePresets(t);
    const preview = (body) => api().post("/api/v1/ai/agents/route-preview").set(bearer(t.ownerToken)).send(body);

    const buy = await preview({ text: "mau pesan kemeja" });
    assert.deepEqual([buy.body.data.agent.name, buy.body.data.method, buy.body.data.reason, buy.body.data.wouldAskModel], ["Penjualan", "rule", "maksud buy", false]);
    const status = await preview({ text: "resi saya mana", currentAgentId: presets.Penjualan.id });
    assert.equal(status.body.data.agent.name, "Layanan Pelanggan");
    const plain = await preview({ text: "jam buka?" });
    assert.deepEqual([plain.body.data.agent.name, plain.body.data.method], ["Umum", "default"]);
    const mid = await preview({ text: "alamat saya Jl. Mawar", currentAgentId: presets["Layanan Pelanggan"].id, orderInProgress: true });
    assert.deepEqual([mid.body.data.agent.name, mid.body.data.method], ["Penjualan", "order"]);
    assert.equal((await preview({ text: " " })).status, 400);
    assert.equal((await api().post("/api/v1/ai/agents/route-preview").set(bearer(t.csToken)).send({ text: "x" })).status, 403);

    await api().put("/api/v1/ai/agents/settings").set(bearer(t.ownerToken)).send({ routerMode: "smart" });
    assert.equal((await preview({ text: "jam buka?" })).body.data.wouldAskModel, true, "in smart mode the model would be asked here");
    assert.equal(net.calls.router.length + net.calls.replies.length, 0, "nothing was sent to a model or a customer");
  });

  test("the routing log lists every switch, for a shop or one conversation, and only the shop's own", async () => {
    const t = await shop();
    const other = await shop();
    mockNetwork();
    await usePresets(t);
    await say(t, "halo kak");
    await say(t, "mau pesan kemeja");
    await say(t, "halo", "6281500000003");
    const all = await api().get("/api/v1/ai/agents/routing-log").set(bearer(t.ownerToken));
    assert.equal(all.body.data.length, 3);
    assert.deepEqual(all.body.data[0].to, "Umum");
    const lead = await leadOf(t);
    const one = await api().get("/api/v1/ai/agents/routing-log").query({ leadId: lead.id }).set(bearer(t.ownerToken));
    assert.deepEqual(one.body.data.map((l) => [l.from, l.to]).reverse(), [[null, "Umum"], ["Umum", "Penjualan"]]);
    assert.equal((await api().get("/api/v1/ai/agents/routing-log").set(bearer(other.ownerToken))).body.data.length, 0);
    assert.equal((await api().get("/api/v1/ai/agents/routing-log").set(bearer(t.csToken))).status, 403);
  });
});
