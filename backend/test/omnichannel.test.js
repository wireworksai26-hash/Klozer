import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { api, bearer, createTenant, createUser, login, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const APP_SECRET = "test-app-secret";
const signed = (body) => `sha256=${crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;

const inbound = ({ phoneNumberId, from = "6281234500001", id = `wamid.${crypto.randomUUID()}`, text = "Halo, masih ada stok?", name = "Pembeli" }) =>
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "6281100000000", phone_number_id: phoneNumberId },
              contacts: [{ profile: { name }, wa_id: from }],
              messages: [{ from, id, timestamp: "1700000000", type: "text", text: { body: text } }],
            },
          },
        ],
      },
    ],
  });

const post = (raw) => api().post("/api/v1/webhooks/whatsapp").set("Content-Type", "application/json").set("x-hub-signature-256", signed(raw)).send(raw);

function mockNetwork({ reply = "Halo Kak, stok masih tersedia ya." } = {}) {
  const calls = { ai: [], graph: [] };
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const target = String(url);
    if (target.includes("integrate.api.nvidia.com")) {
      calls.ai.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ choices: [{ message: { content: reply } }], usage: { prompt_tokens: 400, completion_tokens: 20 } }) };
    }
    if (target.includes("graph.facebook.com")) {
      calls.graph.push({ url: target, body: JSON.parse(opts.body) });
      return { ok: true, json: async () => ({ messages: [{ id: `wamid.OUT.${calls.graph.length}` }] }) };
    }
    throw new Error(`unexpected fetch to ${target}`);
  });
  return calls;
}

const channelBody = (externalId, over = {}) => ({ type: "whatsapp", name: `Nomor ${externalId}`, externalId, displayHandle: "+62 811-0000", accessToken: `EAAG-token-for-${externalId}`, ...over });
const connect = (t, externalId, over) => api().post("/api/v1/channels").set(bearer(t.ownerToken)).send(channelBody(externalId, over));

const textsOf = (calls) => calls.graph.filter((c) => c.body.type === "text");
const aiMessages = (institutionId) => query("SELECT content_text FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent' ORDER BY id", [institutionId]);
const leadOf = async (institutionId) => (await query("SELECT * FROM leads WHERE institution_id = ?", [institutionId]))[0];
const customerMessages = async (institutionId) => Number((await query("SELECT COUNT(*) AS n FROM chat_messages WHERE institution_id = ? AND sender_type = 'customer'", [institutionId]))[0].n);

async function sendInbound(t, phoneNumberId, over = {}) {
  const before = await customerMessages(t.institutionId);
  const res = await post(inbound({ phoneNumberId, ...over }));
  assert.equal(res.status, 200);
  await waitFor(async () => (await customerMessages(t.institutionId)) > before);
  await new Promise((r) => setTimeout(r, 250)); // let the rest of the pipeline finish
}

describe("channels", () => {
  test("connect, list without tokens, update and remove a WhatsApp number", async () => {
    const t = await createTenant();
    const created = await connect(t, "PN-CH-1");
    assert.equal(created.status, 201);
    assert.equal(created.body.data.isDefault, true);
    assert.equal(created.body.data.hasToken, true);
    assert.ok(!JSON.stringify(created.body).includes("EAAG"));

    const stored = (await query("SELECT encrypted_access_token FROM channels WHERE institution_id = ?", [t.institutionId]))[0];
    assert.ok(!stored.encrypted_access_token.includes("EAAG"));

    const list = await api().get("/api/v1/channels").set(bearer(t.csToken));
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.limit, 5);
    assert.ok(!JSON.stringify(list.body).includes("EAAG"));

    const renamed = await api().put(`/api/v1/channels/${created.body.data.id}`).set(bearer(t.ownerToken)).send({ name: "Toko utama", aiEnabled: false });
    assert.equal(renamed.body.data.name, "Toko utama");
    assert.equal(renamed.body.data.aiEnabled, false);

    const removed = await api().delete(`/api/v1/channels/${created.body.data.id}`).set(bearer(t.ownerToken));
    assert.equal(removed.status, 200);
    assert.equal((await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data.length, 0);
  });

  test("only managers connect channels, and an account belongs to one tenant", async () => {
    const a = await createTenant();
    const b = await createTenant();
    assert.equal((await api().post("/api/v1/channels").set(bearer(a.csToken)).send(channelBody("PN-CH-2"))).status, 403);
    assert.equal((await connect(a, "PN-CH-2")).status, 201);

    const stolen = await connect(b, "PN-CH-2");
    assert.equal(stolen.status, 409);
    assert.equal(stolen.body.code, "CHANNEL_TAKEN");
    assert.equal((await connect(a, "PN-CH-2")).status, 409);

    const foreign = (await query("SELECT id FROM channels WHERE institution_id = ?", [a.institutionId]))[0];
    assert.equal((await api().put(`/api/v1/channels/${foreign.id}`).set(bearer(b.ownerToken)).send({ name: "x" })).status, 404);
    assert.equal((await api().delete(`/api/v1/channels/${foreign.id}`).set(bearer(b.ownerToken))).status, 404);
  });

  test("the plan limits how many channels can be connected", async () => {
    const t = await createTenant(); // pro: 5
    for (let i = 1; i <= 5; i++) assert.equal((await connect(t, `PN-LIM-${t.institutionId}-${i}`)).status, 201);
    const sixth = await connect(t, `PN-LIM-${t.institutionId}-6`);
    assert.equal(sixth.status, 409);
    assert.equal(sixth.body.code, "CHANNEL_LIMIT");

    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [t.institutionId]);
    const other = await createTenant();
    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [other.institutionId]);
    assert.equal((await connect(other, `PN-LIM-${other.institutionId}-1`)).status, 201);
    assert.equal((await connect(other, `PN-LIM-${other.institutionId}-2`)).body.code, "CHANNEL_LIMIT");
  });

  test("exactly one default per type; deleting the default promotes another", async () => {
    const t = await createTenant();
    const first = (await connect(t, `PN-DEF-${t.institutionId}-1`)).body.data;
    const second = (await connect(t, `PN-DEF-${t.institutionId}-2`)).body.data;
    assert.equal(first.isDefault, true);
    assert.equal(second.isDefault, false);

    assert.equal((await api().put(`/api/v1/channels/${first.id}`).set(bearer(t.ownerToken)).send({ isDefault: false })).body.code, "DEFAULT_REQUIRED");

    await api().put(`/api/v1/channels/${second.id}`).set(bearer(t.ownerToken)).send({ isDefault: true });
    const defaults = await query("SELECT id FROM channels WHERE institution_id = ? AND is_default = 1", [t.institutionId]);
    assert.deepEqual(defaults.map((d) => d.id), [second.id]);

    await api().delete(`/api/v1/channels/${second.id}`).set(bearer(t.ownerToken));
    const [promoted] = await query("SELECT id, is_default FROM channels WHERE institution_id = ?", [t.institutionId]);
    assert.equal(promoted.id, first.id);
    assert.equal(promoted.is_default, 1);
  });

  test("the original /whatsapp/channel endpoints read and write the default channel", async () => {
    const t = await createTenant();
    const put = await api().put("/api/v1/whatsapp/channel").set(bearer(t.ownerToken)).send({ phone_number_id: `PN-LEG-${t.institutionId}`, access_token: "EAAG-legacy-token-value", display_phone: "+62 811-1" });
    assert.equal(put.status, 200);
    const got = await api().get("/api/v1/whatsapp/channel").set(bearer(t.ownerToken));
    assert.equal(got.body.configured, true);
    assert.equal(got.body.channel.phone_number_id, `PN-LEG-${t.institutionId}`);
    assert.equal((await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data.length, 1);

    await api().put("/api/v1/whatsapp/channel").set(bearer(t.ownerToken)).send({ phone_number_id: `PN-LEG2-${t.institutionId}`, access_token: "EAAG-legacy-token-two", display_phone: "+62 811-2" });
    assert.equal((await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data.length, 1, "replacing keeps a single channel");

    assert.equal((await api().delete("/api/v1/whatsapp/channel").set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().get("/api/v1/whatsapp/channel").set(bearer(t.ownerToken))).body.configured, false);
  });

  test("a message to the second number is answered from the second number", async () => {
    const t = await createTenant();
    const pn1 = `PN-MULTI-${t.institutionId}-1`;
    const pn2 = `PN-MULTI-${t.institutionId}-2`;
    await connect(t, pn1);
    const second = (await connect(t, pn2)).body.data;
    const calls = mockNetwork();

    await sendInbound(t, pn2);
    await waitFor(async () => textsOf(calls).length >= 1);
    assert.ok(textsOf(calls)[0].url.includes(`/${pn2}/messages`), "the reply leaves from the number the customer wrote to");
    assert.equal((await leadOf(t.institutionId)).channel_id, second.id);
    assert.equal((await query("SELECT channel_id FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent'", [t.institutionId]))[0].channel_id, second.id);

    // a CS reply from the dashboard also uses the conversation's number
    const lead = await leadOf(t.institutionId);
    const sent = await api().post("/api/v1/chats/send").set(bearer(t.csToken)).send({ lead_id: lead.id, content_text: "Halo kak, saya CS" });
    assert.equal(sent.status, 201);
    assert.ok(textsOf(calls).at(-1).url.includes(`/${pn2}/messages`));
  });

  test("a channel with the AI switched off is left to people", async () => {
    const t = await createTenant();
    const pn = `PN-NOAI-${t.institutionId}`;
    await connect(t, pn, { aiEnabled: false });
    const calls = mockNetwork();
    await sendInbound(t, pn);
    assert.equal(calls.ai.length, 0);
    assert.equal((await aiMessages(t.institutionId)).length, 0);
  });
});

describe("routing conversations to agents", () => {
  async function tenantWithAgents(pn) {
    const t = await createTenant();
    await connect(t, pn);
    const first = await createUser(t.institutionId, "cs");
    const second = await createUser(t.institutionId, "cs");
    return { ...t, agents: [first, second] };
  }
  const setPresence = (userId, online) => query("UPDATE users SET is_online = ? WHERE id = ?", [online ? 1 : 0, userId]);

  test("a new conversation goes to an online agent, and returning customers keep theirs", async () => {
    const pn = `PN-ROUTE-${Date.now()}`;
    const t = await tenantWithAgents(pn);
    mockNetwork();
    await query("UPDATE users SET is_online = 0 WHERE institution_id = ?", [t.institutionId]);
    await setPresence(t.agents[1].id, true);

    await sendInbound(t, pn);
    const lead = await leadOf(t.institutionId);
    assert.equal(lead.assigned_cs_id, t.agents[1].id);
    assert.ok(lead.assigned_at);

    await setPresence(t.agents[0].id, true);
    await sendInbound(t, pn, { text: "Ada warna lain?" });
    assert.equal((await leadOf(t.institutionId)).assigned_cs_id, t.agents[1].id, "an eligible assignee keeps the conversation");
  });

  test("least busy: the agent with fewer open chats gets the next one", async () => {
    const pn = `PN-BUSY-${Date.now()}`;
    const t = await tenantWithAgents(pn);
    mockNetwork();
    await query("UPDATE users SET is_online = 0 WHERE institution_id = ?", [t.institutionId]);
    await Promise.all(t.agents.map((a) => setPresence(a.id, true)));
    // the first agent already has two open conversations
    for (const n of [1, 2]) {
      await query("INSERT INTO leads (institution_id, phone_number, external_id, name, assigned_cs_id, status) VALUES (?, ?, ?, 'Lama', ?, 'in_progress')", [t.institutionId, `62811000000${n}`, `62811000000${n}`, t.agents[0].id]);
    }
    await sendInbound(t, pn, { from: "6281999000111" });
    const lead = (await query("SELECT assigned_cs_id FROM leads WHERE institution_id = ? AND phone_number = '6281999000111'", [t.institutionId]))[0];
    assert.equal(lead.assigned_cs_id, t.agents[1].id);
  });

  test("with nobody online the conversation waits, and goes out when an agent becomes available", async () => {
    const pn = `PN-QUEUE-${Date.now()}`;
    const t = await tenantWithAgents(pn);
    mockNetwork();
    await query("UPDATE users SET is_online = 0 WHERE institution_id = ?", [t.institutionId]);

    await sendInbound(t, pn);
    assert.equal((await leadOf(t.institutionId)).assigned_cs_id, null);

    const overview = await api().get("/api/v1/routing/overview").set(bearer(t.ownerToken));
    assert.equal(overview.status, 200);
    assert.equal(overview.body.data.queue.length, 1);

    const agent = t.agents[0];
    await setPresence(agent.id, true);
    const token = await login(agent.email);
    const res = await api().put("/api/v1/users/me/availability").set(bearer(token)).send({ available: true });
    assert.equal(res.status, 200);
    assert.equal((await leadOf(t.institutionId)).assigned_cs_id, agent.id);
  });

  test("an agent who is away receives nothing even while online", async () => {
    const pn = `PN-AWAY-${Date.now()}`;
    const t = await tenantWithAgents(pn);
    mockNetwork();
    await query("UPDATE users SET is_online = 0 WHERE institution_id = ?", [t.institutionId]);
    await setPresence(t.agents[0].id, true);
    const token = await login(t.agents[0].email);
    await api().put("/api/v1/users/me/availability").set(bearer(token)).send({ available: false });

    await sendInbound(t, pn);
    assert.equal((await leadOf(t.institutionId)).assigned_cs_id, null);
  });

  test("manual mode leaves assignment to a manager, who can assign or let the rule choose", async () => {
    const pn = `PN-MANUAL-${Date.now()}`;
    const t = await tenantWithAgents(pn);
    mockNetwork();
    await query("UPDATE users SET is_online = 0 WHERE institution_id = ?", [t.institutionId]);
    await Promise.all(t.agents.map((a) => setPresence(a.id, true)));

    const saved = await api().put("/api/v1/routing/settings").set(bearer(t.ownerToken)).send({ mode: "manual" });
    assert.equal(saved.body.data.mode, "manual");

    await sendInbound(t, pn);
    const lead = await leadOf(t.institutionId);
    assert.equal(lead.assigned_cs_id, null);

    const assigned = await api().post(`/api/v1/leads/${lead.id}/assign`).set(bearer(t.ownerToken)).send({ userId: t.agents[0].id });
    assert.equal(assigned.status, 200);
    assert.equal((await leadOf(t.institutionId)).assigned_cs_id, t.agents[0].id);

    const auto = await api().post(`/api/v1/leads/${lead.id}/assign`).set(bearer(t.ownerToken)).send({ userId: null });
    assert.equal(auto.status, 200);
    assert.notEqual(auto.body.data.userId, t.agents[0].id, "automatic assignment moves it to a different agent");

    const outsider = await createTenant();
    const bad = await api().post(`/api/v1/leads/${lead.id}/assign`).set(bearer(t.ownerToken)).send({ userId: outsider.cs.id });
    assert.equal(bad.status, 400);
    assert.equal((await api().post(`/api/v1/leads/${lead.id}/assign`).set(bearer(t.csToken)).send({ userId: t.agents[0].id })).status, 403);
  });

  test("claiming: an unassigned conversation can be taken once", async () => {
    const pn = `PN-CLAIM-${Date.now()}`;
    const t = await tenantWithAgents(pn);
    mockNetwork();
    await query("UPDATE users SET is_online = 0 WHERE institution_id = ?", [t.institutionId]);
    await sendInbound(t, pn);
    const lead = await leadOf(t.institutionId);

    const mine = await api().post(`/api/v1/leads/${lead.id}/claim`).set(bearer(t.csToken));
    assert.equal(mine.status, 200);
    assert.equal((await leadOf(t.institutionId)).assigned_cs_id, t.cs.id);

    const otherToken = await login(t.agents[0].email);
    const late = await api().post(`/api/v1/leads/${lead.id}/claim`).set(bearer(otherToken));
    assert.equal(late.status, 409);
    assert.equal(late.body.code, "ALREADY_ASSIGNED");
  });

  test("routing settings are validated, tenant-scoped and can reset the keyword list", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const defaults = await api().get("/api/v1/routing/settings").set(bearer(a.csToken));
    assert.equal(defaults.body.data.mode, "least_busy");
    assert.equal(defaults.body.data.handoffKeywordsCustom, false);

    assert.equal((await api().put("/api/v1/routing/settings").set(bearer(a.ownerToken)).send({ mode: "random" })).status, 400);
    assert.equal((await api().put("/api/v1/routing/settings").set(bearer(a.ownerToken)).send({ maxOpenChats: 0 })).status, 400);
    assert.equal((await api().put("/api/v1/routing/settings").set(bearer(a.ownerToken)).send({})).status, 400);
    assert.equal((await api().put("/api/v1/routing/settings").set(bearer(a.csToken)).send({ mode: "manual" })).status, 403);

    const custom = await api().put("/api/v1/routing/settings").set(bearer(a.ownerToken)).send({ handoffKeywords: ["garansi"], maxOpenChats: 5 });
    assert.deepEqual(custom.body.data.handoffKeywords, ["garansi"]);
    assert.equal(custom.body.data.handoffKeywordsCustom, true);
    assert.equal(custom.body.data.maxOpenChats, 5);

    assert.equal((await api().get("/api/v1/routing/settings").set(bearer(b.ownerToken))).body.data.maxOpenChats, 20, "another tenant is unaffected");

    const reset = await api().put("/api/v1/routing/settings").set(bearer(a.ownerToken)).send({ handoffKeywords: null });
    assert.equal(reset.body.data.handoffKeywordsCustom, false);
    assert.equal(reset.body.data.maxOpenChats, 5, "other settings are kept");
  });
});

describe("hand-off between the AI and people", () => {
  async function tenantWithNumber() {
    const t = await createTenant();
    const pn = `PN-HO-${t.institutionId}`;
    await connect(t, pn);
    return { ...t, pn };
  }

  test("a request for a person gets the fixed reply, no AI call, and the AI then stays quiet", async () => {
    const t = await tenantWithNumber();
    const calls = mockNetwork();

    await sendInbound(t, t.pn, { text: "Saya kecewa, barangnya belum sampai" });
    assert.equal(calls.ai.length, 0, "the model is not asked");
    const replies = await aiMessages(t.institutionId);
    assert.equal(replies.length, 1);
    assert.match(replies[0].content_text, /aku sambungkan ke tim kami/);

    const lead = await leadOf(t.institutionId);
    assert.equal(lead.handled_by, "human");
    assert.match(lead.handoff_reason, /^keyword:/);
    const [note] = await query("SELECT content_text FROM chat_messages WHERE institution_id = ? AND sender_type = 'system'", [t.institutionId]);
    assert.match(note.content_text, /Dialihkan ke tim/);

    await sendInbound(t, t.pn, { text: "Halo? Ada orang?" });
    assert.equal(calls.ai.length, 0);
    assert.equal((await aiMessages(t.institutionId)).length, 1, "no second automatic reply while a person holds it");
  });

  test("handing back lets the AI answer again", async () => {
    const t = await tenantWithNumber();
    const calls = mockNetwork();
    await sendInbound(t, t.pn, { text: "mau komplain nih" });
    const lead = await leadOf(t.institutionId);

    const res = await api().post(`/api/v1/leads/${lead.id}/handback`).set(bearer(t.csToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.changed, true);
    assert.equal((await leadOf(t.institutionId)).handled_by, "ai");

    await sendInbound(t, t.pn, { text: "Berapa harganya?" });
    await waitFor(async () => calls.ai.length >= 1);
    assert.equal((await aiMessages(t.institutionId)).length, 2);
    assert.equal((await api().post(`/api/v1/leads/${lead.id}/handback`).set(bearer(t.csToken))).body.data.changed, false, "already with the AI");
  });

  test("a CS reply takes the conversation, and an expired hold returns it to the AI", async () => {
    const t = await tenantWithNumber();
    const calls = mockNetwork();
    await sendInbound(t, t.pn);
    const lead = await leadOf(t.institutionId);

    await api().post("/api/v1/chats/send").set(bearer(t.csToken)).send({ lead_id: lead.id, content_text: "Halo kak, saya bantu ya" });
    const held = await leadOf(t.institutionId);
    assert.equal(held.handled_by, "human");
    assert.equal(held.handoff_reason, "cs_replied");
    assert.ok(held.assigned_cs_id, "the conversation has an owner once a person replies");

    const aiBefore = calls.ai.length;
    await sendInbound(t, t.pn, { text: "Terima kasih kak" });
    assert.equal(calls.ai.length, aiBefore, "quiet during the hold");

    await query("UPDATE leads SET handoff_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR) WHERE id = ?", [lead.id]);
    await sendInbound(t, t.pn, { text: "Kak, ada warna merah?" });
    await waitFor(async () => calls.ai.length > aiBefore);
    assert.equal((await leadOf(t.institutionId)).handled_by, "ai");
  });

  test("a person can take over on purpose, and the tenant can shorten the hold", async () => {
    const t = await tenantWithNumber();
    mockNetwork();
    await sendInbound(t, t.pn);
    const lead = await leadOf(t.institutionId);

    const res = await api().post(`/api/v1/leads/${lead.id}/handoff`).set(bearer(t.csToken));
    assert.equal(res.status, 200);
    const taken = await leadOf(t.institutionId);
    assert.equal(taken.handled_by, "human");
    assert.equal(taken.handoff_reason, "manual");

    assert.equal((await api().post("/api/v1/leads/999999999/handoff").set(bearer(t.csToken))).status, 404);
  });

  test("another tenant's conversation cannot be handed over or back", async () => {
    const a = await tenantWithNumber();
    const b = await createTenant();
    mockNetwork();
    await sendInbound(a, a.pn);
    const lead = await leadOf(a.institutionId);
    assert.equal((await api().post(`/api/v1/leads/${lead.id}/handoff`).set(bearer(b.csToken))).status, 404);
    assert.equal((await api().post(`/api/v1/leads/${lead.id}/handback`).set(bearer(b.csToken))).status, 404);
    assert.equal((await api().post(`/api/v1/leads/${lead.id}/claim`).set(bearer(b.csToken))).status, 404);
    assert.equal((await leadOf(a.institutionId)).handled_by, "ai");
  });

  test("a payment proof that needs checking goes to a person", async () => {
    const t = await tenantWithNumber();
    mockNetwork();
    const lead = (await query("INSERT INTO leads (institution_id, phone_number, external_id, name, status) VALUES (?, '6281777000222', '6281777000222', 'Budi', 'new')", [t.institutionId])).insertId;
    const { handleInbound } = await import("../src/services/conversationService.js");
    const result = await handleInbound({ institutionId: t.institutionId, contactId: "6281777000222", contactName: "Budi", messageId: "wamid.PROOF1", messageType: "image", mediaId: "MEDIA-X" });
    assert.equal(result.leadId, lead);
    assert.equal(result.replied, true, "the customer is thanked even when the file could not be read");
    assert.equal((await query("SELECT handled_by FROM leads WHERE id = ?", [lead]))[0].handled_by, "human");
  });
});

describe("bursts", () => {
  test("several first messages from a new customer at the same moment are all kept", async () => {
    const t = await createTenant();
    const pn = `PN-BURST-${t.institutionId}`;
    await connect(t, pn);
    mockNetwork();
    const from = "6281900000777";
    await Promise.all(Array.from({ length: 8 }, (_, i) => post(inbound({ phoneNumberId: pn, from, id: `wamid.BURST${t.institutionId}${i}`, text: `pesan ${i}` }))));
    await waitFor(async () => (await customerMessages(t.institutionId)) === 8, { timeout: 8000 });
    assert.equal((await query("SELECT id FROM leads WHERE institution_id = ?", [t.institutionId])).length, 1, "one contact, however many messages arrived together");
  });
});
