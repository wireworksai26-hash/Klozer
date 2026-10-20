import "./setupWhatsapp.js";
import http from "http";
import crypto from "crypto";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, createTenant, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";
import { config } from "../src/config/env.js";
import { runWebhookDeliveries } from "../src/services/integrations/webhookDispatcher.js";
import { verifySignature } from "../src/services/integrations/signing.js";
import { invalidateEndpoints } from "../src/services/integrations/eventBus.js";

const allowBefore = config.webhooks.allowPrivate;
const timeoutBefore = config.webhooks.timeoutMs;
before(async () => {
  await setupDatabase();
  config.webhooks.allowPrivate = true; // the receivers in these tests are on localhost
});
after(async () => {
  config.webhooks.allowPrivate = allowBefore;
  await teardownDatabase();
});
afterEach(() => {
  mock.restoreAll();
  config.webhooks.allowPrivate = true;
  config.webhooks.timeoutMs = timeoutBefore;
});

const asObject = (value) => (typeof value === "string" ? JSON.parse(value) : value);
const row = async (sql, params) => (await query(sql, params))[0];

// ---------------------------------------------------------------- a real receiver on localhost
const receivers = [];
async function receiver(behaviour = () => ({ status: 200 })) {
  const received = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      const entry = { url: req.url, headers: req.headers, raw, json: (() => { try { return JSON.parse(raw); } catch { return null; } })() };
      received.push(entry);
      const out = behaviour(entry, received.length) || { status: 200 };
      if (out.hang) return;
      res.writeHead(out.status ?? 200, out.headers || {}).end(out.body ?? "ok");
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  receivers.push(server);
  return { received, url: `http://127.0.0.1:${server.address().port}/hook`, behaviour, set: (fn) => (behaviour = fn) };
}
after(() => receivers.forEach((s) => (s.closeAllConnections?.(), s.close())));

const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) });

/** Network for the parts of the platform that call out (AI, WhatsApp). The receivers use http, not fetch, so they are not affected. */
function mockOutside() {
  const calls = { graph: [], ai: 0 };
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const u = String(url);
    if (u.includes("integrate.api.nvidia.com")) {
      calls.ai++;
      return ok({ choices: [{ message: { content: "Halo kak, ada yang bisa dibantu?" } }], usage: { prompt_tokens: 100, completion_tokens: 10 } });
    }
    if (u.includes("graph.facebook.com")) {
      const body = typeof opts.body === "string" ? JSON.parse(opts.body) : null;
      calls.graph.push({ url: u, body });
      return ok({ messages: [{ id: `wamid.OUT.${calls.graph.length}` }] });
    }
    throw new Error(`unexpected fetch to ${u}`);
  });
  return calls;
}

let seq = 0;
async function tenantWithNumber() {
  const t = await createTenant();
  const pn = `PN-INT-${t.institutionId}-${++seq}`;
  const res = await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp", name: "Toko", externalId: pn, accessToken: `EAAG-token-${pn}` });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...t, pn, channelId: res.body.data.id };
}

async function addKey(t, scopes, over = {}) {
  const res = await api().post("/api/v1/integrations/api-keys").set(bearer(t.ownerToken)).send({ name: "n8n", scopes, ...over });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { key: res.body.key, id: res.body.data.id };
}
const withKey = (key) => ({ Authorization: `Bearer ${key}` });
const ALL = ["contacts:read", "contacts:write", "messages:read", "messages:send", "orders:read", "orders:write", "products:read"];

async function addWebhook(t, rx, events = ["*"], over = {}) {
  const res = await api().post("/api/v1/integrations/webhooks").set(bearer(t.ownerToken)).send({ name: "n8n", url: rx.url, events, ...over });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { id: res.body.data.id, secret: res.body.secret };
}
/** Events are queued just after the request that caused them returns, so wait until the expected number are in the outbox. */
async function queued(t, count) {
  await waitFor(async () => Number((await row("SELECT COUNT(*) AS n FROM webhook_deliveries WHERE institution_id = ?", [t.institutionId])).n) >= count, { timeout: 4000 });
}
const deliver = async (t, now = new Date(), expect = 0) => {
  if (expect) await queued(t, expect);
  return runWebhookDeliveries({ institutionId: t.institutionId, now });
};
const deliveriesOf = (endpointId) => query("SELECT * FROM webhook_deliveries WHERE endpoint_id = ? ORDER BY id", [endpointId]);
const types = (rx) => rx.received.map((r) => r.json?.type);

const inboundWhatsapp = (t, { from, text, id = `wamid.${crypto.randomUUID()}`, referral }) => {
  const payload = { object: "whatsapp_business_account", entry: [{ id: "W", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: t.pn }, contacts: [{ profile: { name: "Pembeli" }, wa_id: from }], messages: [{ from, id, type: "text", text: { body: text }, ...(referral ? { referral } : {}) }] } }] }] };
  const raw = JSON.stringify(payload);
  const signature = `sha256=${crypto.createHmac("sha256", "test-app-secret").update(raw).digest("hex")}`;
  return api().post("/api/v1/webhooks/whatsapp").set("Content-Type", "application/json").set("x-hub-signature-256", signature).send(raw);
};

