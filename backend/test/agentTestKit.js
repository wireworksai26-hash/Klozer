import crypto from "crypto";
import { mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";

/**
 * Shared pieces for tests that drive a conversation end to end: a shop with a WhatsApp number, AI agents, a customer who
 * writes through the real webhook, and a fake network where the model's answers come from the test. A test file imports
 * "./setupWhatsapp.js" first (it sets the environment) and then this.
 */

export const APP_SECRET = "test-app-secret";
export const signed = (body) => `sha256=${crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;
export const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) });
export const row = async (sql, params) => (await query(sql, params))[0];

const NLU_MARK = "mengekstrak data pesanan";
const ROUTER_MARK = "memilih agen AI";
const CONSULT_MARK = "MODE KONSULTASI INTERNAL";
let outgoing = 0; // message ids the fake platform hands out, unique across a test file

/**
 * Fake network. The assistant's ordinary replies are taken in turn from `state.replies` (a string, or a function of
 * `{ system, user }`); the router, the order reader and an agent consulted by another agent answer from `state.router`,
 * `state.nlu` and `state.consult`. Everything the model was sent is kept in `calls`.
 */
export function mockNetwork(state = {}) {
  const calls = { replies: [], nlu: 0, router: [], consults: [], graph: [] };
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const u = String(url);
    const body = typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : opts.body;
    if (u.includes("integrate.api.nvidia.com")) {
      const system = String(body.messages[0].content);
      const user = String(body.messages[1].content);
      const customer = user.match(/"""\n([\s\S]*)\n"""/)?.[1] ?? "";
      const usage = { prompt_tokens: 200, completion_tokens: 20 };
      const answer = (text) => ok({ choices: [{ message: { content: text } }], usage });
      if (system.includes(NLU_MARK)) {
        calls.nlu++;
        return answer(JSON.stringify(state.nlu?.(customer) ?? {}));
      }
      if (system.includes(ROUTER_MARK)) {
        calls.router.push({ system, customer });
        const out = state.router?.(customer);
        return answer(typeof out === "string" ? out : JSON.stringify(out ?? {}));
      }
      if (system.includes(CONSULT_MARK)) {
        calls.consults.push({ system, user });
        const out = state.consult?.({ system, user });
        return out === null ? ok({ choices: [{ message: { content: "" } }], usage }) : answer(out ?? "Jawaban dari rekan.");
      }
      const turn = calls.replies.length;
      calls.replies.push({ system, user });
      const scripted = state.replies?.[turn];
      return answer(typeof scripted === "function" ? scripted({ system, user }) : scripted ?? "Baik kak, aku bantu ya.");
    }
    if (u.includes("graph.facebook.com")) {
      calls.graph.push({ url: u, body });
      return ok({ messages: [{ id: `wamid.OUT.${++outgoing}` }] });
    }
    throw new Error(`unexpected fetch to ${u}`);
  });
  return { calls, state };
}

let seq = 0;
/** A shop with its own WhatsApp number, an owner, a cs and a finance user. */
export async function shop() {
  const t = await createTenant();
  const pn = `PN-KIT-${t.institutionId}-${++seq}`;
  const res = await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp", name: "Toko", externalId: pn, accessToken: `EAAG-token-${pn}` });
  assert.equal(res.status, 201);
  return { ...t, pn, from: "6281500000001" };
}

export const agentBody = (over = {}) => ({ name: "Penjualan", description: "Membantu calon pembeli memilih produk", instructions: "Fokus membantu pelanggan menyelesaikan pembelian dengan ramah.", ...over });

export async function addAgent(t, over) {
  const res = await api().post("/api/v1/ai/agents").set(bearer(t.ownerToken)).send(agentBody(over));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}

export async function usePresets(t) {
  const res = await api().post("/api/v1/ai/agents/presets").set(bearer(t.ownerToken));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return Object.fromEntries(res.body.data.map((a) => [a.name, a]));
}

export const inboundBody = (t, text, from = t.from) =>
  JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "W", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: t.pn }, contacts: [{ profile: { name: "Pembeli" }, wa_id: from }], messages: [{ from, id: `wamid.${crypto.randomUUID()}`, type: "text", text: { body: text } }] } }] }] });

/** The customer writes through the real webhook. Resolves when the HTTP call is answered (not when the AI has replied). */
export async function write(t, text, from = t.from) {
  const raw = inboundBody(t, text, from);
  const res = await api().post("/api/v1/webhooks/whatsapp").set("Content-Type", "application/json").set("x-hub-signature-256", signed(raw)).send(raw);
  assert.equal(res.status, 200);
}

const aiReplies = async (t) => Number((await row("SELECT COUNT(*) AS n FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent'", [t.institutionId])).n);

/** The customer writes; resolves when the assistant's answer is stored. */
export async function say(t, text, from = t.from) {
  const before = await aiReplies(t);
  await write(t, text, from);
  await waitFor(async () => (await aiReplies(t)) > before, { timeout: 6000 });
}

export const leadOf = (t, from = t.from) => row("SELECT * FROM leads WHERE institution_id = ? AND phone_number = ?", [t.institutionId, from]);
export const lastReply = (calls) => calls.replies.at(-1);
export const logs = (t) => query("SELECT g.*, a.name AS to_name, b.name AS from_name FROM agent_routing_logs g LEFT JOIN ai_agents a ON a.id = g.to_agent_id LEFT JOIN ai_agents b ON b.id = g.from_agent_id WHERE g.institution_id = ? ORDER BY g.id", [t.institutionId]);
/** What the shop's assistant has said to customers, oldest first. */
export const aiMessages = (t) => query("SELECT * FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent' ORDER BY id", [t.institutionId]);
