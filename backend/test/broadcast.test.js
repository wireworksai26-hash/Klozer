import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { api, bearer, createProduct, createTenant, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";
import { runBroadcastTick } from "../src/services/broadcast/broadcastSender.js";
import { retryFailedEvents } from "../src/services/metaCapiService.js";
import { syncDueAccounts } from "../src/services/ads/metaAdsSync.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const APP_SECRET = "test-app-secret";
const signed = (body) => `sha256=${crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;
const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) });
const failure = (status, error) => ({ ok: false, status, headers: { get: () => null }, json: async () => ({ error }), text: async () => JSON.stringify({ error }) });
const webhook = (payload) => {
  const raw = JSON.stringify(payload);
  return api().post("/api/v1/webhooks/whatsapp").set("Content-Type", "application/json").set("x-hub-signature-256", signed(raw)).send(raw);
};
const asObject = (value) => (typeof value === "string" ? JSON.parse(value) : value);
const row = async (sql, params) => (await query(sql, params))[0];

/** A time that is neither night nor too close to now in Jakarta, independent of when the tests run. */
const middayJakarta = (plusDays = 0) => {
  const d = new Date();
  d.setUTCHours(5, 0, 0, 0);
  if (d.getTime() <= Date.now() + 3600_000) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCDate(d.getUTCDate() + plusDays);
  return d;
};

/**
 * Fake network for Meta (WhatsApp sends, template management, ads, conversion events) and the AI.
 * `state` is shared and editable: tests change how the fake behaves between calls.
 */
function mockMeta(state = {}) {
  const calls = { templates: [], texts: [], create: [], del: [], listed: 0, capi: [], insights: [], ai: [] };
  state.remoteTemplates ??= [];
  state.insightPages ??= [[]];
  state.currency ??= "IDR";
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || "GET";
    const body = typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : opts.body;
    if (u.includes("integrate.api.nvidia.com")) {
      calls.ai.push(body);
      return ok({ choices: [{ message: { content: "Halo kak." } }], usage: { prompt_tokens: 100, completion_tokens: 10 } });
    }
    if (!u.includes("graph.facebook.com")) throw new Error(`unexpected fetch to ${u}`);

    if (method === "POST" && u.endsWith("/messages")) {
      if (body.type === "template") {
        calls.templates.push({ url: u, body });
        const n = calls.templates.length;
        const outcome = state.sendResult?.(body, n);
        if (outcome?.error) return failure(outcome.status ?? 400, outcome.error);
        return ok({ messages: [{ id: `wamid.TPL.${n}.${body.to}` }] });
      }
      calls.texts.push({ url: u, body });
      return ok({ messages: [{ id: `wamid.TXT.${calls.texts.length}` }] });
    }
    if (u.includes("/message_templates")) {
      if (method === "GET") {
        calls.listed++;
        const url2 = new URL(u);
        const page = Number(url2.searchParams.get("page") || 0);
        const all = state.remoteTemplates;
        const slice = all.slice(page * 2, page * 2 + 2);
        const more = (page + 1) * 2 < all.length;
        return ok({ data: slice, ...(more ? { paging: { next: `${u.split("&page=")[0]}&page=${page + 1}` } } : {}) });
      }
      if (method === "POST") {
        calls.create.push(body);
        if (state.rejectCreate) return failure(400, { message: "Invalid parameter", error_user_msg: "Templat melanggar kebijakan." });
        return ok({ id: `META-${calls.create.length}`, status: "PENDING", category: body.category });
      }
      if (method === "DELETE") {
        calls.del.push(u);
        return state.rejectDelete ? failure(400, { message: "nope" }) : ok({ success: true });
      }
    }
    if (u.includes("/act_") && u.includes("fields=currency")) return ok({ currency: state.currency });
    if (u.includes("/act_") && u.includes("/insights")) {
      calls.insights.push(u);
      if (state.insightsFail) return failure(400, { message: "Invalid OAuth access token" });
      const page = Number(new URL(u).searchParams.get("page") || 0);
      const rows = state.insightPages[page] || [];
      const more = page + 1 < state.insightPages.length;
      return ok({ data: rows, ...(more ? { paging: { next: `${u.split("&page=")[0]}&page=${page + 1}` } } : {}) });
    }
    if (method === "POST" && u.endsWith("/events")) {
      calls.capi.push({ url: u, body });
      return state.capiFail ? failure(500, { message: "temporarily unavailable" }) : ok({ events_received: 1 });
    }
    throw new Error(`unexpected graph call ${method} ${u}`);
  });
  return { calls, state };
}

const body = (n) => ({ type: "BODY", text: `Halo {{1}}, promo ${n} hanya untuk kamu sampai akhir bulan ini ya.` });
const remote = (name, over = {}) => ({ id: `R-${name}`, name, language: "id", status: "APPROVED", category: "MARKETING", components: [body(name)], ...over });

let seq = 0;
async function shop({ credits, settings } = {}) {
  const t = await createTenant();
  const pn = `PN-BC-${t.institutionId}-${++seq}`;
  const waba = `9${t.institutionId}${String(seq).padStart(6, "0")}`;
  const connected = await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp", name: "Toko", externalId: pn, accessToken: `EAAG-token-${pn}`, wabaId: waba });
  assert.equal(connected.status, 201, JSON.stringify(connected.body));
  if (credits !== undefined) await query("UPDATE institutions SET blast_credit_quota = ?, blast_credits_used = 0 WHERE id = ?", [credits, t.institutionId]);
  if (settings) await api().put("/api/v1/broadcast/settings").set(bearer(t.ownerToken)).send(settings);
  return { ...t, pn, waba, channelId: connected.body.data.id };
}

/** An approved marketing template with one variable, taken from Meta's list. */
async function approvedTemplate(t, meta, name = "promo_maret", over = {}) {
  meta.state.remoteTemplates = [...meta.state.remoteTemplates.filter((x) => x.name !== name), remote(name, over)]; // what Meta lists keeps growing
  const res = await api().post("/api/v1/broadcast/templates/sync").set(bearer(t.ownerToken)).send({ channelId: t.channelId });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return row("SELECT * FROM message_templates WHERE channel_id = ? AND name = ?", [t.channelId, name]);
}

let phoneSeq = 0;
/** A WhatsApp contact; `consent` as the contact's marketing consent. */
async function contact(t, { consent = "opted_in", name = "Budi Santoso", city = "Solo", status = "new", lastContact = null, source = "whatsapp" } = {}) {
  const phone = `62812${String(t.institutionId).padStart(3, "0")}${String(++phoneSeq).padStart(5, "0")}`;
  const result = await query(
    "INSERT INTO leads (institution_id, channel_id, channel_type, external_id, phone_number, name, city, status, source, marketing_consent, last_contacted_at) VALUES (?, ?, 'whatsapp', ?, ?, ?, ?, ?, ?, ?, ?)",
    [t.institutionId, t.channelId, phone, phone, name, city, status, source, consent, lastContact]
  );
  return { id: result.insertId, phone };
}

const variables = [{ type: "field", field: "first_name", fallback: "Kak" }];
async function campaign(t, templateId, over = {}) {
  const res = await api().post("/api/v1/broadcast/campaigns").set(bearer(t.ownerToken)).send({ name: "Promo Maret", channelId: t.channelId, templateId, variables, ...over });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}
const launch = (t, id, bodyJson = {}) => api().post(`/api/v1/broadcast/campaigns/${id}/launch`).set(bearer(t.ownerToken)).send(bodyJson);
const recipientsOf = (id) => query("SELECT * FROM broadcast_recipients WHERE campaign_id = ? ORDER BY id", [id]);
const statusOf = async (id) => (await row("SELECT status, pause_reason, backoff_until FROM broadcast_campaigns WHERE id = ?", [id]));
const creditsUsed = async (t) => Number((await row("SELECT blast_credits_used AS n FROM institutions WHERE id = ?", [t.institutionId])).n);
const countBy = (rows, key = "status") => rows.reduce((a, r) => ({ ...a, [r[key]]: (a[r[key]] || 0) + 1 }), {});

describe("templates", () => {
  test("a template is validated, submitted to Meta and kept as pending", async () => {
    const t = await shop();
    const meta = mockMeta();
    const input = { channelId: t.channelId, name: "promo_baru", language: "id", category: "marketing", body: "Halo {{1}}, ada promo menarik untuk kamu sampai akhir bulan ini ya.", bodyExamples: ["Budi"], footer: "Balas STOP untuk berhenti" };
    const res = await api().post("/api/v1/broadcast/templates").set(bearer(t.ownerToken)).send(input);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.status, "pending");
    assert.equal(res.body.data.variableCount, 1);
    assert.equal(meta.calls.create.length, 1);
    assert.deepEqual([meta.calls.create[0].name, meta.calls.create[0].language, meta.calls.create[0].category], ["promo_baru", "id", "MARKETING"]);
    assert.deepEqual(meta.calls.create[0].components[0].example, { body_text: [["Budi"]] });
    assert.ok(meta.calls.listed === 0);

    assert.equal((await api().post("/api/v1/broadcast/templates").set(bearer(t.ownerToken)).send(input)).status, 409, "the same name and language twice");
  });

  test("a template Meta would reject is refused here first, without calling Meta", async () => {
    const t = await shop();
    const meta = mockMeta();
    const res = await api().post("/api/v1/broadcast/templates").set(bearer(t.ownerToken)).send({ channelId: t.channelId, name: "promo", language: "id", category: "marketing", body: "{{1}} di awal dan akhir {{2}}", bodyExamples: ["a"] });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "TEMPLATE_INVALID");
    assert.ok(res.body.details.length >= 2);
    assert.equal(meta.calls.create.length, 0);
  });

  test("Meta's own refusal is shown in plain words and nothing is saved", async () => {
    const t = await shop();
    mockMeta({ rejectCreate: true });
    const res = await api().post("/api/v1/broadcast/templates").set(bearer(t.ownerToken)).send({ channelId: t.channelId, name: "promo_x", language: "id", category: "utility", body: "Pesanan kamu sudah kami terima dan sedang disiapkan oleh tim kami." });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /melanggar kebijakan/);
    assert.equal((await query("SELECT id FROM message_templates WHERE channel_id = ?", [t.channelId])).length, 0);
  });

  test("without the WhatsApp Business Account id the owner is told what to fill in", async () => {
    const t = await createTenant();
    const pn = `PN-NOWABA-${t.institutionId}`;
    const channel = (await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp", name: "Toko", externalId: pn, accessToken: "EAAG-token-value-123" })).body.data;
    mockMeta();
    const res = await api().post("/api/v1/broadcast/templates/sync").set(bearer(t.ownerToken)).send({ channelId: channel.id });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "WABA_REQUIRED");

    const set = await api().put(`/api/v1/channels/${channel.id}`).set(bearer(t.ownerToken)).send({ wabaId: "123456789012" });
    assert.equal(set.status, 200);
    assert.equal(set.body.data.config.wabaId, "123456789012");
    assert.equal((await api().put(`/api/v1/channels/${channel.id}`).set(bearer(t.ownerToken)).send({ wabaId: "abc" })).status, 400);
  });

  test("syncing pulls Meta's templates across pages, updates statuses, and disables the ones that vanished", async () => {
    const t = await shop();
    const meta = mockMeta({ remoteTemplates: [remote("satu"), remote("dua", { status: "PENDING" }), remote("tiga", { status: "REJECTED", rejected_reason: "INVALID_FORMAT" }), remote("empat", { category: "UTILITY" })] });
    const first = await api().post("/api/v1/broadcast/templates/sync").set(bearer(t.ownerToken)).send({ channelId: t.channelId });
    assert.deepEqual(first.body.data, { added: 4, updated: 0, disabled: 0 });
    assert.equal(meta.calls.listed, 2, "two pages of two");

    const list = await api().get("/api/v1/broadcast/templates").set(bearer(t.ownerToken));
    const byName = Object.fromEntries(list.body.data.map((x) => [x.name, x]));
    assert.deepEqual([byName.satu.status, byName.dua.status, byName.tres?.status, byName.tiga.status, byName.tiga.rejectedReason, byName.empat.category], ["approved", "pending", undefined, "rejected", "INVALID_FORMAT", "utility"]);
    assert.equal(byName.satu.variableCount, 1);

    meta.state.remoteTemplates = [remote("satu"), remote("dua", { status: "APPROVED" })];
    const second = await api().post("/api/v1/broadcast/templates/sync").set(bearer(t.ownerToken)).send({ channelId: t.channelId });
    assert.deepEqual(second.body.data, { added: 0, updated: 2, disabled: 2 });
    const after = (await api().get("/api/v1/broadcast/templates").query({ status: "approved" }).set(bearer(t.ownerToken))).body.data;
    assert.deepEqual(after.map((x) => x.name).sort(), ["dua", "satu"]);
  });

  test("Meta's review result arrives by webhook, only for the account it belongs to", async () => {
    const t = await shop();
    const other = await shop();
    const meta = mockMeta({ remoteTemplates: [remote("promo", { status: "PENDING", id: "900" })] });
    await api().post("/api/v1/broadcast/templates/sync").set(bearer(t.ownerToken)).send({ channelId: t.channelId });
    meta.state.remoteTemplates = [remote("promo", { status: "PENDING", id: "901" })];
    await api().post("/api/v1/broadcast/templates/sync").set(bearer(other.ownerToken)).send({ channelId: other.channelId });

    const event = (waba, over) => ({ object: "whatsapp_business_account", entry: [{ id: waba, changes: [{ field: "message_template_status_update", value: { event: "APPROVED", message_template_id: 900, message_template_name: "promo", message_template_language: "id", ...over } }] }] });
    await webhook(event(t.waba, {}));
    await waitFor(async () => (await row("SELECT status FROM message_templates WHERE channel_id = ?", [t.channelId])).status === "approved");
    assert.equal((await row("SELECT status FROM message_templates WHERE channel_id = ?", [other.channelId])).status, "pending", "another account's template is untouched");

    await webhook(event(t.waba, { event: "REJECTED", reason: "ABUSIVE_CONTENT" }));
    await waitFor(async () => (await row("SELECT status FROM message_templates WHERE channel_id = ?", [t.channelId])).status === "rejected");
    assert.equal((await row("SELECT rejected_reason FROM message_templates WHERE channel_id = ?", [t.channelId])).rejected_reason, "ABUSIVE_CONTENT");

    await webhook(event("000000", {}));
    await new Promise((r) => setTimeout(r, 200));
    assert.equal((await row("SELECT status FROM message_templates WHERE channel_id = ?", [t.channelId])).status, "rejected", "an unknown account changes nothing");
  });

  test("deleting removes it at Meta too, and is refused while a campaign still uses it", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const c = await campaign(t, template.id);
    await launch(t, c.id, { scheduledAt: new Date(Date.now() + 86_400_000).toISOString() });
    const blocked = await api().delete(`/api/v1/broadcast/templates/${template.id}`).set(bearer(t.ownerToken));
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, "TEMPLATE_IN_USE");

    await api().post(`/api/v1/broadcast/campaigns/${c.id}/cancel`).set(bearer(t.ownerToken));
    const removed = await api().delete(`/api/v1/broadcast/templates/${template.id}`).set(bearer(t.ownerToken));
    assert.equal(removed.status, 200);
    assert.equal(meta.calls.del.length, 1);
    assert.match(meta.calls.del[0], /name=promo_maret/);
    assert.equal((await row("SELECT status FROM message_templates WHERE id = ?", [template.id])).status, "disabled", "kept for the history of the finished campaign");
  });

  test("only managers use templates, and tenants never see each other's", async () => {
    const a = await shop();
    const b = await shop();
    const meta = mockMeta();
    await approvedTemplate(a, meta);
    assert.equal((await api().get("/api/v1/broadcast/templates").set(bearer(a.csToken))).status, 403);
    assert.equal((await api().get("/api/v1/broadcast/templates").set(bearer(b.ownerToken))).body.data.length, 0);
    const id = (await row("SELECT id FROM message_templates WHERE channel_id = ?", [a.channelId])).id;
    assert.equal((await api().get(`/api/v1/broadcast/templates/${id}`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await api().delete(`/api/v1/broadcast/templates/${id}`).set(bearer(b.ownerToken))).status, 404);
  });

  test("the package can switch broadcasts off", async () => {
    const t = await shop();
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.csBlast', false) WHERE id = ?", [t.institutionId]);
    const res = await api().get("/api/v1/broadcast/templates").set(bearer(t.ownerToken));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "FEATURE_DISABLED");
  });
});

describe("consent", () => {
  test("staff record a decision; opting out drops the contact from campaigns not yet sent", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const a = await contact(t);
    const b = await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id, { scheduledAt: new Date(Date.now() + 86_400_000).toISOString() });
    // freeze the list as a start would, then one of them opts out
    await query("INSERT INTO broadcast_recipients (campaign_id, institution_id, lead_id, phone, variables_json) VALUES (?, ?, ?, ?, '[\"Budi\"]'), (?, ?, ?, ?, '[\"Budi\"]')", [c.id, t.institutionId, a.id, a.phone, c.id, t.institutionId, b.id, b.phone]);

    const res = await api().put(`/api/v1/leads/${a.id}/consent`).set(bearer(t.csToken)).send({ state: "opted_out", source: "minta berhenti lewat telepon" });
    assert.equal(res.status, 200);
    const lead = await row("SELECT marketing_consent, marketing_consent_source, followup_opt_out FROM leads WHERE id = ?", [a.id]);
    assert.deepEqual([lead.marketing_consent, lead.marketing_consent_source, lead.followup_opt_out], ["opted_out", "minta berhenti lewat telepon", 1]);
    const rs = await recipientsOf(c.id);
    assert.deepEqual(rs.map((r) => [r.lead_id === a.id, r.status]), [[true, "skipped"], [false, "pending"]]);

    const other = await shop();
    assert.equal((await api().put(`/api/v1/leads/${b.id}/consent`).set(bearer(other.csToken)).send({ state: "opted_in" })).status, 404);
  });

  test("a customer who writes 'stop' is opted out of promotions and reminders, and told so", async () => {
    const t = await shop();
    const meta = mockMeta();
    const lead = await contact(t, { consent: "opted_in" });
    const payload = { object: "whatsapp_business_account", entry: [{ id: "W", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: t.pn }, contacts: [{ profile: { name: "Budi" }, wa_id: lead.phone }], messages: [{ from: lead.phone, id: `wamid.STOP.${t.institutionId}`, type: "text", text: { body: "stop jangan kirim promo lagi" } }] } }] }] };
    assert.equal((await webhook(payload)).status, 200);
    const replies = () => meta.calls.texts.filter((c) => c.body.type === "text"); // read receipts go to the same endpoint
    await waitFor(async () => replies().length >= 1);
    assert.match(replies()[0].body.text.body, /tidak akan mengirim pengingat lagi, termasuk promo/);
    const after = await row("SELECT marketing_consent, followup_opt_out FROM leads WHERE id = ?", [lead.id]);
    assert.deepEqual([after.marketing_consent, after.followup_opt_out], ["opted_out", 1]);
    assert.equal(meta.calls.ai.length, 0, "no model call for a stop request");
  });

  test("importing a consent list needs an attestation and a source; known numbers are updated, new ones become contacts", async () => {
    const t = await shop();
    const known = await contact(t, { consent: "unknown" });
    const url = "/api/v1/broadcast/consent/import";
    const send = (over) => api().post(url).set(bearer(t.ownerToken)).send({ phones: [known.phone, "081299900011", "+62 812-9990-0011", "bukan nomor"], source: "formulir pendaftaran Oktober", attested: true, ...over });

    assert.equal((await send({ attested: undefined })).body.code, "ATTESTATION_REQUIRED");
    assert.equal((await send({ source: " " })).status, 400);
    const res = await send({});
    assert.deepEqual(res.body.data, { updated: 1, created: 1, invalid: 1 });
    assert.equal((await row("SELECT marketing_consent FROM leads WHERE id = ?", [known.id])).marketing_consent, "opted_in");
    const created = await row("SELECT marketing_consent, source, marketing_consent_source FROM leads WHERE institution_id = ? AND phone_number = '6281299900011'", [t.institutionId]);
    assert.deepEqual([created.marketing_consent, created.source, created.marketing_consent_source], ["opted_in", "import", "formulir pendaftaran Oktober"]);

    const summary = await api().get("/api/v1/broadcast/consent/summary").set(bearer(t.ownerToken));
    assert.deepEqual(summary.body.data, { unknown: 0, opted_in: 2, opted_out: 0 });
    const optOut = await api().post(url).set(bearer(t.ownerToken)).send({ phones: [known.phone], state: "opted_out", source: "daftar berhenti" });
    assert.equal(optOut.body.data.updated, 1, "opting people out needs no attestation");
  });
});

describe("audience", () => {
  async function previewFor(t, template, audience = {}) {
    const res = await api().post("/api/v1/broadcast/audience/preview").set(bearer(t.ownerToken)).send({ channelId: t.channelId, templateId: template.id, audience });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.data;
  }

  test("a marketing template reaches only contacts who opted in, never anyone who opted out", async () => {
    const t = await shop();
    const meta = mockMeta();
    const marketing = await approvedTemplate(t, meta, "promo_a");
    const utility = await approvedTemplate(t, meta, "info_b", { category: "UTILITY" });
    await contact(t, { consent: "opted_in" });
    await contact(t, { consent: "opted_in" });
    await contact(t, { consent: "unknown" });
    await contact(t, { consent: "opted_out" });

    const m = await previewFor(t, marketing);
    assert.equal(m.count, 2);
    assert.equal(m.matchingFilterBeforeConsent, 3, "the owner is shown how many the consent rule is holding back");
    assert.equal((await previewFor(t, utility)).count, 3, "an order update can go to contacts who never said yes to promotions, but not to opted-out ones");
    assert.ok(m.sample.every((s) => /^\d{5}\*\*\*\*\d{3}$/.test(s.phone)), "phones are masked in the preview");
    assert.equal(m.metaCost.category, "marketing");
    assert.equal(m.metaCost.total, Math.round(586.33 * 2), "the owner sees roughly what Meta will charge");
    assert.equal((await previewFor(t, utility)).metaCost.perMessage, 356.65);
  });

  test("filters narrow the audience", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const old = await contact(t, { status: "idle", city: "Solo", lastContact: new Date(Date.now() - 40 * 86_400_000) });
    await contact(t, { status: "new", city: "Jakarta", lastContact: new Date() });
    await contact(t, { status: "closing", city: "Solo", lastContact: new Date(), source: "meta_ads" });
    const buyer = await contact(t, { status: "repeat", city: "Solo", lastContact: new Date() });
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    const order = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: buyer.id, items: [{ product_id: product, quantity: 1 }] });
    await api().patch(`/api/v1/orders/${order.body.data.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    const label = (await query("INSERT INTO lead_labels (institution_id, name) VALUES (?, 'VIP')", [t.institutionId])).insertId;
    await query("INSERT INTO leads_labels_map (lead_id, label_id) VALUES (?, ?)", [buyer.id, label]);

    const n = async (audience) => (await previewFor(t, template, audience)).count;
    assert.equal(await n({}), 4);
    assert.equal(await n({ statuses: ["idle"] }), 1);
    assert.equal(await n({ cities: ["Solo"] }), 3);
    assert.equal(await n({ sources: ["meta_ads"] }), 1);
    assert.equal(await n({ quietForDays: 30 }), 1);
    assert.equal(await n({ activeWithinDays: 7 }), 3);
    assert.equal(await n({ orders: "never" }), 3);
    assert.equal(await n({ orders: "has_paid_order" }), 1);
    assert.equal(await n({ labelIds: [label] }), 1);
    assert.equal(await n({ statuses: ["new", "idle"], cities: ["Solo"] }), 1);
    assert.equal(old.id > 0, true);
  });

  test("contacts of another number are left out unless the owner says otherwise, and tenants never mix", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    await contact(t);
    const elsewhere = await contact(t);
    const second = (await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp", name: "Nomor 2", externalId: `PN-BC2-${t.institutionId}`, accessToken: "EAAG-token-second-123" })).body.data;
    await query("UPDATE leads SET channel_id = ? WHERE id = ?", [second.id, elsewhere.id]);
    assert.equal((await previewFor(t, template)).count, 1);
    assert.equal((await previewFor(t, template, { onlyThisNumber: false })).count, 2);

    const other = await shop();
    await contact(other);
    assert.equal((await previewFor(t, template, { onlyThisNumber: false })).count, 2, "the other tenant's contact is not counted");
  });
});