describe("API keys", () => {
  test("the key is shown once; only a hash is kept; lists never reveal it", async () => {
    const t = await createTenant();
    const res = await api().post("/api/v1/integrations/api-keys").set(bearer(t.ownerToken)).send({ name: "n8n produksi", scopes: ["contacts:read", "orders:read"] });
    assert.equal(res.status, 201);
    assert.match(res.body.key, /^klz_live_[a-f0-9]{48}$/);
    assert.equal(res.body.data.prefix, res.body.key.slice(0, 15));
    assert.deepEqual(res.body.data.scopes, ["contacts:read", "orders:read"]);

    const stored = await row("SELECT key_hash, key_prefix FROM api_keys WHERE id = ?", [res.body.data.id]);
    assert.equal(stored.key_hash, crypto.createHash("sha256").update(res.body.key).digest("hex"));
    assert.ok(!JSON.stringify(stored).includes(res.body.key));

    const list = await api().get("/api/v1/integrations/api-keys").set(bearer(t.ownerToken));
    assert.ok(!JSON.stringify(list.body).includes(res.body.key));
    assert.ok(!JSON.stringify(list.body).includes(stored.key_hash));
    assert.equal(list.body.data[0].name, "n8n produksi");
    assert.ok(list.body.scopes["orders:write"]);
  });

  test("scopes are validated, only managers manage keys, and tenants never see each other's", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const post = (token, body) => api().post("/api/v1/integrations/api-keys").set(bearer(token)).send(body);
    assert.equal((await post(a.ownerToken, { name: "x", scopes: ["admin:all"] })).status, 400);
    assert.equal((await post(a.ownerToken, { name: "x", scopes: [] })).status, 400);
    assert.equal((await post(a.csToken, { name: "x", scopes: ["contacts:read"] })).status, 403);
    const key = await addKey(a, ["contacts:read"]);
    assert.equal((await api().get("/api/v1/integrations/api-keys").set(bearer(b.ownerToken))).body.data.length, 0);
    assert.equal((await api().delete(`/api/v1/integrations/api-keys/${key.id}`).set(bearer(b.ownerToken))).status, 404);
  });

  test("the package limits how many keys are active, and revoking frees a place", async () => {
    const t = await createTenant();
    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [t.institutionId]);
    const first = await addKey(t, ["contacts:read"]);
    await addKey(t, ["contacts:read"]);
    const third = await api().post("/api/v1/integrations/api-keys").set(bearer(t.ownerToken)).send({ name: "x", scopes: ["contacts:read"] });
    assert.equal(third.status, 409);
    assert.equal(third.body.code, "API_KEY_LIMIT");
    assert.equal((await api().delete(`/api/v1/integrations/api-keys/${first.id}`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().post("/api/v1/integrations/api-keys").set(bearer(t.ownerToken)).send({ name: "x", scopes: ["contacts:read"] })).status, 201);
  });

  test("a request needs a valid key with the right scope; revoked, expired and unknown keys are refused", async () => {
    const t = await createTenant();
    const reader = await addKey(t, ["contacts:read"]);
    assert.equal((await api().get("/api/v1/open/contacts")).body.code, "MISSING_API_KEY");
    assert.equal((await api().get("/api/v1/open/contacts").set(withKey("klz_live_" + "0".repeat(48)))).status, 401);
    assert.equal((await api().get("/api/v1/open/contacts").set(withKey("nonsense"))).status, 401);
    assert.equal((await api().get("/api/v1/open/contacts").set(bearer(t.ownerToken))).status, 401, "a dashboard login is not an API key");

    assert.equal((await api().get("/api/v1/open/contacts").set(withKey(reader.key))).status, 200);
    assert.equal((await api().get("/api/v1/open/contacts").set({ "X-API-Key": reader.key })).status, 200, "the X-API-Key header works too");
    const wrongScope = await api().get("/api/v1/open/orders").set(withKey(reader.key));
    assert.equal(wrongScope.status, 403);
    assert.equal(wrongScope.body.code, "INSUFFICIENT_SCOPE");
    assert.deepEqual(wrongScope.body.details.required, ["orders:read"]);
    assert.equal((await api().post("/api/v1/open/contacts").set(withKey(reader.key)).send({ phone: "081234567890" })).status, 403, "read-only means read-only");

    const used = await row("SELECT last_used_at FROM api_keys WHERE id = ?", [reader.id]);
    assert.ok(used.last_used_at);

    await query("UPDATE api_keys SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE id = ?", [reader.id]);
    assert.equal((await api().get("/api/v1/open/contacts").set(withKey(reader.key))).body.code, "API_KEY_EXPIRED");

    const second = await addKey(t, ["contacts:read"]);
    assert.equal((await api().delete(`/api/v1/integrations/api-keys/${second.id}`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().get("/api/v1/open/contacts").set(withKey(second.key))).status, 401);
  });

  test("a deactivated tenant's keys stop working, and the package can switch API access off", async () => {
    const t = await createTenant();
    const k = await addKey(t, ["contacts:read"]);
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.publicApi', false) WHERE id = ?", [t.institutionId]);
    const off = await api().get("/api/v1/open/contacts").set(withKey(k.key));
    assert.equal(off.status, 403);
    assert.equal(off.body.code, "FEATURE_DISABLED");
    assert.equal((await api().get("/api/v1/integrations/api-keys").set(bearer(t.ownerToken))).status, 403);
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.publicApi', true), is_active = 0 WHERE id = ?", [t.institutionId]);
    assert.equal((await api().get("/api/v1/open/contacts").set(withKey(k.key))).status, 401);
  });

  test("each key has its own request allowance", async () => {
    const t = await createTenant();
    const a = await addKey(t, ["products:read"]);
    const b = await addKey(t, ["products:read"]);
    process.env.TEST_ENABLE_RATE_LIMIT = "1";
    try {
      let limited = 0;
      for (let i = 0; i < 125; i++) if ((await api().get("/api/v1/open/products").set(withKey(a.key))).status === 429) limited++;
      assert.ok(limited >= 3, "the 121st request and later are refused");
      assert.equal((await api().get("/api/v1/open/products").set(withKey(b.key))).status, 200, "another key is unaffected");
    } finally {
      delete process.env.TEST_ENABLE_RATE_LIMIT;
    }
  });
});

