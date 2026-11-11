import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json });
const modelAnswer = (content) => ok({ choices: [{ message: { content } }], usage: { prompt_tokens: 500, completion_tokens: 100 } });
function mockModel(answers) {
  const calls = [];
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    if (!String(url).includes("integrate.api.nvidia.com")) throw new Error(`unexpected fetch ${url}`);
    calls.push(JSON.parse(opts.body));
    const next = answers[Math.min(calls.length - 1, answers.length - 1)];
    return modelAnswer(next);
  });
  return calls;
}

let seq = 0;
async function lead(t, { phone, name = "Siti", status = "new", lastContactDaysAgo = 0 } = {}) {
  const p = phone ?? `62899${String(++seq).padStart(7, "0")}`;
  const r = await query("INSERT INTO leads (institution_id, phone_number, name, status, last_contacted_at) VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))", [t.institutionId, p, name, status, lastContactDaysAgo]);
  return { id: r.insertId, phone: p };
}
async function order(t, leadId, total, { status = "paid", daysAgo = 0 } = {}) {
  await query("INSERT INTO orders (institution_id, order_number, lead_id, subtotal_amount, total_amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, 'qris', ?, DATE_SUB(NOW(), INTERVAL ? DAY))", [t.institutionId, `ORD-W-${Date.now()}-${++seq}`, leadId, total, total, status, daysAgo]);
}

/** Two businesses of one owner, grouped by the Klozer team. */
async function workspaceOfTwo({ assistant = false, cap = null } = {}) {
  const admin = await createSuperadmin();
  const a = await createTenant({ name: "Batik Solo" });
  const b = await createTenant({ name: "Geprek Juara" });
  const created = await api().post("/api/v1/platform/workspaces").set(bearer(admin.token)).send({ name: "Keluarga Rina" });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const wid = created.body.id;
  for (const t of [a, b]) assert.equal((await api().post(`/api/v1/platform/workspaces/${wid}/institutions`).set(bearer(admin.token)).send({ institutionId: t.institutionId })).status, 200);
  if (assistant || cap) assert.equal((await api().put(`/api/v1/platform/workspaces/${wid}`).set(bearer(admin.token)).send({ assistantEnabled: assistant, ...(cap ? { assistantMonthlyTokenCap: cap } : {}) })).status, 200);
  return { admin, a, b, wid };
}

describe("workspace: set up by the team, seen by the owner", () => {
  test("a business outside any workspace has none, and only owners of workspace businesses can read it", async () => {
    const solo = await createTenant();
    assert.equal((await api().get("/api/v1/workspace").set(bearer(solo.ownerToken))).status, 403);
    const w = await workspaceOfTwo();
    assert.equal((await api().get("/api/v1/workspace").set(bearer(w.a.csToken))).status, 403, "staff do not get it");
    assert.equal((await api().get("/api/v1/workspace")).status, 401);
    const res = await api().get("/api/v1/workspace").set(bearer(w.a.ownerToken));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.workspace.institutions.map((i) => i.name).sort(), ["Batik Solo", "Geprek Juara"]);
    assert.equal(res.body.workspace.assistantEnabled, false);
  });

  test("only the team manages workspaces; a business can be in one workspace only and needs an owner account", async () => {
    const w = await workspaceOfTwo();
    assert.equal((await api().post("/api/v1/platform/workspaces").set(bearer(w.a.ownerToken)).send({ name: "Coba" })).status, 403);
    const other = (await api().post("/api/v1/platform/workspaces").set(bearer(w.admin.token)).send({ name: "Lain" })).body.id;
    const clash = await api().post(`/api/v1/platform/workspaces/${other}/institutions`).set(bearer(w.admin.token)).send({ institutionId: w.a.institutionId });
    assert.equal(clash.status, 409);
    const noOwner = await createTenant();
    await query("UPDATE users SET is_active = 0 WHERE institution_id = ? AND role = 'owner'", [noOwner.institutionId]);
    assert.equal((await api().post(`/api/v1/platform/workspaces/${other}/institutions`).set(bearer(w.admin.token)).send({ institutionId: noOwner.institutionId })).status, 409);
  });

  test("the login and /auth/me tell an owner about the workspace, and nobody else", async () => {
    const w = await workspaceOfTwo();
    const me = await api().get("/api/v1/auth/me").set(bearer(w.a.ownerToken));
    assert.equal(me.body.user.workspace.name, "Keluarga Rina");
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(w.a.csToken))).body.user.workspace, null);
  });

  test("detaching a business or deleting the workspace keeps the businesses and their data", async () => {
    const w = await workspaceOfTwo();
    assert.equal((await api().delete(`/api/v1/platform/workspaces/institutions/${w.b.institutionId}`).set(bearer(w.admin.token))).status, 200);
    assert.equal((await api().get("/api/v1/workspace").set(bearer(w.b.ownerToken))).status, 403);
    assert.equal((await api().delete(`/api/v1/platform/workspaces/${w.wid}`).set(bearer(w.admin.token))).status, 200);
    const [row] = await query("SELECT COUNT(*) AS n FROM institutions WHERE id IN (?, ?)", [w.a.institutionId, w.b.institutionId]);
    assert.equal(Number(row.n), 2);
  });
});