describe("campaigns", () => {
  test("setup mistakes are caught when the campaign is created", async () => {
    const t = await shop();
    const meta = mockMeta();
    const approved = await approvedTemplate(t, meta);
    const pending = await approvedTemplate(t, meta, "belum_ok", { status: "PENDING" });
    const image = await approvedTemplate(t, meta, "dengan_gambar", { components: [{ type: "HEADER", format: "IMAGE" }, body("g")] });
    const post = (over) => api().post("/api/v1/broadcast/campaigns").set(bearer(t.ownerToken)).send({ name: "X", channelId: t.channelId, templateId: approved.id, variables, ...over });

    assert.equal((await post({ templateId: pending.id })).body.code, "TEMPLATE_NOT_APPROVED");
    assert.equal((await post({ variables: [] })).body.code, "CAMPAIGN_INVALID");
    assert.equal((await post({ variables: [{ type: "text", value: "a" }, { type: "text", value: "b" }] })).body.code, "CAMPAIGN_INVALID");
    assert.equal((await post({ templateId: image.id })).body.code, "CAMPAIGN_INVALID", "an image header needs the image");
    assert.equal((await post({ templateId: image.id, headerMediaUrl: "https://cdn.toko.id/promo.jpg" })).status, 201);
    assert.equal((await post({ templateId: 999999 })).status, 404);

    const otherTenant = await shop();
    assert.equal((await api().post("/api/v1/broadcast/campaigns").set(bearer(otherTenant.ownerToken)).send({ name: "X", channelId: otherTenant.channelId, templateId: approved.id, variables })).status, 404, "another tenant's template");
  });

  test("launching freezes the list; the worker sends the template with each contact's own values and records everything", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const budi = await contact(t, { name: "budi santoso" });
    const noName = await contact(t, { name: "Pelanggan" });
    const c = await campaign(t, template.id);

    const started = await launch(t, c.id);
    assert.equal(started.status, 200);
    assert.equal(started.body.recipients, 2);
    assert.equal(started.body.data.status, "sending");
    assert.equal(started.body.creditsShort, false);

    await contact(t); // someone who appears after the launch is not part of this campaign
    const now = middayJakarta();
    const tick = await runBroadcastTick({ now, institutionId: t.institutionId });
    assert.equal(tick.sent, 2);
    assert.equal(tick.completed, 1);

    assert.equal(meta.calls.templates.length, 2);
    const byPhone = Object.fromEntries(meta.calls.templates.map((x) => [x.body.to, x]));
    const first = byPhone[budi.phone];
    assert.ok(first.url.includes(`/${t.pn}/messages`), "sent from the campaign's number");
    assert.deepEqual(first.body.template, { name: "promo_maret", language: { code: "id" }, components: [{ type: "body", parameters: [{ type: "text", text: "Budi" }] }] });
    assert.equal(byPhone[noName.phone].body.template.components[0].parameters[0].text, "Kak", "a placeholder name falls back instead of greeting 'Pelanggan'");

    const rs = await recipientsOf(c.id);
    assert.deepEqual(countBy(rs), { sent: 2 });
    assert.ok(rs.every((r) => /^wamid\.TPL/.test(r.wa_message_id) && r.sent_at));
    assert.equal(await creditsUsed(t), 2);
    assert.equal((await statusOf(c.id)).status, "completed");

    const [msg] = await query("SELECT sender_type, content_text, meta_json FROM chat_messages WHERE lead_id = ?", [budi.id]);
    assert.equal(msg.sender_type, "cs");
    assert.match(msg.content_text, /^Halo Budi, promo promo_maret/);
    assert.equal(asObject(msg.meta_json).broadcast.campaignId, c.id);

    assert.equal((await runBroadcastTick({ now, institutionId: t.institutionId })).sent, 0, "nothing is sent twice");
  });

  test("delivery reports move recipients forward, never backward, and a failure after acceptance returns the credit", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 3; i++) await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    await runBroadcastTick({ now: middayJakarta(), institutionId: t.institutionId });
    const [r1, r2, r3] = await recipientsOf(c.id);
    assert.equal(await creditsUsed(t), 3);

    const status = (id, s, extra = {}) => ({ object: "whatsapp_business_account", entry: [{ id: t.waba, changes: [{ field: "messages", value: { statuses: [{ id, status: s, timestamp: String(Math.floor(Date.now() / 1000)), ...extra }] } }] }] });
    await webhook(status(r1.wa_message_id, "delivered"));
    await webhook(status(r2.wa_message_id, "read"));
    await webhook(status(r3.wa_message_id, "failed", { errors: [{ code: 131026, title: "Message undeliverable" }] }));
    await waitFor(async () => (await recipientsOf(c.id)).some((r) => r.status === "failed"));
    await webhook(status(r2.wa_message_id, "delivered")); // arrives late
    await new Promise((r) => setTimeout(r, 250));

    const after = Object.fromEntries((await recipientsOf(c.id)).map((r) => [r.id, r]));
    assert.equal(after[r1.id].status, "delivered");
    assert.equal(after[r2.id].status, "read", "a late 'delivered' does not undo 'read'");
    assert.ok(after[r2.id].delivered_at && after[r2.id].read_at);
    assert.deepEqual([after[r3.id].status, after[r3.id].error_code], ["failed", "131026"]);
    assert.equal(await creditsUsed(t), 2, "a message that could not be delivered is not charged");

    const report = (await api().get(`/api/v1/broadcast/campaigns/${c.id}`).set(bearer(t.ownerToken))).body.data;
    assert.deepEqual([report.funnel.accepted, report.funnel.delivered, report.funnel.read], [2, 2, 1]);
    assert.equal(report.failures[0].count, 1);
  });

  test("a reply is counted, and a purchase soon after is credited to the campaign", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const buyer = await contact(t, { name: "Siti" });
    await contact(t, { name: "Andi" });
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    await runBroadcastTick({ now: new Date(), institutionId: t.institutionId, ...{} }).catch(() => null);
    await query("UPDATE broadcast_recipients SET sent_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), status = 'delivered' WHERE campaign_id = ?", [c.id]);

    const payload = { object: "whatsapp_business_account", entry: [{ id: "W", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: t.pn }, contacts: [{ profile: { name: "Siti" }, wa_id: buyer.phone }], messages: [{ from: buyer.phone, id: `wamid.REPLY.${t.institutionId}`, type: "text", text: { body: "mau dong kak" } }] } }] }] };
    await webhook(payload);
    await waitFor(async () => (await row("SELECT replied_at FROM broadcast_recipients WHERE campaign_id = ? AND lead_id = ?", [c.id, buyer.id])).replied_at);

    const product = await createProduct(t.institutionId, { price: 250000, stock: 5 });
    const order = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: buyer.id, items: [{ product_id: product, quantity: 2 }] });
    await api().patch(`/api/v1/orders/${order.body.data.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });

    const report = (await api().get(`/api/v1/broadcast/campaigns/${c.id}`).set(bearer(t.ownerToken))).body.data;
    assert.equal(report.replies, 1);
    assert.equal(report.replyRatePercent, 50);
    assert.equal(report.attributedOrders, 1);
    assert.equal(report.attributedRevenue, 500000);
    assert.equal(report.attributionWindowDays, 7);
  });

  test("the daily limit holds back the rest until the next day", async () => {
    const t = await shop({ settings: { dailyLimit: 3 } });
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 5; i++) await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    const day1 = middayJakarta();

    assert.equal((await runBroadcastTick({ now: day1, institutionId: t.institutionId })).sent, 3);
    assert.equal((await runBroadcastTick({ now: new Date(day1.getTime() + 60_000), institutionId: t.institutionId })).sent, 0, "today's allowance is used up");
    assert.equal((await statusOf(c.id)).status, "sending");
    assert.equal((await runBroadcastTick({ now: new Date(day1.getTime() + 25 * 3600_000), institutionId: t.institutionId })).sent, 2, "a day later the rest goes out");
    assert.equal((await statusOf(c.id)).status, "completed");
  });

  test("nothing is sent at night", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    const night = new Date(middayJakarta().getTime() + 10.5 * 3600_000); // 22:30 in Jakarta
    assert.equal((await runBroadcastTick({ now: night, institutionId: t.institutionId })).sent, 0);
    assert.equal(meta.calls.templates.length, 0);
    assert.equal((await runBroadcastTick({ now: new Date(night.getTime() + 10 * 3600_000), institutionId: t.institutionId })).sent, 1, "in the morning it goes");
  });

  test("a rate limit from Meta makes the campaign wait, keeps the recipient, and returns the credit", async () => {
    const t = await shop();
    const meta = mockMeta({ sendResult: () => ({ status: 429, error: { code: 130429, message: "Rate limit hit" } }) });
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 4; i++) await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    const now = middayJakarta();

    const first = await runBroadcastTick({ now, institutionId: t.institutionId });
    assert.equal(first.sent, 0);
    assert.ok(meta.calls.templates.length <= 5, "it stops trying once Meta says slow down");
    assert.equal(await creditsUsed(t), 0);
    const rs = await recipientsOf(c.id);
    assert.equal(rs.filter((r) => r.status === "pending").length, 4);
    const campaignRow = await statusOf(c.id);
    assert.equal(campaignRow.status, "sending");
    assert.ok(new Date(campaignRow.backoff_until) > now);

    const before = meta.calls.templates.length;
    await runBroadcastTick({ now: new Date(now.getTime() + 60_000), institutionId: t.institutionId });
    assert.equal(meta.calls.templates.length, before, "no sends during the back-off");

    meta.state.sendResult = undefined;
    assert.equal((await runBroadcastTick({ now: new Date(now.getTime() + 6 * 60_000), institutionId: t.institutionId })).sent, 4, "after the wait it carries on");
  });

  test("a template problem pauses the whole campaign; fixing it and resuming sends the rest", async () => {
    const t = await shop();
    const meta = mockMeta({ sendResult: () => ({ error: { code: 132001, message: "Template name does not exist in the translation" } }) });
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 3; i++) await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    const now = middayJakarta();
    await runBroadcastTick({ now, institutionId: t.institutionId });
    const paused = await statusOf(c.id);
    assert.deepEqual([paused.status, paused.pause_reason], ["paused", "template_problem"]);
    assert.equal((await recipientsOf(c.id)).filter((r) => r.status === "pending").length, 3, "nobody was marked failed for a problem that is not theirs");
    assert.equal(await creditsUsed(t), 0);

    meta.state.sendResult = undefined;
    const resumed = await api().post(`/api/v1/broadcast/campaigns/${c.id}/resume`).set(bearer(t.ownerToken));
    assert.equal(resumed.body.data.status, "sending");
    assert.equal((await runBroadcastTick({ now: new Date(now.getTime() + 120_000), institutionId: t.institutionId })).sent, 3);
  });

  test("a number that cannot be reached fails only that contact, with a readable reason", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const bad = await contact(t);
    await contact(t);
    meta.state.sendResult = (b) => (b.to === bad.phone ? { error: { code: 131026, message: "Message undeliverable" } } : null);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    await runBroadcastTick({ now: middayJakarta(), institutionId: t.institutionId });
    const rs = await recipientsOf(c.id);
    assert.deepEqual(countBy(rs), { sent: 1, failed: 1 });
    assert.match(rs.find((r) => r.status === "failed").error_message, /tidak terdaftar di WhatsApp/);
    assert.equal(await creditsUsed(t), 1);
    assert.equal((await statusOf(c.id)).status, "completed");

    const list = await api().get(`/api/v1/broadcast/campaigns/${c.id}/recipients`).query({ status: "failed" }).set(bearer(t.ownerToken));
    assert.equal(list.body.data.length, 1);
  });

  test("running out of credits pauses the campaign with what was sent kept", async () => {
    const t = await shop({ credits: 2 });
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 4; i++) await contact(t);
    const c = await campaign(t, template.id);
    const started = await launch(t, c.id);
    assert.equal(started.body.creditsShort, true, "the owner is warned at launch");
    await runBroadcastTick({ now: middayJakarta(), institutionId: t.institutionId });
    const state = await statusOf(c.id);
    assert.deepEqual([state.status, state.pause_reason], ["paused", "out_of_credits"]);
    assert.deepEqual(countBy(await recipientsOf(c.id)), { sent: 2, pending: 2 });
    assert.equal(await creditsUsed(t), 2);
    assert.equal(meta.calls.templates.length, 2, "no message is attempted without a credit for it");
  });

  test("consent is checked again at the moment of sending", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const a = await contact(t);
    await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    await query("UPDATE leads SET marketing_consent = 'unknown' WHERE id = ?", [a.id]); // withdrawn after the list was frozen
    await runBroadcastTick({ now: middayJakarta(), institutionId: t.institutionId });
    const rs = await recipientsOf(c.id);
    assert.deepEqual(countBy(rs), { sent: 1, skipped: 1 });
    assert.equal(rs.find((r) => r.lead_id === a.id).error_code, "consent");
    assert.equal(meta.calls.templates.every((x) => x.body.to !== a.phone), true);
  });

  test("pausing stops sending; cancelling drops what is left and keeps what was sent", async () => {
    const t = await shop({ settings: { dailyLimit: 2 } });
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 4; i++) await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    const now = middayJakarta();
    await runBroadcastTick({ now, institutionId: t.institutionId });

    assert.equal((await api().post(`/api/v1/broadcast/campaigns/${c.id}/pause`).set(bearer(t.ownerToken))).body.data.status, "paused");
    assert.equal((await runBroadcastTick({ now: new Date(now.getTime() + 25 * 3600_000), institutionId: t.institutionId })).sent, 0, "paused means paused, even when allowance is free");
    assert.equal((await api().post(`/api/v1/broadcast/campaigns/${c.id}/pause`).set(bearer(t.ownerToken))).status, 409);

    const cancelled = await api().post(`/api/v1/broadcast/campaigns/${c.id}/cancel`).set(bearer(t.ownerToken));
    assert.equal(cancelled.body.data.status, "cancelled");
    assert.deepEqual(countBy(await recipientsOf(c.id)), { sent: 2, skipped: 2 });
    assert.equal((await api().post(`/api/v1/broadcast/campaigns/${c.id}/cancel`).set(bearer(t.ownerToken))).status, 409);
    assert.equal((await launch(t, c.id)).status, 409);
  });

  test("a scheduled campaign starts only when its time comes", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    await contact(t);
    const c = await campaign(t, template.id);
    const at = middayJakarta(1);
    const scheduled = await launch(t, c.id, { scheduledAt: at.toISOString() });
    assert.equal(scheduled.body.data.status, "scheduled");
    assert.equal(scheduled.body.recipients, null, "who is in it is decided when it starts");

    assert.equal((await runBroadcastTick({ now: new Date(at.getTime() - 3600_000), institutionId: t.institutionId })).started, 0);
    const tick = await runBroadcastTick({ now: new Date(at.getTime() + 60_000), institutionId: t.institutionId });
    assert.deepEqual([tick.started, tick.sent], [1, 1]);
  });

  test("two workers at the same moment send each message once", async () => {
    const t = await shop();
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 8; i++) await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    const now = middayJakarta();
    const [a, b] = await Promise.all([runBroadcastTick({ now, institutionId: t.institutionId }), runBroadcastTick({ now, institutionId: t.institutionId })]);
    assert.equal(a.sent + b.sent, 8);
    assert.equal(meta.calls.templates.length, 8);
    assert.equal(new Set(meta.calls.templates.map((x) => x.body.to)).size, 8);
    assert.equal(await creditsUsed(t), 8);
  });

  test("a second campaign soon after the first skips people who just got a message", async () => {
    const t = await shop({ settings: { frequencyCapDays: 3 } });
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    for (let i = 0; i < 3; i++) await contact(t);
    const first = await campaign(t, template.id);
    await launch(t, first.id);
    await runBroadcastTick({ now: middayJakarta(), institutionId: t.institutionId });
    await query("UPDATE broadcast_recipients SET sent_at = UTC_TIMESTAMP() WHERE campaign_id = ?", [first.id]);
    const fresh = await contact(t);

    const second = await campaign(t, template.id, { name: "Promo lagi" });
    const started = await launch(t, second.id);
    assert.equal(started.body.recipients, 1, "only the contact nobody messaged recently");
    assert.equal((await recipientsOf(second.id))[0].lead_id, fresh.id);
  });

  test("a test message goes to one number, costs a credit, and shows the text; a failure costs nothing", async () => {
    const t = await shop({ credits: 5 });
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    const test_ = (over) => api().post("/api/v1/broadcast/test").set(bearer(t.ownerToken)).send({ channelId: t.channelId, templateId: template.id, phone: "081200000099", variables: [{ type: "text", value: "Andi" }], ...over });
    const res = await test_({});
    assert.equal(res.status, 200);
    assert.match(res.body.preview, /^Halo Andi, promo promo_maret/);
    assert.equal(meta.calls.templates[0].body.to, "6281200000099");
    assert.equal(await creditsUsed(t), 1);

    meta.state.sendResult = () => ({ error: { code: 131026, message: "Message undeliverable" } });
    const failed = await test_({});
    assert.equal(failed.status, 502);
    assert.equal(await creditsUsed(t), 1);
    assert.equal((await test_({ variables: [] })).status, 400);
  });

  test("the campaign list and settings show the picture, per tenant", async () => {
    const t = await shop({ credits: 10 });
    const meta = mockMeta();
    const template = await approvedTemplate(t, meta);
    await contact(t);
    const c = await campaign(t, template.id);
    await launch(t, c.id);
    await runBroadcastTick({ now: middayJakarta(), institutionId: t.institutionId });

    const list = (await api().get("/api/v1/broadcast/campaigns").set(bearer(t.ownerToken))).body.data;
    assert.deepEqual([list[0].name, list[0].recipients, list[0].sent, list[0].status], ["Promo Maret", 1, 1, "completed"]);
    const settings = await api().get("/api/v1/broadcast/settings").set(bearer(t.ownerToken));
    assert.deepEqual(settings.body.credits, { quota: 10, used: 1, remaining: 9 });
    assert.equal(settings.body.data.dailyLimit, 250);
    assert.equal((await api().put("/api/v1/broadcast/settings").set(bearer(t.ownerToken)).send({ dailyLimit: 0 })).status, 400);
    assert.equal((await api().put("/api/v1/broadcast/settings").set(bearer(t.csToken)).send({ dailyLimit: 100 })).status, 403);

    const other = await shop();
    assert.equal((await api().get("/api/v1/broadcast/campaigns").set(bearer(other.ownerToken))).body.data.length, 0);
    assert.equal((await api().get(`/api/v1/broadcast/campaigns/${c.id}`).set(bearer(other.ownerToken))).status, 404);
    assert.equal((await api().get(`/api/v1/broadcast/campaigns/${c.id}/recipients`).set(bearer(other.ownerToken))).status, 404);
  });
});

describe("ads: who came from which ad", () => {
  const referralMessage = (t, phone, id, referral) => ({ object: "whatsapp_business_account", entry: [{ id: "W", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: t.pn }, contacts: [{ profile: { name: "Pembeli Iklan" }, wa_id: phone }], messages: [{ from: phone, id, type: "text", text: { body: "Halo, saya lihat iklannya" }, ...(referral ? { referral } : {}) }] } }] }] });

  test("a Click-to-WhatsApp message records the ad, the click and where the customer came from", async () => {
    const t = await shop();
    mockMeta();
    const phone = "6281377700001";
    await webhook(referralMessage(t, phone, `wamid.AD1.${t.institutionId}`, { source_id: "AD-111", source_type: "ad", source_url: "https://fb.me/abc", headline: "Promo Maret", ctwa_clid: "CLICK-1" }));
    await waitFor(async () => (await row("SELECT id FROM meta_ad_referrals WHERE institution_id = ?", [t.institutionId])));
    const lead = await row("SELECT meta_ad_id, ctwa_clid, source FROM leads WHERE institution_id = ? AND phone_number = ?", [t.institutionId, phone]);
    assert.deepEqual([lead.meta_ad_id, lead.ctwa_clid, lead.source], ["AD-111", "CLICK-1", "meta_ads"]);
    const ref = await row("SELECT ad_id, headline, ctwa_clid, source_type FROM meta_ad_referrals WHERE institution_id = ?", [t.institutionId]);
    assert.deepEqual([ref.ad_id, ref.headline, ref.ctwa_clid, ref.source_type], ["AD-111", "Promo Maret", "CLICK-1", "ad"]);

    // the same click repeated adds nothing; a later click from another ad keeps the first ad and updates the click id
    await webhook(referralMessage(t, phone, `wamid.AD2.${t.institutionId}`, { source_id: "AD-111", source_type: "ad", ctwa_clid: "CLICK-1" }));
    await webhook(referralMessage(t, phone, `wamid.AD3.${t.institutionId}`, { source_id: "AD-222", source_type: "ad", ctwa_clid: "CLICK-2" }));
    await waitFor(async () => (await row("SELECT COUNT(*) AS n FROM meta_ad_referrals WHERE institution_id = ?", [t.institutionId])).n === 2);
    const after = await row("SELECT meta_ad_id, ctwa_clid FROM leads WHERE institution_id = ? AND phone_number = ?", [t.institutionId, phone]);
    assert.deepEqual([after.meta_ad_id, after.ctwa_clid], ["AD-111", "CLICK-2"]);
  });

  test("an organic message records no ad, and an existing customer's source is not rewritten", async () => {
    const t = await shop();
    mockMeta();
    const existing = await contact(t, { source: "manual" });
    await webhook(referralMessage(t, existing.phone, `wamid.ORG1.${t.institutionId}`, { source_id: "AD-9", source_type: "ad", ctwa_clid: "C9" }));
    await webhook(referralMessage(t, "6281377700099", `wamid.ORG2.${t.institutionId}`, null));
    await waitFor(async () => (await row("SELECT id FROM leads WHERE institution_id = ? AND phone_number = '6281377700099'", [t.institutionId])));
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual(Object.values(await row("SELECT meta_ad_id, source FROM leads WHERE id = ?", [existing.id])), ["AD-9", "manual"]);
    assert.equal((await row("SELECT meta_ad_id FROM leads WHERE institution_id = ? AND phone_number = '6281377700099'", [t.institutionId])).meta_ad_id, null);
  });
});

describe("ads: spend, sync and ROAS", () => {
  const today = new Date().toISOString().slice(0, 10);

  async function sale(t, lead, { qty = 1, price = 100000 } = {}) {
    const product = await createProduct(t.institutionId, { price, hpp: price * 0.6, stock: 50 });
    const order = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: lead, items: [{ product_id: product, quantity: qty }] });
    assert.equal(order.status, 201);
    const paid = await api().patch(`/api/v1/orders/${order.body.data.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    assert.equal(paid.status, 200);
    return order.body.data.id;
  }
  const adLead = async (t, adId) => {
    const l = await contact(t, { source: "meta_ads" });
    await query("UPDATE leads SET meta_ad_id = ? WHERE id = ?", [adId, l.id]);
    return l;
  };

  test("spend is entered by hand, corrected by writing the same day again, listed and deleted", async () => {
    const t = await shop();
    const put = (rows) => api().post("/api/v1/ads/spend").set(bearer(t.financeToken)).send({ rows });
    assert.equal((await put([{ date: today, adId: "A1", campaignId: "C1", spend: 100000, clicks: 50 }, { date: today, spend: 20000 }])).body.data.rows, 2);
    await put([{ date: today, adId: "A1", campaignId: "C1", spend: 120000, clicks: 60 }]);
    const list = (await api().get("/api/v1/ads/spend").set(bearer(t.ownerToken))).body.data;
    assert.equal(list.length, 2, "the same day and ad is replaced, not added");
    assert.equal(list.find((r) => r.adId === "A1").spend, 120000);
    assert.equal((await put([{ date: "1 Maret", spend: 5 }])).status, 400);
    assert.equal((await api().post("/api/v1/ads/spend").set(bearer(t.csToken)).send({ rows: [{ date: today, spend: 1 }] })).status, 403);

    const id = list[0].id;
    const other = await shop();
    assert.equal((await api().delete(`/api/v1/ads/spend/${id}`).set(bearer(other.ownerToken))).status, 404);
    assert.equal((await api().delete(`/api/v1/ads/spend/${id}`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().get("/api/v1/ads/spend").set(bearer(t.ownerToken))).body.data.length, 1);
  });

  test("syncing pulls spend from Meta across pages; the token is never returned; wrong currency and failures are explained", async () => {
    const t = await shop();
    const insight = (d, ad, spend) => ({ date_start: d, ad_id: ad, ad_name: `Iklan ${ad}`, campaign_id: "C1", campaign_name: "Maret", spend: String(spend), impressions: "1000", clicks: "30" });
    const meta = mockMeta({ insightPages: [[insight(today, "A1", 100000), insight(today, "A2", 50000)], [insight(today, "A3", 25000)]] });

    assert.equal((await api().post("/api/v1/ads/sync").set(bearer(t.ownerToken)).send({ days: 7 })).status, 404, "no account connected yet");
    const saved = await api().put("/api/v1/ads/settings").set(bearer(t.ownerToken)).send({ adAccountId: "act_1234567890", accessToken: "EAAG-ads-token-value-123" });
    assert.equal(saved.status, 200);
    assert.ok(!JSON.stringify(saved.body).includes("EAAG"));
    assert.equal((await row("SELECT encrypted_access_token FROM meta_ads_settings WHERE institution_id = ?", [t.institutionId])).encrypted_access_token.includes("EAAG"), false);

    const res = await api().post("/api/v1/ads/sync").set(bearer(t.ownerToken)).send({ days: 7 });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.rows, 3);
    assert.equal(meta.calls.insights.length, 2);
    assert.match(decodeURIComponent(meta.calls.insights[0]), /"since":"\d{4}-\d{2}-\d{2}"/);
    const settings = (await api().get("/api/v1/ads/settings").set(bearer(t.ownerToken))).body.data;
    assert.deepEqual([settings.configured, settings.adAccountId, Boolean(settings.lastSyncedAt), settings.lastSyncError], [true, "1234567890", true, null]);
    assert.equal((await api().get("/api/v1/ads/spend").set(bearer(t.ownerToken))).body.data.reduce((s, r) => s + r.spend, 0), 175000);

    meta.state.currency = "USD";
    const usd = await api().post("/api/v1/ads/sync").set(bearer(t.ownerToken)).send({ days: 7 });
    assert.equal(usd.status, 400);
    assert.match(usd.body.message, /USD/);
    meta.state.currency = "IDR";
    meta.state.insightsFail = true;
    const bad = await api().post("/api/v1/ads/sync").set(bearer(t.ownerToken)).send({ days: 7 });
    assert.match(bad.body.message, /Invalid OAuth/);
    assert.match((await api().get("/api/v1/ads/settings").set(bearer(t.ownerToken))).body.data.lastSyncError, /Invalid OAuth/);

    assert.equal((await api().delete("/api/v1/ads/settings").set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().get("/api/v1/ads/settings").set(bearer(t.ownerToken))).body.data.configured, false);
  });

  test("the scheduled sync refreshes only accounts that are due", async () => {
    const t = await shop();
    const meta = mockMeta({ insightPages: [[{ date_start: today, ad_id: "A1", campaign_id: "C1", spend: "1000" }]] });
    await api().put("/api/v1/ads/settings").set(bearer(t.ownerToken)).send({ adAccountId: "1234567890", accessToken: "EAAG-ads-token-value-123" });
    assert.ok((await syncDueAccounts()).synced >= 1);
    const calls = meta.calls.insights.length;
    await syncDueAccounts();
    assert.equal(meta.calls.insights.length, calls, "just synced: not due again");
  });

  test("ROAS: revenue from ad customers over spend, by campaign, by ad and by day; nothing invented", async () => {
    const t = await shop();
    mockMeta();
    await api().post("/api/v1/ads/spend").set(bearer(t.ownerToken)).send({
      rows: [
        { date: today, adId: "A1", campaignId: "C1", adName: "Iklan 1", campaignName: "Maret", spend: 100000, impressions: 5000, clicks: 100 },
        { date: today, adId: "A2", campaignId: "C1", adName: "Iklan 2", campaignName: "Maret", spend: 50000, clicks: 20 },
        { date: today, adId: "A3", campaignId: "C2", adName: "Iklan 3", campaignName: "April", spend: 80000 },
      ],
    });
    const l1 = await adLead(t, "A1");
    const l1b = await adLead(t, "A1");
    const l2 = await adLead(t, "A2");
    await adLead(t, "A3");
    await sale(t, l1.id, { qty: 3, price: 100000 });
    await sale(t, l2.id, { qty: 1, price: 100000 });
    const organic = await contact(t);
    await sale(t, organic.id, { qty: 2, price: 100000 });
    const unpaid = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: l1b.id, items: [{ product_id: await createProduct(t.institutionId, { price: 999000, stock: 5 }), quantity: 1 }] });
    assert.equal(unpaid.status, 201); // an unpaid order is not revenue

    const byCampaign = (await api().get("/api/v1/ads/roas").set(bearer(t.financeToken))).body.data;
    assert.equal(byCampaign.groupBy, "campaign");
    const c1 = byCampaign.rows.find((r) => r.id === "C1");
    assert.deepEqual([c1.name, c1.spend, c1.leads, c1.orders, c1.revenue, c1.roas], ["Maret", 150000, 3, 2, 400000, 2.67]);
    const c2 = byCampaign.rows.find((r) => r.id === "C2");
    assert.deepEqual([c2.spend, c2.leads, c2.orders, c2.roas, c2.costPerOrder], [80000, 1, 0, 0, null]);
    assert.deepEqual([byCampaign.totals.spend, byCampaign.totals.revenue, byCampaign.totals.roas], [230000, 400000, 1.74]);
    assert.deepEqual(byCampaign.notFromAds, { orders: 1, revenue: 200000 });
    assert.equal(byCampaign.adsShareOfRevenuePercent, 66.7);
    assert.equal(byCampaign.totals.grossProfit, 160000);
    assert.equal(byCampaign.totals.profitRoas, 0.7);

    const byAd = (await api().get("/api/v1/ads/roas").query({ groupBy: "ad" }).set(bearer(t.ownerToken))).body.data;
    const a1 = byAd.rows.find((r) => r.id === "A1");
    assert.deepEqual([a1.name, a1.leads, a1.orders, a1.revenue, a1.roas, a1.costPerLead, a1.conversionPercent, a1.costPerClick], ["Iklan 1", 2, 1, 300000, 3, 50000, 50, 1000]);
    assert.equal(byAd.rows[0].id, "A1", "best revenue first");

    const byDay = (await api().get("/api/v1/ads/roas").query({ groupBy: "day" }).set(bearer(t.ownerToken))).body.data;
    assert.equal(byDay.rows.length, 1);
    assert.deepEqual([byDay.rows[0].id, byDay.rows[0].spend, byDay.rows[0].leads, byDay.rows[0].revenue], [today, 230000, 4, 400000]);

    const old = (await api().get("/api/v1/ads/roas").query({ from: "2020-01-01", to: "2020-01-31" }).set(bearer(t.ownerToken))).body.data;
    assert.deepEqual([old.rows.length, old.totals.roas, old.adsShareOfRevenuePercent], [0, null, null]);
    assert.equal((await api().get("/api/v1/ads/roas").query({ from: "2026-03-10", to: "2026-03-01" }).set(bearer(t.ownerToken))).status, 400);
    assert.equal((await api().get("/api/v1/ads/roas").set(bearer(t.csToken))).status, 403);
    assert.equal((await api().get("/api/v1/ads/roas").set(bearer((await shop()).ownerToken))).body.data.rows.length, 0, "another tenant sees none of it");
  });

  test("the summary report fills in its ROAS from the same data, and stays null without spend", async () => {
    const t = await shop();
    mockMeta();
    assert.equal((await api().get("/api/v1/reports/summary").set(bearer(t.ownerToken))).body.data.metaAdRoas, null);
    await api().post("/api/v1/ads/spend").set(bearer(t.ownerToken)).send({ rows: [{ date: today, adId: "A1", campaignId: "C1", spend: 100000 }] });
    await sale(t, (await adLead(t, "A1")).id, { qty: 2, price: 100000 });
    assert.equal((await api().get("/api/v1/reports/summary").set(bearer(t.ownerToken))).body.data.metaAdRoas, 2);
  });
});