describe("public API: contacts and messages", () => {
  test("contacts: create once, fetch, change, filter and page; another tenant's contact is invisible", async () => {
    const t = await tenantWithNumber();
    const other = await tenantWithNumber();
    const key = (await addKey(t, ALL)).key;
    const otherKey = (await addKey(other, ALL)).key;

    const created = await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "0812-3456-7890", name: "Budi Santoso", city: "Solo", notes: "dari n8n" });
    assert.equal(created.status, 201);
    assert.equal(created.body.created, true);
    assert.deepEqual([created.body.data.phone, created.body.data.name, created.body.data.channel_type, created.body.data.source, created.body.data.marketing_consent], ["6281234567890", "Budi Santoso", "whatsapp", "api", "unknown"]);
    const id = created.body.data.id;

    const again = await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "+62 812 3456 7890" });
    assert.deepEqual([again.status, again.body.created, again.body.data.id], [200, false, id], "the same number is the same contact");

    await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "081200000001", name: "Siti" });
    assert.equal((await api().get("/api/v1/open/contacts").query({ search: "Siti" }).set(withKey(key))).body.data.length, 1);
    const page = await api().get("/api/v1/open/contacts").query({ limit: 1 }).set(withKey(key));
    assert.deepEqual([page.body.data.length, page.body.pagination.totalItems], [1, 2]);

    const patched = await api().patch(`/api/v1/open/contacts/${id}`).set(withKey(key)).send({ status: "closing", city: "Surakarta" });
    assert.deepEqual([patched.body.data.status, patched.body.data.city, patched.body.data.name], ["closing", "Surakarta", "Budi Santoso"]);
    assert.equal((await api().patch(`/api/v1/open/contacts/${id}`).set(withKey(key)).send({})).status, 400);
    assert.equal((await api().patch(`/api/v1/open/contacts/${id}`).set(withKey(key)).send({ status: "bogus" })).status, 400);

    assert.equal((await api().get(`/api/v1/open/contacts/${id}`).set(withKey(otherKey))).status, 404);
    assert.equal((await api().patch(`/api/v1/open/contacts/${id}`).set(withKey(otherKey)).send({ name: "x" })).status, 404);
    assert.equal((await api().get("/api/v1/open/contacts").set(withKey(otherKey))).body.data.length, 0);
  });

  test("consent set through the API needs a source and stops everything for an opted-out contact", async () => {
    const t = await tenantWithNumber();
    const key = (await addKey(t, ALL)).key;
    const id = (await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "081200000002" })).body.data.id;
    assert.equal((await api().put(`/api/v1/open/contacts/${id}/consent`).set(withKey(key)).send({ state: "opted_in" })).status, 400);
    assert.equal((await api().put(`/api/v1/open/contacts/${id}/consent`).set(withKey(key)).send({ state: "opted_in", source: "formulir toko" })).status, 200);
    const lead = await row("SELECT marketing_consent, marketing_consent_source FROM leads WHERE id = ?", [id]);
    assert.deepEqual([lead.marketing_consent, lead.marketing_consent_source], ["opted_in", "API: formulir toko"]);
    await api().put(`/api/v1/open/contacts/${id}/consent`).set(withKey(key)).send({ state: "opted_out", source: "minta berhenti" });
    assert.equal((await row("SELECT followup_opt_out FROM leads WHERE id = ?", [id])).followup_opt_out, 1);
  });

  test("a text goes out on the contact's channel and is kept in the conversation; the 24-hour window and opt-out are respected", async () => {
    const t = await tenantWithNumber();
    const calls = mockOutside();
    const key = (await addKey(t, ALL)).key;
    const id = (await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "081200000003", name: "Andi" })).body.data.id;

    const closed = await api().post("/api/v1/open/messages").set(withKey(key)).send({ contactId: id, text: "Halo" });
    assert.equal(closed.status, 409);
    assert.equal(closed.body.code, "WINDOW_CLOSED", "a contact who never wrote has no open window");
    assert.equal(calls.graph.length, 0);

    await query("UPDATE leads SET last_inbound_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
    const sent = await api().post("/api/v1/open/messages").set(withKey(key)).send({ phone: "081200000003", text: "Pesanan kakak sudah dikirim <b>ya</b>" });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.data.delivered, true);
    assert.equal(calls.graph.at(-1).body.text.body, "Pesanan kakak sudah dikirim <b>ya</b>", "text is sent as written");
    assert.ok(calls.graph.at(-1).url.includes(`/${t.pn}/messages`));
    const msg = await row("SELECT sender_type, content_text, meta_json, is_delivered FROM chat_messages WHERE lead_id = ?", [id]);
    assert.deepEqual([msg.sender_type, msg.is_delivered, asObject(msg.meta_json).api.keyId > 0], ["cs", 1, true]);

    await api().put(`/api/v1/open/contacts/${id}/consent`).set(withKey(key)).send({ state: "opted_out", source: "stop" });
    const blocked = await api().post("/api/v1/open/messages").set(withKey(key)).send({ contactId: id, text: "Promo!" });
    assert.equal(blocked.body.code, "OPTED_OUT");
    assert.equal((await api().post("/api/v1/open/messages").set(withKey(key)).send({ contactId: id, text: "Resi: JNE123", transactional: true })).status, 201, "an order notice is allowed");

    assert.equal((await api().post("/api/v1/open/messages").set(withKey(key)).send({ phone: "089999999999", text: "x" })).status, 404);
    assert.equal((await api().post("/api/v1/open/messages").set(withKey(key)).send({ text: "x" })).status, 400);
  });

  test("a retried send with the same Idempotency-Key goes out once", async () => {
    const t = await tenantWithNumber();
    const calls = mockOutside();
    const key = (await addKey(t, ALL)).key;
    const id = (await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "081200000004" })).body.data.id;
    await query("UPDATE leads SET last_inbound_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
    const send = () => api().post("/api/v1/open/messages").set(withKey(key)).set("Idempotency-Key", "retry-key-123").send({ contactId: id, text: "Halo" });
    const [a, b] = await Promise.all([send(), send()]);
    assert.deepEqual([a.status, b.status].sort(), [200, 201]);
    assert.equal((await send()).body.data.duplicate, true);
    assert.equal(calls.graph.filter((c) => c.body.type === "text").length, 1);
    assert.equal((await api().post("/api/v1/open/messages").set(withKey(key)).set("Idempotency-Key", "x").send({ contactId: id, text: "Halo" })).status, 400, "a key must be 8 to 60 safe characters");
  });

  test("history is newest first and pages backwards; internal notes are never included", async () => {
    const t = await tenantWithNumber();
    mockOutside();
    const key = (await addKey(t, ALL)).key;
    const id = (await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "081200000005" })).body.data.id;
    for (let i = 1; i <= 5; i++) await query("INSERT INTO chat_messages (institution_id, lead_id, sender_type, message_type, content_text) VALUES (?, ?, ?, 'text', ?)", [t.institutionId, id, i % 2 ? "customer" : "ai_agent", `pesan ${i}`]);
    await query("INSERT INTO chat_messages (institution_id, lead_id, sender_type, message_type, content_text) VALUES (?, ?, 'system', 'text', 'Dialihkan ke tim')", [t.institutionId, id]);

    const first = await api().get(`/api/v1/open/contacts/${id}/messages`).query({ limit: 2 }).set(withKey(key));
    assert.deepEqual(first.body.data.map((m) => m.text), ["pesan 5", "pesan 4"]);
    assert.deepEqual(first.body.data.map((m) => [m.direction, m.sender]), [["inbound", "customer"], ["outbound", "ai"]]);
    const next = await api().get(`/api/v1/open/contacts/${id}/messages`).query({ limit: 2, before: first.body.next_before }).set(withKey(key));
    assert.deepEqual(next.body.data.map((m) => m.text), ["pesan 3", "pesan 2"]);
    const all = await api().get(`/api/v1/open/contacts/${id}/messages`).set(withKey(key));
    assert.ok(!all.body.data.some((m) => /Dialihkan/.test(m.text)));
    const noScope = await addKey(t, ["contacts:read"]);
    assert.equal((await api().get(`/api/v1/open/contacts/${id}/messages`).set(withKey(noScope.key))).status, 403);
  });
});

