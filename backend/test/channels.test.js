import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { api, bearer, createTenant, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const APP_SECRET = "test-app-secret";
const signed = (body) => `sha256=${crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;
const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json });
const fail = (error) => ({ ok: false, status: 400, headers: { get: () => null }, json: async () => ({ error, ok: false, description: error?.message }) });

/** Routes outgoing HTTP (AI, Meta Graph, Telegram) to fakes and records every call. */
function mockNetwork({ reply = "Halo Kak, stok masih tersedia ya.", profileName = "Siti Aminah", failSubscribe = false, instagramLinked = true, failSetWebhook = false } = {}) {
  const calls = { ai: [], graph: [], telegram: [] };
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const u = String(url);
    const body = typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : opts.body;
    if (u.includes("integrate.api.nvidia.com")) {
      calls.ai.push(body);
      return ok({ choices: [{ message: { content: reply } }], usage: { prompt_tokens: 400, completion_tokens: 20 } });
    }
    if (u.includes("graph.facebook.com")) {
      calls.graph.push({ url: u, method: opts.method || "GET", body });
      const id = u.match(/\/v[\d.]+\/(\d+)[/?]/)?.[1];
      if (u.includes("/subscribed_apps")) return failSubscribe ? fail({ message: "(#200) permission denied" }) : ok({ success: true });
      if (u.includes("instagram_business_account")) return ok({ id, name: "Toko Batik", ...(instagramLinked ? { instagram_business_account: { id: `IG${id}`, username: "toko_batik" } } : {}) });
      if (u.endsWith("/messages")) return ok({ message_id: `m_out_${calls.graph.length}` });
      if (u.includes("?fields=id%2Cname")) return ok({ id, name: "Toko Batik" });
      if (u.includes("?fields=name")) return ok({ name: profileName });
    }
    if (u.includes("api.telegram.org")) {
      const method = u.split("/").pop();
      calls.telegram.push({ method, body });
      if (method === "getMe") return ok({ ok: true, result: { id: Number(u.match(/\/bot(\d+):/)[1]), username: "toko_bot", first_name: "Toko" } });
      if (method === "setWebhook") return failSetWebhook ? fail({ message: "HTTPS url must be provided" }) : ok({ ok: true, result: true });
      if (method === "deleteWebhook") return ok({ ok: true, result: true });
      if (method === "sendMessage") return ok({ ok: true, result: { message_id: 100 + calls.telegram.length } });
    }
    throw new Error(`unexpected fetch to ${u}`);
  });
  return calls;
}

const connect = (t, body) => api().post("/api/v1/channels").set(bearer(t.ownerToken)).send(body);
const metaPost = (payload) => {
  const raw = JSON.stringify(payload);
  return api().post("/api/v1/webhooks/meta").set("Content-Type", "application/json").set("x-hub-signature-256", signed(raw)).send(raw);
};
const messagingEvent = (accountId, object, from, mid, text) => ({ object, entry: [{ id: accountId, messaging: [{ sender: { id: from }, recipient: { id: accountId }, message: { mid, text } }] }] });
const sentTexts = (calls) => calls.graph.filter((c) => c.method === "POST" && c.url.endsWith("/messages")).map((c) => c.body.message.text);
const leadsOf = (institutionId) => query("SELECT * FROM leads WHERE institution_id = ?", [institutionId]);
const messagesOf = (institutionId) => query("SELECT sender_type, content_text, channel_id FROM chat_messages WHERE institution_id = ? ORDER BY id", [institutionId]);
const aiCount = async (institutionId) => (await messagesOf(institutionId)).filter((m) => m.sender_type === "ai_agent").length;
let seq = 0;
const uniqueId = (t) => `${t.institutionId}${String(++seq).padStart(4, "0")}${Date.now() % 100000}`;
const TOKEN = "EAAG-page-access-token-value";
const tgToken = (botId) => `${botId}:AAH-abcdefghijklmnopqrstuvwxyz012345`;

describe("Messenger", () => {
  test("connect reads the page, subscribes it, and never returns the token", async () => {
    const t = await createTenant();
    const pageId = uniqueId(t);
    const calls = mockNetwork();
    const res = await connect(t, { type: "messenger", name: "Messenger toko", pageId, accessToken: TOKEN });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.type, "messenger");
    assert.equal(res.body.data.externalId, pageId);
    assert.equal(res.body.data.displayHandle, "Toko Batik");
    assert.equal(res.body.data.hasToken, true);
    assert.ok(!JSON.stringify(res.body).includes(TOKEN));
    assert.equal(calls.graph.filter((c) => c.url.includes("/subscribed_apps")).length, 1);

    const [stored] = await query("SELECT encrypted_access_token FROM channels WHERE institution_id = ?", [t.institutionId]);
    assert.ok(!stored.encrypted_access_token.includes("EAAG"));
  });

  test("a failed webhook subscription leaves nothing connected", async () => {
    const t = await createTenant();
    mockNetwork({ failSubscribe: true });
    const res = await connect(t, { type: "messenger", name: "Messenger", pageId: uniqueId(t), accessToken: TOKEN });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "CHANNEL_ACTIVATION_FAILED");
    assert.equal((await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data.length, 0);
  });

  test("a customer message is answered on the same page, and the lead has no phone number", async () => {
    const t = await createTenant();
    const pageId = uniqueId(t);
    const calls = mockNetwork({ reply: "*Ready* kak, masih ada 7 pcs ya" });
    await connect(t, { type: "messenger", name: "Messenger", pageId, accessToken: TOKEN });

    const res = await metaPost(messagingEvent(pageId, "page", "5550001", "m_in_1", "Halo, masih ada stok?"));
    assert.equal(res.status, 200);
    await waitFor(async () => (await aiCount(t.institutionId)) === 1);

    const [lead] = await leadsOf(t.institutionId);
    assert.equal(lead.channel_type, "messenger");
    assert.equal(lead.external_id, "5550001");
    assert.equal(lead.phone_number, null);
    assert.equal(lead.source, "messenger");
    assert.deepEqual(sentTexts(calls), ["Ready kak, masih ada 7 pcs ya"], "WhatsApp bold markers are not shown on Messenger");
    assert.ok(calls.graph.find((c) => c.method === "POST" && c.url.endsWith("/messages")).url.includes(`/${pageId}/messages`));
    assert.match(calls.ai[0].messages[0].content, /admin chat Messenger/);

    await waitFor(async () => (await leadsOf(t.institutionId))[0].name === "Siti Aminah");
  });

  test("a CS reply from the dashboard goes out through the conversation's page", async () => {
    const t = await createTenant();
    const pageId = uniqueId(t);
    const calls = mockNetwork();
    await connect(t, { type: "messenger", name: "Messenger", pageId, accessToken: TOKEN });
    await metaPost(messagingEvent(pageId, "page", "5550002", "m_in_2", "Halo"));
    await waitFor(async () => (await aiCount(t.institutionId)) === 1);

    const [lead] = await leadsOf(t.institutionId);
    const sent = await api().post("/api/v1/chats/send").set(bearer(t.csToken)).send({ lead_id: lead.id, content_text: "Halo kak, saya CS" });
    assert.equal(sent.status, 201);
    assert.equal(sentTexts(calls).at(-1), "Halo kak, saya CS");
    assert.ok(calls.graph.at(-1).url.includes(`/${pageId}/messages`));
  });

  test("a retry of the same message id is processed once", async () => {
    const t = await createTenant();
    const pageId = uniqueId(t);
    const calls = mockNetwork();
    await connect(t, { type: "messenger", name: "Messenger", pageId, accessToken: TOKEN });
    const event = messagingEvent(pageId, "page", "5550003", "m_in_dup", "Halo");
    await Promise.all([metaPost(event), metaPost(event), metaPost(event)]);
    await waitFor(async () => (await aiCount(t.institutionId)) >= 1);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await messagesOf(t.institutionId)).filter((m) => m.sender_type === "customer").length, 1);
    assert.equal(calls.ai.length, 1);
  });

  test("unsigned webhooks, unknown pages and echoes do nothing", async () => {
    const t = await createTenant();
    const pageId = uniqueId(t);
    const calls = mockNetwork();
    await connect(t, { type: "messenger", name: "Messenger", pageId, accessToken: TOKEN });

    const raw = JSON.stringify(messagingEvent(pageId, "page", "5550004", "m_in_x", "Halo"));
    assert.equal((await api().post("/api/v1/webhooks/meta").set("Content-Type", "application/json").send(raw)).status, 401);
    assert.equal((await api().post("/api/v1/webhooks/meta").set("Content-Type", "application/json").set("x-hub-signature-256", `sha256=${"0".repeat(64)}`).send(raw)).status, 401);

    await metaPost(messagingEvent("999000111222", "page", "5550004", "m_in_y", "Halo"));
    await metaPost({ object: "page", entry: [{ id: pageId, messaging: [{ sender: { id: pageId }, recipient: { id: "5550004" }, message: { mid: "m_echo", text: "balasan kami", is_echo: true } }] }] });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await messagesOf(t.institutionId)).length, 0);
    assert.equal(calls.ai.length, 0);
  });

  test("the webhook handshake answers with the verify token", async () => {
    const good = await api().get("/api/v1/webhooks/meta").query({ "hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "4242" });
    assert.equal(good.status, 200);
    assert.equal(good.text, "4242");
    assert.equal((await api().get("/api/v1/webhooks/meta").query({ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "4242" })).status, 403);
  });
});

describe("Instagram", () => {
  test("connect uses the Instagram account linked to the page", async () => {
    const t = await createTenant();
    const pageId = uniqueId(t);
    mockNetwork();
    const res = await connect(t, { type: "instagram", name: "Instagram", pageId, accessToken: TOKEN });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.externalId, `IG${pageId}`);
    assert.equal(res.body.data.displayHandle, "@toko_batik");
    assert.equal(res.body.data.config.pageId, pageId);
  });

  test("a page without a linked Instagram account is refused", async () => {
    const t = await createTenant();
    mockNetwork({ instagramLinked: false });
    const res = await connect(t, { type: "instagram", name: "Instagram", pageId: uniqueId(t), accessToken: TOKEN });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Instagram Business/);
  });

  test("a direct message is answered; replies longer than Instagram allows go out in parts", async () => {
    const t = await createTenant();
    const pageId = uniqueId(t);
    const sentence = "Produk ini tersedia dalam beberapa warna dan ukuran, dan bisa dikirim ke seluruh Indonesia. ";
    const calls = mockNetwork({ reply: sentence.repeat(18).trim() });
    await connect(t, { type: "instagram", name: "Instagram", pageId, accessToken: TOKEN });

    await metaPost(messagingEvent(`IG${pageId}`, "instagram", "7770001", "ig_in_1", "Halo kak"));
    await waitFor(async () => (await aiCount(t.institutionId)) === 1);
    await waitFor(async () => sentTexts(calls).length >= 2);

    const parts = sentTexts(calls);
    assert.ok(parts.every((p) => p.length <= 1000), "no part exceeds Instagram's limit");
    assert.ok(parts.join(" ").length >= 1500, "the whole reply is delivered, nothing is cut off");
    assert.ok(calls.graph.filter((c) => c.url.endsWith("/messages")).every((c) => c.url.includes(`/IG${pageId}/messages`)));
    const [lead] = await leadsOf(t.institutionId);
    assert.equal(lead.channel_type, "instagram");
    assert.equal((await messagesOf(t.institutionId)).filter((m) => m.sender_type === "ai_agent").length, 1, "stored once, as one reply");
  });
});

describe("Telegram", () => {
  const botIdFor = (t) => `${7000000 + t.institutionId}${++seq}`.slice(0, 12);

  test("connect registers the webhook with a secret that is never returned", async () => {
    const t = await createTenant();
    const botId = botIdFor(t);
    const calls = mockNetwork();
    const res = await connect(t, { type: "telegram", name: "Bot toko", accessToken: tgToken(botId) });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.externalId, botId);
    assert.equal(res.body.data.displayHandle, "@toko_bot");
    assert.ok(!JSON.stringify(res.body).includes("webhookSecret"));
    assert.ok(!JSON.stringify(res.body).includes("AAH-"));

    const hook = calls.telegram.find((c) => c.method === "setWebhook");
    assert.match(hook.body.url, new RegExp(`/api/v1/webhooks/telegram/${botId}$`));
    const [stored] = await query("SELECT config_json FROM channels WHERE institution_id = ?", [t.institutionId]);
    assert.equal(JSON.parse(stored.config_json).webhookSecret, hook.body.secret_token);
  });

  test("a rejected webhook registration leaves nothing connected", async () => {
    const t = await createTenant();
    mockNetwork({ failSetWebhook: true });
    const res = await connect(t, { type: "telegram", name: "Bot", accessToken: tgToken(botIdFor(t)) });
    assert.equal(res.status, 400);
    assert.equal((await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data.length, 0);
  });

  test("a bot belongs to one tenant, and the second tenant's attempt does not touch its webhook", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const botId = botIdFor(a);
    const calls = mockNetwork();
    assert.equal((await connect(a, { type: "telegram", name: "Bot", accessToken: tgToken(botId) })).status, 201);
    const hooksBefore = calls.telegram.filter((c) => c.method === "setWebhook").length;
    const stolen = await connect(b, { type: "telegram", name: "Bot", accessToken: tgToken(botId) });
    assert.equal(stolen.status, 409);
    assert.equal(stolen.body.code, "CHANNEL_TAKEN");
    assert.equal(calls.telegram.filter((c) => c.method === "setWebhook").length, hooksBefore);
  });

  test("updates need the secret; a valid one is answered through the bot", async () => {
    const t = await createTenant();
    const botId = botIdFor(t);
    const calls = mockNetwork({ reply: "*Ready* kak" });
    await connect(t, { type: "telegram", name: "Bot", accessToken: tgToken(botId) });
    const secret = JSON.parse((await query("SELECT config_json FROM channels WHERE institution_id = ?", [t.institutionId]))[0].config_json).webhookSecret;
    const update = { update_id: 1, message: { message_id: 7, chat: { id: 4242, type: "private" }, from: { id: 4242, first_name: "Budi", is_bot: false }, text: "Ada stok?" } };
    const post = (headers = {}, id = botId) => api().post(`/api/v1/webhooks/telegram/${id}`).set(headers).send(update);

    assert.equal((await post()).status, 401);
    assert.equal((await post({ "x-telegram-bot-api-secret-token": "wrong" })).status, 401);
    assert.equal((await post({ "x-telegram-bot-api-secret-token": secret }, "123123123")).status, 404);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal((await messagesOf(t.institutionId)).length, 0);

    assert.equal((await post({ "x-telegram-bot-api-secret-token": secret })).status, 200);
    await waitFor(async () => (await aiCount(t.institutionId)) === 1);
    const sent = calls.telegram.find((c) => c.method === "sendMessage");
    assert.deepEqual(sent.body, { chat_id: "4242", text: "Ready kak", disable_web_page_preview: true });
    const [lead] = await leadsOf(t.institutionId);
    assert.deepEqual([lead.channel_type, lead.external_id, lead.name], ["telegram", "4242", "Budi"]);
  });

  test("disconnecting the bot removes its webhook", async () => {
    const t = await createTenant();
    const calls = mockNetwork();
    const created = await connect(t, { type: "telegram", name: "Bot", accessToken: tgToken(botIdFor(t)) });
    const removed = await api().delete(`/api/v1/channels/${created.body.data.id}`).set(bearer(t.ownerToken));
    assert.equal(removed.status, 200);
    assert.ok(calls.telegram.some((c) => c.method === "deleteWebhook"));
    assert.equal((await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data.length, 0);
  });
});

describe("web chat", () => {
  async function widget(t, config) {
    const res = await connect(t, { type: "webchat", name: "Website", ...(config ? { config } : {}) });
    assert.equal(res.status, 201);
    return res.body.data;
  }
  const base = (key) => `/api/v1/public/webchat/${key}`;
  const session = (key, token) => api().post(`${base(key)}/session`).set(token ? { Authorization: `Bearer ${token}` } : {}).send({});
  const say = (key, token, text, id = crypto.randomBytes(8).toString("hex")) => api().post(`${base(key)}/messages`).set({ Authorization: `Bearer ${token}` }).send({ text, clientMessageId: id });
  const poll = (key, token, after = 0) => api().get(`${base(key)}/messages`).query({ after }).set({ Authorization: `Bearer ${token}` });

  test("creating a widget gives a public key and an embed snippet, and needs no token", async () => {
    const t = await createTenant();
    const channel = await widget(t, { title: "Halo Toko", color: "#112233" });
    assert.match(channel.externalId, /^wc_[a-f0-9]{24}$/);
    assert.equal(channel.hasToken, false);
    assert.equal(channel.config.title, "Halo Toko");
    assert.match(channel.embedSnippet, new RegExp(`/api/v1/public/webchat/widget.js" data-key="${channel.externalId}"`));
  });

  test("a visitor starts a session, writes, and receives the AI's reply by polling", async () => {
    const t = await createTenant();
    const { externalId: key } = await widget(t);
    mockNetwork({ reply: "*Ready* kak, masih ada ya" });

    const started = await session(key);
    assert.equal(started.status, 200);
    assert.deepEqual(started.body.messages, []);
    assert.equal(started.body.settings.title, "Chat dengan kami");
    const token = started.body.token;

    const sent = await say(key, token, "Halo, ada stok?");
    assert.equal(sent.status, 202);
    await waitFor(async () => (await poll(key, token)).body.messages.length >= 2);

    const { messages } = (await poll(key, token)).body;
    assert.deepEqual(messages.map((m) => [m.from, m.text]), [["visitor", "Halo, ada stok?"], ["agent", "Ready kak, masih ada ya"]]);
    assert.ok(messages.every((m) => Number.isInteger(m.id) && m.at));
    assert.equal((await poll(key, token, messages[1].id)).body.messages.length, 0, "only newer messages are returned");

    const resumed = await session(key, token);
    assert.equal(resumed.body.token, token, "the same visitor keeps their token");
    assert.equal(resumed.body.messages.length, 2, "and sees the conversation again");

    const [lead] = await leadsOf(t.institutionId);
    assert.deepEqual([lead.channel_type, lead.phone_number, lead.source], ["webchat", null, "webchat"]);
  });

  test("visitors cannot read each other's conversations, and tokens are tied to one widget", async () => {
    const t = await createTenant();
    const { externalId: key } = await widget(t);
    const other = await createTenant();
    const { externalId: otherKey } = await widget(other);
    mockNetwork();

    const a = (await session(key)).body.token;
    const b = (await session(key)).body.token;
    await say(key, a, "Pesan rahasia A");
    await waitFor(async () => (await poll(key, a)).body.messages.length >= 1);
    assert.equal((await poll(key, b)).body.messages.length, 0);

    assert.equal((await poll(key, "garbage")).status, 401);
    assert.equal((await poll(key, `${a.split(".")[0]}.${"0".repeat(32)}`)).status, 401);
    assert.equal((await poll(otherKey, a)).status, 401, "a token from one widget is not valid on another");
    assert.equal((await say(key, "garbage", "hai")).status, 401);
    assert.equal((await api().get(`${base(key)}/messages`)).status, 401);
    assert.equal((await api().post(`${base("wc_" + "0".repeat(24))}/session`).send({})).status, 404);
    assert.equal((await api().post(`${base("not-a-key")}/session`).send({})).status, 400);
  });

  test("input is validated and a repeated message id counts once", async () => {
    const t = await createTenant();
    const { externalId: key } = await widget(t);
    mockNetwork();
    const token = (await session(key)).body.token;
    assert.equal((await say(key, token, "   ")).status, 400);
    assert.equal((await say(key, token, "x".repeat(1001))).status, 400);
    assert.equal((await api().post(`${base(key)}/messages`).set({ Authorization: `Bearer ${token}` }).send({ text: "Halo", clientMessageId: "bad id" })).status, 400);

    await say(key, token, "Halo", "samesameid123");
    await say(key, token, "Halo", "samesameid123");
    await waitFor(async () => (await aiCount(t.institutionId)) >= 1);
    await new Promise((r) => setTimeout(r, 250));
    assert.equal((await messagesOf(t.institutionId)).filter((m) => m.sender_type === "customer").length, 1);
  });

  test("markup in a visitor's message is stored as typed, not rewritten", async () => {
    const t = await createTenant();
    const { externalId: key } = await widget(t);
    mockNetwork();
    const token = (await session(key)).body.token;
    await say(key, token, "harga <b>berapa</b> & 2 > 1?");
    await waitFor(async () => (await messagesOf(t.institutionId)).length >= 1);
    assert.equal((await messagesOf(t.institutionId))[0].content_text, "harga <b>berapa</b> & 2 > 1?");
  });

  test("internal notes never reach the visitor; a request for a person gets the fixed reply", async () => {
    const t = await createTenant();
    const { externalId: key } = await widget(t);
    const calls = mockNetwork();
    const token = (await session(key)).body.token;
    await say(key, token, "Saya mau komplain, barang rusak");
    await waitFor(async () => (await poll(key, token)).body.messages.length >= 2);

    assert.equal(calls.ai.length, 0);
    const { messages } = (await poll(key, token)).body;
    assert.match(messages[1].text, /aku sambungkan ke tim kami/);
    assert.equal((await query("SELECT COUNT(*) AS n FROM chat_messages WHERE institution_id = ? AND sender_type = 'system'", [t.institutionId]))[0].n, 1);
    assert.ok(messages.every((m) => !/Dialihkan ke tim/.test(m.text)));
  });

  test("a CS reply from the dashboard reaches the visitor", async () => {
    const t = await createTenant();
    const { externalId: key } = await widget(t);
    mockNetwork();
    const token = (await session(key)).body.token;
    await say(key, token, "Halo");
    await waitFor(async () => (await poll(key, token)).body.messages.length >= 2);

    const [lead] = await leadsOf(t.institutionId);
    const sent = await api().post("/api/v1/chats/send").set(bearer(t.csToken)).send({ lead_id: lead.id, content_text: "Halo, saya Rina dari tim CS" });
    assert.equal(sent.status, 201);
    const { messages } = (await poll(key, token)).body;
    assert.equal(messages.at(-1).text, "Halo, saya Rina dari tim CS");
    assert.equal(messages.at(-1).from, "agent");
  });

  test("any website may call the public routes, but the dashboard API stays restricted", async () => {
    const t = await createTenant();
    const { externalId: key } = await widget(t);
    const origin = "https://tokoanda.example";

    const preflight = await api().options(`${base(key)}/messages`).set({ Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" });
    assert.equal(preflight.headers["access-control-allow-origin"], origin);
    assert.equal(preflight.headers["access-control-allow-credentials"], undefined, "no cookies are involved");
    assert.match(preflight.headers["access-control-allow-headers"], /authorization/i);

    const started = await api().post(`${base(key)}/session`).set("Origin", origin).send({});
    assert.equal(started.headers["access-control-allow-origin"], origin);

    const dashboard = await api().get("/api/v1/channels").set({ ...bearer(t.ownerToken), Origin: origin });
    assert.equal(dashboard.headers["access-control-allow-origin"], undefined);
  });

  test("a widget can be limited to the websites that may embed it", async () => {
    const t = await createTenant();
    const { externalId: key, id } = await widget(t, { allowedOrigins: ["https://toko.id"] });
    const allowed = await api().post(`${base(key)}/session`).set("Origin", "https://toko.id").send({});
    assert.equal(allowed.status, 200);
    const refused = await api().post(`${base(key)}/session`).set("Origin", "https://copycat.example").send({});
    assert.equal(refused.status, 403);

    const widened = await api().put(`/api/v1/channels/${id}`).set(bearer(t.ownerToken)).send({ config: { title: "Baru" } });
    assert.equal(widened.body.data.config.title, "Baru");
    assert.deepEqual(widened.body.data.config.allowedOrigins, ["https://toko.id"], "an edit keeps the settings it did not mention");
    assert.equal(widened.body.data.externalId, key, "the public key does not change");
  });

  test("a switched-off widget stops answering", async () => {
    const t = await createTenant();
    const { externalId: key, id } = await widget(t);
    await api().put(`/api/v1/channels/${id}`).set(bearer(t.ownerToken)).send({ isActive: false });
    assert.equal((await api().post(`${base(key)}/session`).send({})).status, 404);
  });

  test("the widget script is served with the headers that let other sites load it", async () => {
    const res = await api().get("/api/v1/public/webchat/widget.js");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /javascript/);
    assert.equal(res.headers["cross-origin-resource-policy"], "cross-origin");
    assert.match(res.text, /attachShadow/);
    assert.equal(res.text.match(/innerHTML/g).length, 1, "only the static template is HTML; server text goes in with textContent");
  });
});