describe("workspace: overview and switching", () => {
  test("each business shows its own paid revenue and what waits, and unpaid or old orders are not counted", async () => {
    const w = await workspaceOfTwo();
    const la = await lead(w.a);
    const lb = await lead(w.b);
    await order(w.a, la.id, 100000);
    await order(w.a, la.id, 50000, { status: "waiting_payment" });
    await order(w.a, la.id, 999000, { daysAgo: 60 });
    await order(w.b, lb.id, 200000);
    await query("UPDATE leads SET handled_by = 'human' WHERE id = ?", [lb.id]);

    const res = await api().get("/api/v1/workspace?days=30").set(bearer(w.a.ownerToken));
    const byName = Object.fromEntries(res.body.overview.businesses.map((x) => [x.name, x]));
    assert.equal(byName["Batik Solo"].revenue, 100000);
    assert.equal(byName["Batik Solo"].orders, 1);
    assert.equal(byName["Batik Solo"].waitingPayment, 1);
    assert.equal(byName["Geprek Juara"].revenue, 200000);
    assert.equal(byName["Geprek Juara"].chatsForTeam, 1);
    assert.equal(res.body.overview.totals.revenue, 300000);
    assert.equal(res.body.overview.series.length, 30);
    const today = res.body.overview.series.at(-1);
    assert.equal(today.values[w.a.institutionId] + today.values[w.b.institutionId], 300000);
  });

  test("switching gives a session for the other business, and every request after it reads only that business", async () => {
    const w = await workspaceOfTwo();
    await lead(w.a, { name: "Pelanggan Batik" });
    await lead(w.b, { name: "Pelanggan Geprek" });

    const switched = await api().post("/api/v1/workspace/switch").set(bearer(w.a.ownerToken)).send({ institutionId: w.b.institutionId });
    assert.equal(switched.status, 200, JSON.stringify(switched.body));
    assert.equal(switched.body.user.institutionId, w.b.institutionId);
    assert.equal(switched.body.user.workspace.currentInstitutionId, w.b.institutionId);

    const leads = await api().get("/api/v1/leads").set(bearer(switched.body.token));
    const names = (leads.body.data ?? leads.body.items ?? []).map((l) => l.name);
    assert.ok(names.includes("Pelanggan Geprek"));
    assert.ok(!names.includes("Pelanggan Batik"), "the other business's contacts are not readable");
  });

  test("a business outside the workspace, or a non-owner, cannot be switched to", async () => {
    const w = await workspaceOfTwo();
    const outsider = await createTenant();
    assert.equal((await api().post("/api/v1/workspace/switch").set(bearer(w.a.ownerToken)).send({ institutionId: outsider.institutionId })).status, 404);
    assert.equal((await api().post("/api/v1/workspace/switch").set(bearer(w.a.csToken)).send({ institutionId: w.b.institutionId })).status, 403);
    assert.equal((await api().post("/api/v1/workspace/switch").set(bearer(outsider.ownerToken)).send({ institutionId: w.b.institutionId })).status, 403);
  });
});