describe("public API: templates, orders and products", () => {
  async function approved(t, category = "marketing", name = "promo_api") {
    const components = [{ type: "BODY", text: "Halo {{1}}, ada promo menarik untuk kamu sampai akhir bulan ini ya." }];
    const id = (await query("INSERT INTO message_templates (institution_id, channel_id, name, language, category, status, components_json, body_text, variable_count) VALUES (?, ?, ?, 'id', ?, 'approved', ?, ?, 1)", [t.institutionId, t.channelId, name, category, JSON.stringify(components), components[0].text])).insertId;
    return id;
  }

  test("a template follows the same rules as a campaign: consent, variables, credits", async () => {
    const t = await tenantWithNumber();
    const calls = mockOutside();
    const key = (await addKey(t, ALL)).key;
    const marketing = await approved(t, "marketing", "promo_a");
    const utility = await approved(t, "utility", "info_b");
    const id = (await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "081200000006", name: "Budi" })).body.data.id;
    const send = (body) => api().post("/api/v1/open/messages/template").set(withKey(key)).send({ contactId: id, variables: ["Budi"], ...body });

    assert.equal((await send({ templateId: marketing })).body.code, "NO_MARKETING_CONSENT");
    assert.equal(calls.graph.length, 0);
    await api().put(`/api/v1/open/contacts/${id}/consent`).set(withKey(key)).send({ state: "opted_in", source: "formulir" });
    const sent = await send({ templateId: marketing });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.match(sent.body.data.text, /^Halo Budi, ada promo/);
    assert.deepEqual(calls.graph.at(-1).body.template, { name: "promo_a", language: { code: "id" }, components: [{ type: "body", parameters: [{ type: "text", text: "Budi" }] }] });
    assert.equal(Number((await row("SELECT blast_credits_used AS n FROM institutions WHERE id = ?", [t.institutionId])).n), 1);

    assert.equal((await send({ templateId: marketing, variables: [] })).body.code, "VARIABLE_COUNT");
    assert.equal((await send({ templateId: 999999 })).status, 404);
    await query("UPDATE message_templates SET status = 'paused' WHERE id = ?", [utility]);
    assert.equal((await send({ templateId: utility })).body.code, "TEMPLATE_NOT_APPROVED");
    await query("UPDATE message_templates SET status = 'approved' WHERE id = ?", [utility]);
    await api().put(`/api/v1/open/contacts/${id}/consent`).set(withKey(key)).send({ state: "opted_out", source: "stop" });
    assert.equal((await send({ templateId: utility })).body.code, "OPTED_OUT");
    assert.equal((await send({ templateId: utility, transactional: true })).status, 201, "an order update may go to someone who stopped promotions");
    assert.equal((await send({ templateId: marketing, transactional: true })).body.code, "NO_MARKETING_CONSENT", "but a promotion never may");
    assert.equal(Number((await row("SELECT blast_credits_used AS n FROM institutions WHERE id = ?", [t.institutionId])).n), 2);
  });

  test("orders: created with server-side prices, replayed safely, listed and fetched; stock and tenants are respected", async () => {
    const t = await tenantWithNumber();
    const other = await tenantWithNumber();
    const key = (await addKey(t, ALL)).key;
    const otherKey = (await addKey(other, ALL)).key;
    const product = await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, hpp: 90000, stock: 5 });
    const foreign = await createProduct(other.institutionId, { price: 1000, stock: 5 });

    const products = await api().get("/api/v1/open/products").query({ search: "Kemeja" }).set(withKey(key));
    assert.deepEqual(products.body.data.map((p) => [p.name, p.price, p.stock]), [["Kemeja Batik", 150000, 5]]);
    assert.equal((await api().get("/api/v1/open/products").set(withKey(otherKey))).body.data.find((p) => p.name === "Kemeja Batik"), undefined);

    const body = { phone: "081200000007", name: "Siti", items: [{ productId: product, quantity: 2 }], shippingFee: 15000, paymentMethod: "bank_transfer", notes: "dari n8n", price: 1, total: 1 };
    const res = await api().post("/api/v1/open/orders").set(withKey(key)).set("Idempotency-Key", "order-key-0001").send(body);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual([res.body.data.subtotal, res.body.data.shipping_fee, res.body.data.total, res.body.data.status, res.body.data.created_via], [300000, 15000, 315000, "waiting_payment", "api"]);
    assert.deepEqual(res.body.data.items.map((i) => [i.name, i.quantity, i.unit_price]), [["Kemeja Batik", 2, 150000]]);
    assert.equal(res.body.data.contact.phone, "6281200000007");
    assert.equal(Number((await row("SELECT stock_quantity AS s FROM products WHERE id = ?", [product])).s), 3);

    const replay = await api().post("/api/v1/open/orders").set(withKey(key)).set("Idempotency-Key", "order-key-0001").send(body);
    assert.deepEqual([replay.status, replay.body.replayed, replay.body.data.id], [200, true, res.body.data.id]);
    assert.equal(Number((await row("SELECT stock_quantity AS s FROM products WHERE id = ?", [product])).s), 3, "stock is reserved once");

    const [a, b] = await Promise.all([1, 2].map(() => api().post("/api/v1/open/orders").set(withKey(key)).set("Idempotency-Key", "order-key-0002").send({ ...body, phone: "081200000008" })));
    assert.equal(new Set([a.body.data.id, b.body.data.id]).size, 1, "two simultaneous submissions make one order");

    assert.equal((await api().post("/api/v1/open/orders").set(withKey(key)).send({ ...body, items: [{ productId: product, quantity: 50 }] })).body.code, "INSUFFICIENT_STOCK");
    assert.equal((await api().post("/api/v1/open/orders").set(withKey(key)).send({ ...body, items: [{ productId: foreign, quantity: 1 }] })).status, 400);

    const list = await api().get("/api/v1/open/orders").query({ status: "waiting_payment" }).set(withKey(key));
    assert.equal(list.body.data.length, 2);
    const byNumber = await api().get(`/api/v1/open/orders/${res.body.data.order_number}`).set(withKey(key));
    assert.equal(byNumber.body.data.id, res.body.data.id);
    assert.equal((await api().get(`/api/v1/open/orders/${res.body.data.id}`).set(withKey(otherKey))).status, 404);
    assert.equal((await api().get("/api/v1/open/orders").query({ since: "2999-01-01T00:00:00Z" }).set(withKey(key))).body.data.length, 0);

    const readOnly = await addKey(t, ["orders:read"]);
    assert.equal((await api().post("/api/v1/open/orders").set(withKey(readOnly.key)).send(body)).status, 403);
  });
});