describe("channel limits and settings across types", () => {
  test("every channel type counts towards the plan limit", async () => {
    const t = await createTenant();
    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [t.institutionId]);
    mockNetwork();
    assert.equal((await connect(t, { type: "webchat", name: "Website" })).status, 201);
    const second = await connect(t, { type: "messenger", name: "Messenger", pageId: uniqueId(t), accessToken: TOKEN });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, "CHANNEL_LIMIT");
  });

  test("a type's required fields are enforced before anything is called", async () => {
    const t = await createTenant();
    const calls = mockNetwork();
    assert.equal((await connect(t, { type: "messenger", name: "Messenger", accessToken: TOKEN })).status, 400);
    assert.equal((await connect(t, { type: "telegram", name: "Bot" })).status, 400);
    assert.equal((await connect(t, { type: "fax", name: "Fax" })).status, 400);
    assert.equal(calls.graph.length + calls.telegram.length, 0);
  });

  test("appearance settings only apply to web chat channels", async () => {
    const t = await createTenant();
    mockNetwork();
    const messenger = (await connect(t, { type: "messenger", name: "Messenger", pageId: uniqueId(t), accessToken: TOKEN })).body.data;
    const res = await api().put(`/api/v1/channels/${messenger.id}`).set(bearer(t.ownerToken)).send({ config: { title: "x" } });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "CONFIG_NOT_SUPPORTED");
  });

  test("testing a channel asks the platform; web chat needs no check", async () => {
    const t = await createTenant();
    mockNetwork();
    const messenger = (await connect(t, { type: "messenger", name: "Messenger", pageId: uniqueId(t), accessToken: TOKEN })).body.data;
    const checked = await api().post(`/api/v1/channels/${messenger.id}/test`).set(bearer(t.ownerToken));
    assert.equal(checked.status, 200);
    assert.equal(checked.body.success, true);
    const web = (await connect(t, { type: "webchat", name: "Website" })).body.data;
    assert.equal((await api().post(`/api/v1/channels/${web.id}/test`).set(bearer(t.ownerToken))).body.success, true);
  });
});
