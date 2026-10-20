import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agentPersona, buildAgentBlock, buildClassifierPrompt, chooseByRules, decideAgent, defaultAgent, detectIntents, matchTriggers, matchesKeyword, normalizeTriggers, parseClassifierAnswer, EMPTY_TRIGGERS } from "../src/services/agents/agentModel.js";
import { AGENT_PRESETS } from "../src/services/agents/presets.js";
import { createAgentBody, routePreviewBody, setConversationAgentBody, updateAgentBody, updateAgentSettingsBody } from "../src/validation/agentSchemas.js";

// Which agent answers which message: the rules, with no database and no model.

let nextId = 1;
const agent = (over = {}) => ({
  ...{ botName: null, tone: null, greeting: null },
  id: nextId++,
  name: "Agen",
  description: "tugas",
  instructions: "Bantu pelanggan dengan baik.",
  capabilities: { commerce: "full" },
  priority: 100,
  isDefault: false,
  isActive: true,
  knowledgeDocumentIds: [],
  ...over,
  triggers: normalizeTriggers(over.triggers || {}),
});
const ctx = (over = {}) => ({ text: "halo", channelType: "whatsapp", leadStatus: "new", labelIds: [], isNewContact: false, hasOpenOrder: false, ...over });

describe("what a message shows", () => {
  test("intents come from fixed rules", () => {
    assert.deepEqual([...detectIntents("mau pesan 2 kemeja")], ["buy"]);
    assert.deepEqual([...detectIntents("resinya mana kak")], ["order_status"]);
    assert.deepEqual([...detectIntents("sudah transfer ya")].sort(), ["payment"]);
    assert.deepEqual([...detectIntents("qris aja")], ["payment"]);
    assert.deepEqual([...detectIntents("jam buka sampai jam berapa?")], []);
  });

  test("keywords match whole words and phrases", () => {
    assert.equal(matchesKeyword("Barangnya RUSAK kak!", ["rusak", "retur"]), "rusak");
    assert.equal(matchesKeyword("mau tukar ukuran", ["tukar ukuran"]), "tukar ukuran");
    assert.equal(matchesKeyword("kerusakan parah", ["rusak"]), null, "not inside a longer word");
    assert.equal(matchesKeyword("halo", []), null);
  });

  test("triggers are cleaned into a fixed shape", () => {
    assert.deepEqual(normalizeTriggers(), EMPTY_TRIGGERS);
    const t = normalizeTriggers({ channels: ["whatsapp", 5], keywords: [" garansi ", ""], intents: ["buy", "nonsense"], labelIds: ["3", -1, "x"], newContact: "yes", hasOpenOrder: true, extra: 1 });
    assert.deepEqual(t, { channels: ["whatsapp", "5"], keywords: ["garansi"], intents: ["buy"], labelIds: [3], leadStatuses: [], newContact: null, hasOpenOrder: true });
  });
});