describe("conversion events to Meta", () => {
  async function withPixel(t) {
    const res = await api().put("/api/v1/integrations/meta-capi").set(bearer(t.ownerToken)).send({ pixel_id: "555000111", access_token: "EAAG-capi-token-value-123" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
  }
  async function paidOrderFor(t, leadId) {
    const product = await createProduct(t.institutionId, { price: 150000, stock: 10 });
    const order = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: leadId, items: [{ product_id: product, quantity: 1 }] });
    await api().patch(`/api/v1/orders/${order.body.data.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    return order.body.data;
  }

  test("a purchase from a Click-to-WhatsApp customer is reported with the click and the business account", async () => {
    const t = await shop();
    const meta = mockMeta();
    await withPixel(t);
    const lead = await contact(t);
    await query("UPDATE leads SET meta_ad_id = 'AD-5', ctwa_clid = 'CLICK-777' WHERE id = ?", [lead.id]);
    const order = await paidOrderFor(t, lead.id);
    await waitFor(async () => meta.calls.capi.length === 1);

    const event = meta.calls.capi[0].body.data[0];
    assert.ok(meta.calls.capi[0].url.includes("/555000111/events"));
    assert.deepEqual([event.action_source, event.messaging_channel, event.event_id], ["business_messaging", "whatsapp", order.order_number]);
    assert.deepEqual(event.user_data, { whatsapp_business_account_id: t.waba, ctwa_clid: "CLICK-777" });
    assert.deepEqual([event.custom_data.value, event.custom_data.ad_id], [150000, "AD-5"]);
    const log = await row("SELECT is_success, attempts, next_retry_at FROM meta_capi_event_logs WHERE order_id = ?", [order.id]);
    assert.deepEqual([log.is_success, log.attempts, log.next_retry_at], [1, 1, null]);
  });

  test("a failed event is tried again later, then stops, and a success is never sent twice", async () => {
    const t = await shop();
    const meta = mockMeta({ capiFail: true });
    await withPixel(t);
    const lead = await contact(t);
    const order = await paidOrderFor(t, lead.id);
    await waitFor(async () => (await row("SELECT id FROM meta_capi_event_logs WHERE order_id = ?", [order.id])));
    const first = await row("SELECT is_success, response_status_code, attempts, next_retry_at FROM meta_capi_event_logs WHERE order_id = ?", [order.id]);
    assert.deepEqual([first.is_success, first.response_status_code, first.attempts], [0, 500, 1]);
    assert.ok(first.next_retry_at, "a retry is planned");

    assert.equal((await retryFailedEvents({ now: new Date(), institutionId: t.institutionId })).retried, 0, "not due yet");
    const later = new Date(Date.now() + 3 * 60_000);
    const failedAgain = await retryFailedEvents({ now: later, institutionId: t.institutionId });
    assert.deepEqual(failedAgain, { retried: 1, succeeded: 0 });
    assert.equal((await row("SELECT attempts FROM meta_capi_event_logs WHERE order_id = ?", [order.id])).attempts, 2);

    meta.state.capiFail = false;
    const recovered = await retryFailedEvents({ now: new Date(Date.now() + 20 * 60_000), institutionId: t.institutionId });
    assert.deepEqual(recovered, { retried: 1, succeeded: 1 });
    const done = await row("SELECT is_success, attempts, next_retry_at FROM meta_capi_event_logs WHERE order_id = ?", [order.id]);
    assert.deepEqual([done.is_success, done.attempts, done.next_retry_at], [1, 3, null]);
    assert.equal((await retryFailedEvents({ now: new Date(Date.now() + 99 * 60_000), institutionId: t.institutionId })).retried, 0);

    const sentBefore = meta.calls.capi.length;
    const again = await api().post(`/api/v1/ads/capi/orders/${order.id}/send`).set(bearer(t.ownerToken));
    assert.equal(again.body.data.reason, "already_sent");
    assert.equal(meta.calls.capi.length, sentBefore);
  });

  test("the dashboard shows what was sent; unpaid orders cannot be sent; tenants without a pixel send nothing", async () => {
    const t = await shop();
    const meta = mockMeta();
    const lead = await contact(t);
    await paidOrderFor(t, lead.id);
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(meta.calls.capi.length, 0, "no pixel configured: nothing is sent");
    assert.equal((await api().get("/api/v1/ads/capi").set(bearer(t.ownerToken))).body.data.configured, false);

    await withPixel(t);
    const product = await createProduct(t.institutionId, { price: 100000, stock: 5 });
    const unpaid = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: lead.id, items: [{ product_id: product, quantity: 1 }] });
    assert.equal((await api().post(`/api/v1/ads/capi/orders/${unpaid.body.data.id}/send`).set(bearer(t.ownerToken))).status, 400);

    const paid = await paidOrderFor(t, lead.id);
    await waitFor(async () => meta.calls.capi.length === 1);
    const view = (await api().get("/api/v1/ads/capi").set(bearer(t.ownerToken))).body.data;
    assert.deepEqual([view.configured, view.pixelId, view.sent, view.failed], [true, "555000111", 1, 0]);
    assert.deepEqual([view.recent[0].orderNumber, view.recent[0].success, view.recent[0].mode], [paid.order_number, true, "chat"], "no click id: matched by phone");
    assert.equal((await api().get("/api/v1/ads/capi").set(bearer(t.csToken))).status, 403);
  });
});