describe("webhook endpoints", () => {
  test("the URL must be public https; the secret is shown once and only its end afterwards", async () => {
    const t = await createTenant();
    config.webhooks.allowPrivate = false;
    const post = (url) => api().post("/api/v1/integrations/webhooks").set(bearer(t.ownerToken)).send({ name: "x", url, events: ["order.paid"] });
    for (const url of ["http://n8n.example.com/hook", "https://localhost/hook", "https://127.0.0.1/hook", "https://169.254.169.254/latest", "https://db.internal/x", "https://user:pw@n8n.example.com/x"]) {
      const res = await post(url);
      assert.equal(res.status, 400, url);
      assert.equal(res.body.code, "INVALID_WEBHOOK_URL", url);
    }
    const good = await post("https://n8n.example.com/webhook/abc");
    assert.equal(good.status, 201);
    assert.match(good.body.secret, /^whsec_[a-f0-9]{48}$/);
    assert.equal(good.body.data.secretHint, `whsec_…${good.body.secret.slice(-4)}`);

    const stored = await row("SELECT encrypted_secret FROM webhook_endpoints WHERE id = ?", [good.body.data.id]);
    assert.ok(!stored.encrypted_secret.includes(good.body.secret), "the secret is encrypted at rest");
    const list = await api().get("/api/v1/integrations/webhooks").set(bearer(t.ownerToken));
    assert.ok(!JSON.stringify(list.body).includes(good.body.secret));
    assert.equal((await api().put(`/api/v1/integrations/webhooks/${good.body.data.id}`).set(bearer(t.ownerToken)).send({ url: "http://evil.example.com" })).status, 400, "editing re-checks the URL");
  });

  test("events must exist; the package limits endpoints; only managers; tenants are separate", async () => {
    const t = await createTenant();
    const rx = await receiver();
    const post = (token, body) => api().post("/api/v1/integrations/webhooks").set(bearer(token)).send({ name: "x", url: rx.url, ...body });
    assert.equal((await post(t.ownerToken, { events: ["order.exploded"] })).body.code, "UNKNOWN_EVENT");
    assert.equal((await post(t.ownerToken, { events: ["ping"] })).status, 400, "ping is not something to subscribe to");
    assert.equal((await post(t.csToken, { events: ["order.paid"] })).status, 403);

    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [t.institutionId]);
    assert.equal((await post(t.ownerToken, { events: ["order.paid"] })).status, 201);
    assert.equal((await post(t.ownerToken, { events: ["*"] })).status, 201);
    const third = await post(t.ownerToken, { events: ["order.paid"] });
    assert.equal(third.status, 409);
    assert.equal(third.body.code, "WEBHOOK_LIMIT");

    const other = await createTenant();
    const id = (await api().get("/api/v1/integrations/webhooks").set(bearer(t.ownerToken))).body.data[0].id;
    assert.equal((await api().get("/api/v1/integrations/webhooks").set(bearer(other.ownerToken))).body.data.length, 0);
    assert.equal((await api().delete(`/api/v1/integrations/webhooks/${id}`).set(bearer(other.ownerToken))).status, 404);
    assert.equal((await api().get(`/api/v1/integrations/webhooks/${id}/deliveries`).set(bearer(other.ownerToken))).status, 404);
    const events = await api().get("/api/v1/integrations/events").set(bearer(t.ownerToken));
    assert.ok(events.body.data.some((e) => e.name === "order.paid") && !events.body.data.some((e) => e.name === "ping"));
  });

  test("rotating the secret makes the old one useless at once", async () => {
    const t = await createTenant();
    const rx = await receiver();
    const hook = await addWebhook(t, rx, ["ping", "order.paid"].filter((e) => e !== "ping"));
    await api().post(`/api/v1/integrations/webhooks/${hook.id}/test`).set(bearer(t.ownerToken));
    assert.equal(verifySignature(hook.secret, rx.received[0].raw, rx.received[0].headers["x-klozer-signature"]), true);

    const rotated = await api().post(`/api/v1/integrations/webhooks/${hook.id}/rotate-secret`).set(bearer(t.ownerToken));
    assert.notEqual(rotated.body.secret, hook.secret);
    await api().post(`/api/v1/integrations/webhooks/${hook.id}/test`).set(bearer(t.ownerToken));
    const second = rx.received[1];
    assert.equal(verifySignature(hook.secret, second.raw, second.headers["x-klozer-signature"]), false, "the old secret no longer matches");
    assert.equal(verifySignature(rotated.body.secret, second.raw, second.headers["x-klozer-signature"]), true);
  });
});