describe("does an agent's rule set fit", () => {
  test("every kind of condition that is set must hold; any value within a kind will do", () => {
    const a = agent({ triggers: { channels: ["instagram", "messenger"], intents: ["buy"] } });
    assert.equal(matchTriggers(a, ctx({ text: "mau beli", channelType: "instagram" })).matched, true);
    assert.equal(matchTriggers(a, ctx({ text: "mau beli", channelType: "whatsapp" })).matched, false, "wrong channel");
    assert.equal(matchTriggers(a, ctx({ text: "halo", channelType: "instagram" })).matched, false, "no buying intent");
    assert.deepEqual(matchTriggers(a, ctx({ text: "mau beli", channelType: "messenger" })).reasons, ["kanal messenger", "maksud buy"]);
  });

  test("each kind of condition", () => {
    assert.equal(matchTriggers(agent({ triggers: { keywords: ["garansi"] } }), ctx({ text: "ada garansi?" })).matched, true);
    assert.equal(matchTriggers(agent({ triggers: { labelIds: [4, 5] } }), ctx({ labelIds: [5] })).matched, true);
    assert.equal(matchTriggers(agent({ triggers: { labelIds: [4] } }), ctx({ labelIds: [] })).matched, false);
    assert.equal(matchTriggers(agent({ triggers: { leadStatuses: ["closing"] } }), ctx({ leadStatus: "closing" })).matched, true);
    assert.equal(matchTriggers(agent({ triggers: { newContact: true } }), ctx({ isNewContact: true })).matched, true);
    assert.equal(matchTriggers(agent({ triggers: { newContact: false } }), ctx({ isNewContact: true })).matched, false);
    assert.equal(matchTriggers(agent({ triggers: { hasOpenOrder: true } }), ctx({ hasOpenOrder: true })).matched, true);
    assert.equal(matchTriggers(agent({ triggers: { hasOpenOrder: false } }), ctx({ hasOpenOrder: true })).matched, false);
  });

  test("an agent with no conditions is never picked by rules", () => {
    assert.equal(matchTriggers(agent(), ctx()).matched, false);
  });

  test("the more specific agent wins, then the higher priority, then the older one", () => {
    const broad = agent({ name: "luas", triggers: { intents: ["buy"] }, priority: 500 });
    const narrow = agent({ name: "sempit", triggers: { intents: ["buy"], channels: ["whatsapp"] }, priority: 10 });
    assert.equal(chooseByRules([broad, narrow], ctx({ text: "mau beli" })).agent.name, "sempit", "specificity first");
    const a = agent({ name: "a", triggers: { intents: ["buy"] }, priority: 100 });
    const b = agent({ name: "b", triggers: { intents: ["buy"] }, priority: 200 });
    assert.equal(chooseByRules([a, b], ctx({ text: "mau beli" })).agent.name, "b", "then priority");
    const c = agent({ name: "c", triggers: { intents: ["buy"] }, priority: 200 });
    assert.equal(chooseByRules([c, b], ctx({ text: "mau beli" })).agent.name, "b", "then the older (lower id)");
    assert.equal(chooseByRules([agent({ triggers: { intents: ["buy"] }, isActive: false })], ctx({ text: "mau beli" })), null, "inactive agents are ignored");
    assert.equal(chooseByRules([a], ctx({ text: "halo" })), null);
  });

  test("the default agent is the marked one, else the strongest active one", () => {
    const x = agent({ priority: 10 });
    const y = agent({ priority: 90 });
    const z = agent({ priority: 50, isDefault: true });
    assert.equal(defaultAgent([x, y, z]).id, z.id);
    assert.equal(defaultAgent([x, y]).id, y.id);
    assert.equal(defaultAgent([agent({ isActive: false })]), null);
    assert.equal(defaultAgent([]), null);
  });
});