describe("workspace: contacts joined by phone", () => {
  test("one person in two businesses shows once with both, read only, with no chat text or address", async () => {
    const w = await workspaceOfTwo();
    const phone = "6281234500001";
    const la = await lead(w.a, { phone, name: "Dewi" });
    const lb = await lead(w.b, { phone, name: "Dewi" });
    await lead(w.a, { name: "Hanya di Batik" });
    await query("UPDATE leads SET address_full = 'Jl. Rahasia 1' WHERE id = ?", [la.id]);
    await order(w.a, la.id, 100000);
    await order(w.b, lb.id, 40000);

    const res = await api().get("/api/v1/workspace/contacts?shared=1").set(bearer(w.a.ownerToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    const dewi = res.body.items[0];
    assert.equal(dewi.businessCount, 2);
    assert.equal(dewi.spent, 140000);
    assert.deepEqual(dewi.businesses.map((x) => x.institutionName).sort(), ["Batik Solo", "Geprek Juara"]);
    assert.ok(!JSON.stringify(res.body).includes("Rahasia"), "no address leaves the business");

    const all = await api().get("/api/v1/workspace/contacts?search=Batik").set(bearer(w.a.ownerToken));
    assert.equal(all.body.items[0].name, "Hanya di Batik");
  });

  test("contacts of a business outside the workspace never appear", async () => {
    const w = await workspaceOfTwo();
    const outsider = await createTenant();
    await lead(outsider, { phone: "6281234500002", name: "Orang Luar" });
    const res = await api().get("/api/v1/workspace/contacts?search=Orang").set(bearer(w.a.ownerToken));
    assert.equal(res.body.items.length, 0);
  });
});

describe("CRM: profile, segments, merging", () => {
  test("the profile adds up what a contact bought, and another business cannot read it", async () => {
    const t = await createTenant();
    const other = await createTenant();
    const l = await lead(t, { name: "Rani", status: "repeat" });
    await order(t, l.id, 100000);
    await order(t, l.id, 50000, { daysAgo: 5 });
    await order(t, l.id, 70000, { status: "waiting_payment" });
    await query("INSERT INTO tasks (institution_id, lead_id, title) VALUES (?, ?, 'Hubungi Rani')", [t.institutionId, l.id]);

    const res = await api().get(`/api/v1/crm/contacts/${l.id}`).set(bearer(t.ownerToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stats.paidOrders, 2);
    assert.equal(res.body.data.stats.spent, 150000);
    assert.equal(res.body.data.stats.averageOrder, 75000);
    assert.equal(res.body.data.orders.length, 3);
    assert.equal(res.body.data.tasks[0].title, "Hubungi Rani");
    assert.equal((await api().get(`/api/v1/crm/contacts/${l.id}`).set(bearer(other.ownerToken))).status, 404);
    assert.equal((await api().get(`/api/v1/crm/contacts/${l.id}`).set(bearer(t.financeToken))).status, 403);
  });

  test("a segment keeps its filter and finds the right people: bought before, quiet for 60 days, spent enough", async () => {
    const t = await createTenant();
    const loyal = await lead(t, { name: "Loyal", lastContactDaysAgo: 2 });
    const quiet = await lead(t, { name: "Lama Diam", lastContactDaysAgo: 90 });
    const quietSmall = await lead(t, { name: "Diam Kecil", lastContactDaysAgo: 90 });
    await lead(t, { name: "Belum Beli", lastContactDaysAgo: 90 });
    await order(t, loyal.id, 500000, { daysAgo: 2 });
    await order(t, quiet.id, 400000, { daysAgo: 90 });
    await order(t, quietSmall.id, 20000, { daysAgo: 90 });

    const filters = { bought: true, inactiveDays: 60, minSpent: 100000 };
    const preview = await api().post("/api/v1/crm/contacts/preview").set(bearer(t.ownerToken)).send({ filters });
    assert.deepEqual(preview.body.items.map((c) => c.name), ["Lama Diam"]);

    const made = await api().post("/api/v1/crm/segments").set(bearer(t.ownerToken)).send({ name: "Pelanggan tidur", filters });
    assert.equal(made.status, 201);
    assert.equal((await api().post("/api/v1/crm/segments").set(bearer(t.ownerToken)).send({ name: "Pelanggan tidur", filters })).status, 409, "same name twice is refused");
    const list = await api().get("/api/v1/crm/segments").set(bearer(t.ownerToken));
    assert.equal(list.body.items[0].count, 1);
    const members = await api().get(`/api/v1/crm/segments/${made.body.id}/contacts`).set(bearer(t.ownerToken));
    assert.equal(members.body.items[0].name, "Lama Diam");
    assert.equal(members.body.items[0].spent, 400000);
  });

  test("segment input is validated, only managers save, and another business never sees it", async () => {
    const t = await createTenant();
    const other = await createTenant();
    const bad = await api().post("/api/v1/crm/segments").set(bearer(t.ownerToken)).send({ name: "x", filters: { statuses: ["bukan-status"] } });
    assert.equal(bad.status, 400);
    assert.equal((await api().post("/api/v1/crm/segments").set(bearer(t.ownerToken)).send({ name: "Isi", filters: { drop: "table" } })).status, 400, "unknown filter keys are refused");
    assert.equal((await api().post("/api/v1/crm/segments").set(bearer(t.csToken)).send({ name: "Isi", filters: { vip: true } })).status, 403);
    const made = await api().post("/api/v1/crm/segments").set(bearer(t.ownerToken)).send({ name: "VIP", filters: { vip: true } });
    assert.equal((await api().get(`/api/v1/crm/segments/${made.body.id}/contacts`).set(bearer(other.ownerToken))).status, 404);
    assert.equal((await api().delete(`/api/v1/crm/segments/${made.body.id}`).set(bearer(other.ownerToken))).status, 404);
    assert.equal((await api().delete(`/api/v1/crm/segments/${made.body.id}`).set(bearer(t.ownerToken))).status, 200);
  });

  test("merging moves orders, messages and labels, fills empty details, and keeps the more careful marketing consent", async () => {
    const t = await createTenant();
    const keep = await lead(t, { name: "Budi" });
    const drop = await lead(t, { name: "Budi Santoso" });
    await query("UPDATE leads SET city = 'Solo', marketing_consent = 'opted_out', is_vip = 1 WHERE id = ?", [drop.id]);
    await order(t, keep.id, 100000);
    await order(t, drop.id, 60000);
    await query("INSERT INTO chat_messages (institution_id, lead_id, sender_type, content_text) VALUES (?, ?, 'customer', 'halo')", [t.institutionId, drop.id]);
    const label = (await query("INSERT INTO lead_labels (institution_id, name) VALUES (?, 'Reseller')", [t.institutionId])).insertId;
    await query("INSERT INTO leads_labels_map (lead_id, label_id) VALUES (?, ?)", [keep.id, label]);
    await query("INSERT INTO leads_labels_map (lead_id, label_id) VALUES (?, ?)", [drop.id, label]);

    const res = await api().post("/api/v1/crm/contacts/merge").set(bearer(t.ownerToken)).send({ keepId: keep.id, dropId: drop.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await query("SELECT COUNT(*) AS n FROM leads WHERE id = ?", [drop.id]))[0].n, 0);
    assert.equal(Number((await query("SELECT COUNT(*) AS n FROM orders WHERE lead_id = ?", [keep.id]))[0].n), 2);
    assert.equal(Number((await query("SELECT COUNT(*) AS n FROM chat_messages WHERE lead_id = ?", [keep.id]))[0].n), 1);
    assert.equal(Number((await query("SELECT COUNT(*) AS n FROM leads_labels_map WHERE lead_id = ?", [keep.id]))[0].n), 1, "the same label is not doubled");
    const [row] = await query("SELECT city, marketing_consent, is_vip FROM leads WHERE id = ?", [keep.id]);
    assert.deepEqual([row.city, row.marketing_consent, Number(row.is_vip)], ["Solo", "opted_out", 1]);
  });

  test("merging is for managers of one business: not with itself, not across businesses, not for staff", async () => {
    const t = await createTenant();
    const other = await createTenant();
    const a = await lead(t);
    const b = await lead(t);
    const c = await lead(other);
    assert.equal((await api().post("/api/v1/crm/contacts/merge").set(bearer(t.ownerToken)).send({ keepId: a.id, dropId: a.id })).status, 409);
    assert.equal((await api().post("/api/v1/crm/contacts/merge").set(bearer(t.ownerToken)).send({ keepId: a.id, dropId: c.id })).status, 404);
    assert.equal((await api().post("/api/v1/crm/contacts/merge").set(bearer(t.csToken)).send({ keepId: a.id, dropId: b.id })).status, 403);
    assert.equal((await query("SELECT COUNT(*) AS n FROM leads WHERE id = ?", [c.id]))[0].n, 1, "the other business's contact is untouched");
  });
});

describe("workspace assistant", () => {
  const ask = (token, question) => api().post("/api/v1/workspace/assistant/ask").set(bearer(token)).send({ question });
  const PLAN = JSON.stringify({ calls: [{ tool: "sales_summary", args: { days: 30 } }] });

  test("it is off until the team switches it on, and only an owner can ask", async () => {
    const w = await workspaceOfTwo();
    const calls = mockModel([PLAN, "Jawaban."]);
    const off = await ask(w.a.ownerToken, "Berapa omzet bulan ini?");
    assert.equal(off.status, 403);
    assert.equal(calls.length, 0, "the model is not called while it is off");
    assert.equal((await ask(w.a.csToken, "Berapa omzet?")).status, 403);
    assert.equal((await api().post("/api/v1/workspace/assistant/ask").send({ question: "halo apa kabar" })).status, 401);
  });

  test("the model chooses a fixed question, the server runs it on the owner's businesses, and the answer is written from that data", async () => {
    const w = await workspaceOfTwo({ assistant: true });
    const outsider = await createTenant({ name: "Toko Luar Rahasia" });
    const la = await lead(w.a);
    await order(w.a, la.id, 120000);
    await order(outsider, (await lead(outsider)).id, 777000);
    const calls = mockModel([PLAN, "Omzet Batik Solo Rp 120.000 dan Geprek Juara Rp 0 dalam 30 hari."]);

    const res = await ask(w.a.ownerToken, "Berapa omzet bulan ini di semua bisnis?");
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.match(res.body.answer, /120\.000/);
    assert.deepEqual(res.body.sources.map((s) => s.tool), ["sales_summary"]);
    assert.equal(calls.length, 2, "one call to choose, one to write");
    const writerInput = calls[1].messages.map((m) => m.content).join("\n");
    assert.match(writerInput, /120000/);
    assert.ok(!writerInput.includes("Toko Luar Rahasia") && !writerInput.includes("777000"), "no data of other businesses reaches the model");
    assert.ok(!calls[0].messages.map((m) => m.content).join("\n").includes("Toko Luar Rahasia"));

    const [log] = await query("SELECT usage_type, total_tokens FROM ai_token_usage_logs WHERE institution_id = ? ORDER BY id DESC LIMIT 1", [w.a.institutionId]);
    assert.equal(log.usage_type, "workspace_ai");
    assert.equal(res.body.usedTokens, 1200, "both calls are counted");
    const [audit] = await query("SELECT action FROM audit_logs WHERE action = 'workspace.assistant_ask' AND institution_id = ? LIMIT 1", [w.a.institutionId]);
    assert.ok(audit, "each question is in the audit log");
  });

  test("a made-up tool is ignored, a business outside the workspace is refused, and an unusable plan gets a plain reply", async () => {
    const w = await workspaceOfTwo({ assistant: true });
    const outsider = await createTenant();
    mockModel([JSON.stringify({ calls: [{ tool: "drop_table", args: {} }, { tool: "sales_summary", args: { institutionId: outsider.institutionId } }] }), "Maaf, itu di luar workspace Anda."]);
    const res = await ask(w.a.ownerToken, "Tampilkan omzet bisnis lain");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.sources, [], "the refused question gives no source");

    mock.restoreAll();
    const calls = mockModel(["saya tidak mengerti"]);
    const plain = await ask(w.a.ownerToken, "Ceritakan lelucon");
    assert.equal(plain.status, 200);
    assert.match(plain.body.answer, /belum bisa saya jawab/);
    assert.equal(calls.length, 1, "no second call when there is nothing to read");
  });

  test("the monthly cap and the shop's own token balance both stop it, before the model is called", async () => {
    const w = await workspaceOfTwo({ assistant: true, cap: 1000 });
    await query("INSERT INTO ai_token_usage_logs (institution_id, model, usage_type, total_tokens) VALUES (?, 'x', 'workspace_ai', 1500)", [w.a.institutionId]);
    const calls = mockModel([PLAN, "x"]);
    const capped = await ask(w.a.ownerToken, "Berapa omzet?");
    assert.equal(capped.status, 429);
    assert.equal(capped.body.code, "ASSISTANT_CAP_REACHED");

    await api().put(`/api/v1/platform/workspaces/${w.wid}`).set(bearer(w.admin.token)).send({ assistantMonthlyTokenCap: null });
    await query("UPDATE institutions SET ai_token_quota = 100, ai_tokens_used = 100 WHERE id = ?", [w.a.institutionId]);
    assert.equal((await ask(w.a.ownerToken, "Berapa omzet?")).status, 402);
    assert.equal(calls.length, 0);
  });

  test("the question is checked, and the team's usage figure counts this month's assistant tokens", async () => {
    const w = await workspaceOfTwo({ assistant: true });
    assert.equal((await ask(w.a.ownerToken, "ok")).status, 400);
    assert.equal((await ask(w.a.ownerToken, "x".repeat(501))).status, 400);
    mockModel([PLAN, "Selesai."]);
    await ask(w.a.ownerToken, "Berapa omzet bulan ini?");
    const list = await api().get("/api/v1/platform/workspaces").set(bearer(w.admin.token));
    const mine = list.body.items.find((x) => x.id === w.wid);
    assert.equal(mine.assistantEnabled, true);
    assert.equal(mine.assistantTokensThisMonth, 1200);
  });
});

describe("workspace: businesses, report, and the assistant's memory", () => {
  const item = (orderId, name, qty, price) => query("INSERT INTO order_items (order_id, item_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)", [orderId, name, qty, price, qty * price]);
  const ask = (token, question) => api().post("/api/v1/workspace/assistant/ask").set(bearer(token)).send({ question });
  const lastOrder = async (t) => (await query("SELECT id FROM orders WHERE institution_id = ? ORDER BY id DESC LIMIT 1", [t.institutionId]))[0].id;

  test("the businesses page shows each business against the period before, its token balance, team and open work", async () => {
    const w = await workspaceOfTwo();
    const la = await lead(w.a);
    await order(w.a, la.id, 100000);
    await order(w.a, la.id, 50000, { daysAgo: 40 });
    await query("UPDATE institutions SET ai_token_quota = 1000, ai_tokens_used = 250 WHERE id = ?", [w.a.institutionId]);
    const sku = await query("INSERT INTO products (institution_id, sku, name, selling_price, cost_price_hpp, stock_quantity, low_stock_threshold) VALUES (?, 'S1', 'Kemeja', 100000, 60000, 2, 5)", [w.a.institutionId]);
    assert.ok(sku.insertId);
    await query("INSERT INTO tasks (institution_id, title, status, due_at) VALUES (?, 'Telat', 'open', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY))", [w.a.institutionId]);

    const res = await api().get("/api/v1/workspace/businesses?days=30").set(bearer(w.a.ownerToken));
    assert.equal(res.status, 200);
    const a = res.body.items.find((x) => x.id === w.a.institutionId);
    assert.equal(a.revenue, 100000);
    assert.equal(a.previousRevenue, 50000);
    assert.equal(a.change, 100, "revenue doubled");
    assert.equal(a.tokensLeft, 750);
    assert.equal(a.lowStock, 1);
    assert.equal(a.overdueTasks, 1);
    assert.equal(a.staff, 2, "the cs and finance accounts, not the owner");
    assert.equal(a.current, true);
    assert.equal(res.body.items.find((x) => x.id === w.b.institutionId).change, null, "no earlier sales: no percentage is invented");
    assert.equal((await api().get("/api/v1/workspace/businesses").set(bearer(w.a.csToken))).status, 403);
  });

  test("the report compares periods per business and lists top products, the payment mix and sellers, from paid orders only", async () => {
    const w = await workspaceOfTwo();
    const la = await lead(w.a);
    const lb = await lead(w.b);
    await order(w.a, la.id, 200000);
    await item(await lastOrder(w.a), "Kemeja Batik", 2, 100000);
    await order(w.b, lb.id, 90000);
    await item(await lastOrder(w.b), "Kemeja Batik", 1, 90000);
    await order(w.b, lb.id, 777000, { status: "waiting_payment" });
    await item(await lastOrder(w.b), "Tidak Dihitung", 1, 777000);
    await order(w.a, la.id, 100000, { daysAgo: 45 });

    const res = await api().get("/api/v1/workspace/report?days=30").set(bearer(w.a.ownerToken));
    assert.equal(res.status, 200);
    const a = res.body.businesses.find((x) => x.id === w.a.institutionId);
    assert.deepEqual([a.revenue, a.previousRevenue, a.revenueChange, a.orders, a.averageOrder], [200000, 100000, 100, 1, 200000]);
    assert.deepEqual(res.body.topProducts[0], { name: "Kemeja Batik", quantity: 3, revenue: 290000, businesses: 2 });
    assert.ok(!res.body.topProducts.some((p) => p.name === "Tidak Dihitung"), "an unpaid order is not a sale");
    assert.equal(res.body.payments[0].method, "qris");
    assert.equal(res.body.payments[0].revenue, 290000);
    assert.equal((await api().get("/api/v1/workspace/report").set(bearer(w.a.csToken))).status, 403);
  });

  test("the joined contacts say how many people there are and how many are in more than one business", async () => {
    const w = await workspaceOfTwo();
    await lead(w.a, { phone: "6281300000001" });
    await lead(w.b, { phone: "6281300000001" });
    await lead(w.a, { phone: "6281300000002" });
    const res = await api().get("/api/v1/workspace/contacts").set(bearer(w.a.ownerToken));
    assert.equal(res.body.people, 2);
    assert.equal(res.body.shared, 1);
  });

  test("the assistant remembers the conversation, understands a follow-up from the last exchange, and the owner can clear it", async () => {
    const w = await workspaceOfTwo({ assistant: true });
    const calls = mockModel([
      JSON.stringify({ calls: [{ tool: "compare_periods", args: { days: 30 } }] }), "Omzet naik.",
      JSON.stringify({ calls: [{ tool: "top_products", args: { limit: 3 } }] }), "Kemeja terlaris.",
    ]);
    assert.equal((await ask(w.a.ownerToken, "Bandingkan omzet dengan bulan lalu")).status, 200);
    assert.equal((await ask(w.a.ownerToken, "Dan produk apa yang paling laris?")).status, 200);

    const secondPlanner = calls[2].messages.map((m) => m.content).join("\n");
    assert.match(secondPlanner, /PERCAKAPAN SEBELUMNYA/);
    assert.match(secondPlanner, /Bandingkan omzet dengan bulan lalu/);
    assert.match(secondPlanner, /Omzet naik/);
    assert.equal(calls[0].messages.map((m) => m.content).join("\n").includes("PERCAKAPAN SEBELUMNYA"), false, "the first question has no history");

    const history = await api().get("/api/v1/workspace/assistant/history").set(bearer(w.a.ownerToken));
    assert.deepEqual(history.body.items.map((x) => x.question), ["Bandingkan omzet dengan bulan lalu", "Dan produk apa yang paling laris?"]);
    assert.equal(history.body.items[1].sources[0].tool, "top_products");
    assert.ok(!JSON.stringify(history.body).includes('"omzetSebelumnya"'), "only the answer is kept, not the rows that were read");

    const otherOwner = await api().get("/api/v1/workspace/assistant/history").set(bearer(w.b.ownerToken));
    assert.equal(otherOwner.body.items.length, 0, "each account has its own conversation");

    assert.equal((await api().delete("/api/v1/workspace/assistant/history").set(bearer(w.a.ownerToken))).status, 200);
    assert.equal((await api().get("/api/v1/workspace/assistant/history").set(bearer(w.a.ownerToken))).body.items.length, 0);
    assert.equal((await api().get("/api/v1/workspace/assistant/history").set(bearer(w.a.csToken))).status, 403);
  });
});