describe("webhook delivery", () => {
  test("an order created through the API is delivered, signed, with the order's own data", async () => {
    const t = await tenantWithNumber();
    const rx = await receiver();
    const hook = await addWebhook(t, rx, ["order.created"]);
    const product = await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, stock: 5 });
    const order = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 2 }], shipping_fee: 10000 });
    assert.equal(order.status, 201);

    const queued = await deliveriesOf(hook.id);
    assert.deepEqual([queued.length, queued[0].status, queued[0].event_type], [1, "pending", "order.created"]);
    assert.equal((await deliver(t)).delivered, 1);

    assert.equal(rx.received.length, 1);
    const r = rx.received[0];
    assert.equal(r.headers["content-type"], "application/json");
    assert.equal(r.headers["x-klozer-event"], "order.created");
    assert.equal(r.headers["x-klozer-attempt"], "1");
    assert.equal(r.headers["x-klozer-event-id"], r.json.id);
    assert.equal(verifySignature(hook.secret, r.raw, r.headers["x-klozer-signature"]), true);
    assert.equal(verifySignature("whsec_wrong", r.raw, r.headers["x-klozer-signature"]), false);

    assert.deepEqual([r.json.type, r.json.institution_id, /^evt_/.test(r.json.id)], ["order.created", t.institutionId, true]);
    assert.deepEqual([r.json.data.order_number, r.json.data.total, r.json.data.currency, r.json.data.created_via], [order.body.data.order_number, 310000, "IDR", "dashboard"]);
    assert.deepEqual(r.json.data.items.map((i) => [i.name, i.quantity, i.unit_price]), [["Kemeja Batik", 2, 150000]]);
    assert.equal((await deliveriesOf(hook.id))[0].status, "delivered");
    assert.equal((await row("SELECT failure_streak, last_success_at FROM webhook_endpoints WHERE id = ?", [hook.id])).last_success_at !== null, true);
  });

  test("payment and status changes are separate events with the right data", async () => {
    const t = await tenantWithNumber();
    mockOutside();
    const rx = await receiver();
    await addWebhook(t, rx, ["order.paid", "order.status_changed", "shipment.updated"]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    const order = (await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] })).body.data;
    await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(t.csToken)).send({ courier_code: "jne", awb_number: "JNE123456789" });
    await deliver(t, new Date(), 3);

    assert.deepEqual(types(rx).sort(), ["order.paid", "order.status_changed", "shipment.updated"]);
    const changed = rx.received.find((r) => r.json.type === "order.status_changed").json.data;
    assert.deepEqual([changed.previous_status, changed.order.status], ["waiting_payment", "paid"]);
    const shipped = rx.received.find((r) => r.json.type === "shipment.updated").json.data;
    assert.deepEqual([shipped.shipment.awb, shipped.shipment.courier], ["JNE123456789", "jne"]);
  });

  test("a customer message, the AI's reply, the new contact and a hand-off each produce an event", async () => {
    const t = await tenantWithNumber();
    mockOutside();
    const rx = await receiver();
    await addWebhook(t, rx, ["message.received", "message.sent", "contact.created", "conversation.handoff"]);

    assert.equal((await inboundWhatsapp(t, { from: "6281300000001", text: "Halo, masih ada stok?" })).status, 200);
    await waitFor(async () => (await query("SELECT id FROM webhook_deliveries WHERE institution_id = ? AND event_type = 'message.sent'", [t.institutionId])).length >= 1);
    await inboundWhatsapp(t, { from: "6281300000001", text: "saya mau komplain barang rusak" });
    await waitFor(async () => (await query("SELECT id FROM webhook_deliveries WHERE institution_id = ? AND event_type = 'conversation.handoff'", [t.institutionId])).length >= 1);
    await deliver(t, new Date(), 6);

    const by = (type) => rx.received.filter((r) => r.json.type === type).map((r) => r.json.data);
    assert.equal(by("contact.created").length, 1);
    assert.deepEqual([by("contact.created")[0].phone, by("contact.created")[0].channel_type], ["6281300000001", "whatsapp"]);
    assert.deepEqual(by("message.received").map((m) => [m.direction, m.sender, m.text]), [["inbound", "customer", "Halo, masih ada stok?"], ["inbound", "customer", "saya mau komplain barang rusak"]]);
    assert.ok(by("message.sent").some((m) => m.sender === "ai" && /Halo kak/.test(m.text)));
    assert.deepEqual([by("conversation.handoff")[0].handled_by, /^keyword:/.test(by("conversation.handoff")[0].reason)], ["human", true]);
  });

  test("an endpoint receives only what it subscribed to; a wildcard gets everything except tests; inactive and other tenants get nothing", async () => {
    const t = await tenantWithNumber();
    const other = await tenantWithNumber();
    mockOutside();
    const paidOnly = await receiver();
    const everything = await receiver();
    const off = await receiver();
    const theirs = await receiver();
    await addWebhook(t, paidOnly, ["order.paid"]);
    await addWebhook(t, everything, ["*"]);
    const disabled = await addWebhook(t, off, ["order.created"]);
    await api().put(`/api/v1/integrations/webhooks/${disabled.id}`).set(bearer(t.ownerToken)).send({ isActive: false });
    await addWebhook(other, theirs, ["*"]);

    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    const order = (await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] })).body.data;
    await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    await queued(t, 4);
    await deliver(t);
    await deliver(other);

    assert.deepEqual(types(paidOnly), ["order.paid"]);
    assert.ok(types(everything).includes("order.created") && types(everything).includes("order.paid") && !types(everything).includes("ping"));
    assert.equal(off.received.length, 0);
    assert.equal(theirs.received.length, 0, "another tenant's events never reach this one");
  });

  test("a failing receiver is retried later with growing waits, then succeeds; the attempt number is sent", async () => {
    const t = await createTenant();
    const rx = await receiver(() => ({ status: 500, body: "down" }));
    const hook = await addWebhook(t, rx, ["order.created"]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });

    const t0 = new Date();
    assert.deepEqual(await deliver(t, t0), { delivered: 0, failed: 1, dropped: 0 });
    let d = (await deliveriesOf(hook.id))[0];
    assert.deepEqual([d.status, d.attempts, d.last_status_code, d.last_error, d.response_excerpt], ["failed", 1, 500, "HTTP 500", "down"]);
    const wait = (new Date(d.next_attempt_at) - t0) / 1000;
    assert.ok(wait > 58 && wait <= 60, `about a minute (${wait}s)`); // the stored time drops the milliseconds

    assert.equal((await deliver(t, new Date(t0.getTime() + 30_000))).failed, 0, "not due yet: nothing is tried");
    assert.equal(rx.received.length, 1);

    rx.set(() => ({ status: 200 }));
    assert.equal((await deliver(t, new Date(t0.getTime() + 61_000))).delivered, 1);
    d = (await deliveriesOf(hook.id))[0];
    assert.deepEqual([d.status, d.attempts, d.last_error], ["delivered", 2, null]);
    assert.equal(rx.received.at(-1).headers["x-klozer-attempt"], "2");
    assert.equal(rx.received[0].json.id, rx.received[1].json.id, "the same event id on every attempt, so the receiver can de-duplicate");
  });

  test("after seven failed attempts a delivery is given up on, and can be replayed by hand", async () => {
    const t = await createTenant();
    const rx = await receiver(() => ({ status: 503 }));
    const hook = await addWebhook(t, rx, ["order.created"]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });

    let clock = new Date();
    for (let i = 0; i < 7; i++) {
      await deliver(t, clock);
      clock = new Date(clock.getTime() + 25 * 3600_000);
    }
    const d = (await deliveriesOf(hook.id))[0];
    assert.deepEqual([d.status, d.attempts, d.next_attempt_at], ["dead", 7, null]);
    assert.equal(rx.received.length, 7);
    assert.equal((await deliver(t, clock)).failed, 0, "nothing more is tried");

    rx.set(() => ({ status: 200 }));
    const retried = await api().post(`/api/v1/integrations/deliveries/${d.id}/retry`).set(bearer(t.ownerToken));
    assert.equal(retried.status, 200);
    assert.equal((await deliver(t)).delivered, 1);
    const detail = await api().get(`/api/v1/integrations/deliveries/${d.id}`).set(bearer(t.ownerToken));
    assert.equal(detail.body.data.status, "delivered");
    assert.equal(detail.body.data.payload.type, "order.created", "the exact data sent is available for debugging");
    const dead = await api().get(`/api/v1/integrations/webhooks/${hook.id}/deliveries`).query({ status: "delivered" }).set(bearer(t.ownerToken));
    assert.equal(dead.body.data.length, 1);
  });

  test("an endpoint that keeps failing is switched off; a 410 Gone switches it off at once", async () => {
    const t = await createTenant();
    const rx = await receiver(() => ({ status: 500 }));
    const hook = await addWebhook(t, rx, ["order.created"]);
    await query("UPDATE webhook_endpoints SET failure_streak = 24 WHERE id = ?", [hook.id]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 50 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    await deliver(t);
    let endpoint = await row("SELECT is_active, disabled_reason FROM webhook_endpoints WHERE id = ?", [hook.id]);
    assert.deepEqual([endpoint.is_active, endpoint.disabled_reason], [0, "25 kegagalan berturut-turut."]);

    invalidateEndpoints(t.institutionId);
    const before = (await deliveriesOf(hook.id)).length;
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    assert.equal((await deliveriesOf(hook.id)).length, before, "events are no longer queued for a switched-off endpoint");

    const reopened = await api().put(`/api/v1/integrations/webhooks/${hook.id}`).set(bearer(t.ownerToken)).send({ isActive: true });
    assert.deepEqual([reopened.body.data.isActive, reopened.body.data.failureStreak, reopened.body.data.disabledReason], [true, 0, null]);

    const gone = await receiver(() => ({ status: 410 }));
    const hook2 = await addWebhook(t, gone, ["order.created"]);
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    await deliver(t);
    endpoint = await row("SELECT is_active, disabled_reason FROM webhook_endpoints WHERE id = ?", [hook2.id]);
    assert.deepEqual([endpoint.is_active, endpoint.disabled_reason], [0, "Penerima membalas 410 Gone."]);
  });

  test("the connection test is sent at once and a failure is final, not retried", async () => {
    const t = await createTenant();
    const rx = await receiver();
    const hook = await addWebhook(t, rx, ["order.paid"]);
    const good = await api().post(`/api/v1/integrations/webhooks/${hook.id}/test`).set(bearer(t.ownerToken));
    assert.equal(good.status, 200);
    assert.equal(rx.received[0].json.type, "ping");
    assert.equal(rx.received[0].headers["x-klozer-event"], "ping");
    assert.equal(verifySignature(hook.secret, rx.received[0].raw, rx.received[0].headers["x-klozer-signature"]), true);

    rx.set(() => ({ status: 404, body: "no such workflow" }));
    const bad = await api().post(`/api/v1/integrations/webhooks/${hook.id}/test`).set(bearer(t.ownerToken));
    assert.equal(bad.status, 502);
    assert.equal(bad.body.data.status, 404);
    const last = (await deliveriesOf(hook.id)).at(-1);
    assert.deepEqual([last.status, last.next_attempt_at, last.response_excerpt], ["dead", null, "no such workflow"]);
  });

  test("two workers at the same moment deliver each event once", async () => {
    const t = await createTenant();
    const rx = await receiver();
    await addWebhook(t, rx, ["order.created"]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 50 });
    for (let i = 0; i < 6; i++) await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    const now = new Date();
    const [a, b] = await Promise.all([deliver(t, now), deliver(t, now)]);
    assert.equal(a.delivered + b.delivered, 6);
    assert.equal(rx.received.length, 6);
    assert.equal(new Set(rx.received.map((r) => r.json.id)).size, 6);
  });

  test("a webhook cannot be turned against the platform: a target that is not public at delivery time is not contacted", async () => {
    const t = await createTenant();
    const rx = await receiver();
    const hook = await addWebhook(t, rx, ["order.created"]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });

    config.webhooks.allowPrivate = false; // as in production
    await deliver(t);
    assert.equal(rx.received.length, 0, "nothing reached the private address");
    const d = (await deliveriesOf(hook.id))[0];
    assert.deepEqual([d.status, d.last_error], ["failed", "Alamat tujuan bukan alamat internet publik."]);
  });

  test("a redirect from the receiver is not followed, and a slow receiver is given up on", async () => {
    const t = await createTenant();
    const redirecting = await receiver(() => ({ status: 302, headers: { Location: "http://169.254.169.254/latest/meta-data" } }));
    const slow = await receiver(() => ({ hang: true }));
    const a = await addWebhook(t, redirecting, ["order.created"]);
    const b = await addWebhook(t, slow, ["order.created"]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    config.webhooks.timeoutMs = 400;
    await deliver(t);
    assert.deepEqual((await deliveriesOf(a.id)).map((d) => [d.status, d.last_status_code]), [["failed", 302]]);
    const timedOut = (await deliveriesOf(b.id))[0];
    assert.equal(timedOut.status, "failed");
    assert.match(timedOut.last_error, /Waktu habis/);
  });

  test("a delivery for an endpoint that was deleted or switched off is dropped, not sent", async () => {
    const t = await createTenant();
    const rx = await receiver();
    const hook = await addWebhook(t, rx, ["order.created"]);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    await api().put(`/api/v1/integrations/webhooks/${hook.id}`).set(bearer(t.ownerToken)).send({ isActive: false });
    const result = await deliver(t);
    assert.deepEqual([result.dropped, rx.received.length], [1, 0]);
    assert.equal((await deliveriesOf(hook.id))[0].status, "dead");
    assert.equal((await api().post(`/api/v1/integrations/deliveries/${(await deliveriesOf(hook.id))[0].id}/retry`).set(bearer(t.ownerToken))).body.code, "ENDPOINT_INACTIVE");
  });

  test("consent and contact changes are reported", async () => {
    const t = await tenantWithNumber();
    const rx = await receiver();
    await addWebhook(t, rx, ["contact.consent_changed", "contact.updated", "contact.created"]);
    const key = (await addKey(t, ALL)).key;
    const id = (await api().post("/api/v1/open/contacts").set(withKey(key)).send({ phone: "081200000009", name: "Budi" })).body.data.id;
    await api().put(`/api/v1/open/contacts/${id}/consent`).set(withKey(key)).send({ state: "opted_out", source: "stop" });
    await api().patch(`/api/v1/open/contacts/${id}`).set(withKey(key)).send({ city: "Solo" });
    await deliver(t, new Date(), 3);
    assert.deepEqual(types(rx).sort(), ["contact.consent_changed", "contact.created", "contact.updated"]);
    const consent = rx.received.find((r) => r.json.type === "contact.consent_changed").json.data;
    assert.deepEqual([consent.state, consent.contact.id, consent.contact.marketing_consent], ["opted_out", id, "opted_out"]);
  });
});