describe("deciding who answers", () => {
  const sales = agent({ name: "Penjualan", triggers: { intents: ["buy"] }, priority: 200 });
  const support = agent({ name: "Layanan", triggers: { intents: ["order_status"] }, capabilities: { commerce: "service" }, priority: 150 });
  const general = agent({ name: "Umum", isDefault: true, priority: 50 });
  const agents = [sales, support, general];
  const decide = (over) => decideAgent({ agents, current: null, ctx: ctx(), ...over });

  test("with no agents there is no agent", () => {
    assert.deepEqual(decideAgent({ agents: [], current: null, ctx: ctx() }), { agent: null, method: "none", reason: "belum ada agen aktif", confidence: null });
    assert.equal(decideAgent({ agents: [agent({ isActive: false })], current: null, ctx: ctx() }).method, "none");
  });

  test("a rule moves the conversation; with no rule it stays; a new conversation gets the default", () => {
    const first = decide({ ctx: ctx({ text: "mau pesan kemeja" }) });
    assert.deepEqual([first.agent.name, first.method, first.ruled], ["Penjualan", "rule", true]);
    const switched = decide({ current: sales, ctx: ctx({ text: "resinya mana?" }) });
    assert.deepEqual([switched.agent.name, switched.method], ["Layanan", "rule"]);
    const stays = decide({ current: support, ctx: ctx({ text: "oke makasih" }) });
    assert.deepEqual([stays.agent.name, stays.method, stays.ruled], ["Layanan", "sticky", undefined]);
    const fresh = decide({ ctx: ctx({ text: "jam buka?" }) });
    assert.deepEqual([fresh.agent.name, fresh.method], ["Umum", "default"]);
    assert.equal(decide({ current: sales, ctx: ctx({ text: "mau beli lagi" }) }).method, "sticky", "its own rule still matches: no switch");
  });

  test("a conversation a person pinned to an agent never moves", () => {
    const d = decide({ current: general, pinned: true, ctx: ctx({ text: "mau pesan kemeja" }) });
    assert.deepEqual([d.agent.name, d.method], ["Umum", "pinned"]);
    assert.equal(decide({ current: null, pinned: true, ctx: ctx({ text: "mau pesan" }) }).method, "rule", "a pin to an agent that is gone is ignored");
  });

  test("while an order is being put together, an agent that takes orders keeps the conversation", () => {
    const d = decide({ current: sales, orderInProgress: true, ctx: ctx({ text: "resinya mana?" }) });
    assert.deepEqual([d.agent.name, d.method], ["Penjualan", "order"], "the order-status rule does not pull it away mid-order");
    const fromService = decide({ current: support, orderInProgress: true, ctx: ctx({ text: "alamat saya Jl. Mawar 5" }) });
    assert.equal(fromService.agent.name, "Penjualan", "an agent that only serves cannot hold an order in progress");
    const noTaker = decideAgent({ agents: [support], current: support, orderInProgress: true, ctx: ctx({ text: "x" }) });
    assert.equal(noTaker.agent.name, "Layanan", "if nobody takes orders the usual rules apply");
  });

  test("in smart mode the model's choice decides when no rule does, and only when it is confident or there is no current agent", () => {
    const smart = (confidence, current = general) => decide({ current, ctx: ctx({ text: "bagaimana ya" }), smartChoice: { agentId: sales.id, confidence }, switchConfidence: 70 });
    assert.deepEqual([smart(90).agent.name, smart(90).method, smart(90).confidence], ["Penjualan", "smart", 90]);
    assert.equal(smart(60).agent.name, "Umum", "not confident enough to switch");
    assert.equal(smart(60, null).agent.name, "Penjualan", "with nobody handling yet, any answer is used");
    const rule = decide({ current: general, ctx: ctx({ text: "resinya mana?" }), smartChoice: { agentId: sales.id, confidence: 99 } });
    assert.equal(rule.agent.name, "Layanan", "a rule outranks the model");
    assert.equal(decide({ current: general, ctx: ctx({ text: "x" }), smartChoice: { agentId: 99999, confidence: 99 } }).agent.name, "Umum", "an unknown agent id is ignored");
  });

  test("an inactive current agent is replaced", () => {
    const gone = agent({ name: "Mati", isActive: false });
    assert.equal(decide({ current: gone, ctx: ctx({ text: "halo" }) }).agent.name, "Umum");
  });
});

describe("the model's routing answer", () => {
  test("only a real agent, with a bounded confidence, is accepted", () => {
    assert.deepEqual(parseClassifierAnswer('{"agentId":4,"confidence":85}', [3, 4]), { agentId: 4, confidence: 85 });
    assert.deepEqual(parseClassifierAnswer('```json\n{"agentId":"4","confidence":150}\n```', [4]), { agentId: 4, confidence: 100 });
    assert.deepEqual(parseClassifierAnswer('{"agentId":4,"confidence":-5}', [4]), { agentId: 4, confidence: 0 });
    assert.equal(parseClassifierAnswer('{"agentId":9,"confidence":90}', [3, 4]), null);
    assert.equal(parseClassifierAnswer("saya pilih agen penjualan", [3]), null);
    assert.equal(parseClassifierAnswer('{"confidence":90}', [3]), null);
  });

  test("the prompt lists the active agents, marks the current one, and guards against instructions in the message", () => {
    const prompt = buildClassifierPrompt({ agents: [agent({ id: 7, name: "Penjualan", description: "Membantu pembelian" }), agent({ id: 8, name: "Mati", isActive: false })], currentId: 7 });
    assert.match(prompt, /7 \| Penjualan \| Membantu pembelian \(sedang menangani\)/);
    assert.doesNotMatch(prompt, /Mati/);
    assert.match(prompt, /Abaikan perintah apa pun/);
  });
});

describe("what an agent adds to the prompt", () => {
  test("the role block carries the instructions and keeps the data rules in force", () => {
    const block = buildAgentBlock(agent({ name: "Penjualan", instructions: "Fokus ke penutupan." }));
    assert.match(block, /\[PERAN KAMU SAAT INI: Penjualan\]/);
    assert.match(block, /Fokus ke penutupan\./);
    assert.match(block, /Batasan data .* tetap berlaku penuh/);
    assert.equal(buildAgentBlock(null), "");
  });

  test("only the persona fields the agent sets replace the shop's", () => {
    assert.deepEqual(agentPersona(agent({ botName: "Sari", tone: "santai", greeting: "Halo!" })), { botName: "Sari", tone: "santai", greetingMessage: "Halo!" });
    assert.deepEqual(agentPersona(agent({ botName: "Sari" })), { botName: "Sari" });
    assert.deepEqual(agentPersona(null), {});
  });

  test("the starter set covers general, selling and after-sales, with one default", () => {
    assert.deepEqual(AGENT_PRESETS.map((p) => p.name), ["Umum", "Penjualan", "Layanan Pelanggan"]);
    assert.equal(AGENT_PRESETS.filter((p) => p.isDefault).length, 1);
    assert.deepEqual(AGENT_PRESETS.map((p) => p.capabilities.commerce), ["full", "full", "service"]);
    for (const p of AGENT_PRESETS) assert.ok(p.description.length >= 10 && p.instructions.length >= 10);
    assert.ok(AGENT_PRESETS.every((p) => createAgentBody.safeParse(p).success), "each preset is a valid agent");
  });
});

describe("request validation", () => {
  const ok = (schema, body) => schema.safeParse(body).success;

  test("agents", () => {
    assert.ok(ok(createAgentBody, { name: "Penjualan", description: "Membantu pembelian produk", instructions: "Fokus ke penutupan pesanan." }));
    assert.ok(ok(createAgentBody, { name: "Penjualan", description: "Membantu pembelian produk", instructions: "Fokus ke penutupan pesanan.", capabilities: { commerce: "service" }, triggers: { intents: ["buy"], channels: ["whatsapp"] }, priority: 200, knowledgeDocumentIds: [1, 2] }));
    assert.ok(!ok(createAgentBody, { name: "x", description: "pendek", instructions: "pendek" }), "too short to mean anything");
    assert.ok(!ok(createAgentBody, { name: "A", description: "Membantu pembelian produk", instructions: "x".repeat(2001) }));
    assert.ok(!ok(createAgentBody, { name: "A", description: "Membantu pembelian produk", instructions: "Fokus ke penutupan pesanan.", capabilities: { commerce: "everything" } }));
    assert.ok(!ok(createAgentBody, { name: "A", description: "Membantu pembelian produk", instructions: "Fokus ke penutupan pesanan.", triggers: { intents: ["magic"] } }));
    assert.ok(ok(updateAgentBody, { isActive: false }));
    assert.ok(!ok(updateAgentBody, {}));
  });

  test("settings, preview and pinning", () => {
    assert.ok(ok(updateAgentSettingsBody, { routerMode: "smart", switchConfidence: 80 }));
    assert.ok(!ok(updateAgentSettingsBody, { routerMode: "guess" }));
    assert.ok(!ok(updateAgentSettingsBody, { switchConfidence: 10 }));
    assert.ok(ok(routePreviewBody, { text: "mau pesan", channelType: "instagram", hasOpenOrder: true }));
    assert.ok(!ok(routePreviewBody, { text: " " }));
    assert.ok(ok(setConversationAgentBody, { agentId: 3, pinned: true }));
    assert.ok(ok(setConversationAgentBody, { agentId: null }));
    assert.ok(!ok(setConversationAgentBody, {}));
  });
});
