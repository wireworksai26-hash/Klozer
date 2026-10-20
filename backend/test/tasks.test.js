import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, createUser, login, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";
import { startHandoff } from "../src/services/handoff/handoffService.js";
import { AI_TASKS_PER_DAY, agentActor, announceOverdue, createTask, systemActor, updateTask, userActor } from "../src/services/tasks/taskService.js";
import { mockNetwork, row, shop, write } from "./agentTestKit.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

let seq = 0;
async function lead(t, name = "Budi") {
  return (await query("INSERT INTO leads (institution_id, phone_number, name) VALUES (?, ?, ?)", [t.institutionId, `62811${String(Date.now()).slice(-6)}${++seq}`, name])).insertId;
}

/** A shop with a second cs, a warehouse user, and a webhook subscribed to everything (so events can be checked). */
async function team() {
  const t = await createTenant();
  const cs2 = await createUser(t.institutionId, "cs");
  const wh = await createUser(t.institutionId, "pic_warehouse");
  await query("INSERT INTO webhook_endpoints (institution_id, name, url, encrypted_secret, events_json) VALUES (?, 'n8n', 'https://example.test/hook', 'x', '[\"*\"]')", [t.institutionId]);
  return { ...t, cs2, cs2Token: await login(cs2.email), wh, whToken: await login(wh.email) };
}

const post = (t, token, path, body) => api().post(`/api/v1${path}`).set(bearer(token)).send(body);
const put = (t, token, path, body) => api().put(`/api/v1${path}`).set(bearer(token)).send(body);
const get = (t, token, path) => api().get(`/api/v1${path}`).set(bearer(token));
const make = async (t, body = {}, token = t.ownerToken) => {
  const res = await post(t, token, "/tasks", { title: "Hubungi pelanggan", ...body });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};
const deliveries = async (t, type) => Number((await row("SELECT COUNT(*) AS n FROM webhook_deliveries WHERE institution_id = ? AND event_type = ?", [t.institutionId, type])).n);

describe("making and reading tasks", () => {
  test("a manager makes a task for a contact and a person; it starts open and its history begins", async () => {
    const t = await team();
    const leadId = await lead(t);
    const due = new Date(Math.floor((Date.now() + 3600_000) / 1000) * 1000).toISOString(); // the database keeps whole seconds
    const task = await make(t, { leadId, assignedTo: t.cs.id, type: "follow_up", priority: "high", dueAt: due, note: "Tanya soal ukuran" });
    assert.deepEqual([task.status, task.source, task.type, task.priority, task.assignedTo, task.leadId, task.contactName, task.overdue], ["open", "staff", "follow_up", "high", t.cs.id, leadId, "Budi", false]);
    assert.equal(new Date(task.dueAt).toISOString(), due);

    const detail = (await get(t, t.csToken, `/tasks/${task.id}`)).body.data;
    assert.deepEqual(detail.events.map((e) => [e.event, e.actor]), [["created", "user"]]);
    assert.equal(await deliveries(t, "task.created"), 1, "webhook receivers are told");
  });

  test("a title is made when none is given, and bad input is refused", async () => {
    const t = await team();
    const other = await team();
    const leadId = await lead(t);
    const titled = await post(t, t.ownerToken, "/tasks", { leadId, type: "check_stock" });
    assert.equal(titled.body.data.title, "Cek stok: Budi");

    assert.equal((await post(t, t.ownerToken, "/tasks", {})).status, 400);
    assert.equal((await post(t, t.ownerToken, "/tasks", { title: "x".repeat(161) })).status, 400);
    assert.equal((await post(t, t.ownerToken, "/tasks", { title: "Tugas", dueAt: "bukan tanggal" })).status, 400);
    assert.equal((await post(t, t.ownerToken, "/tasks", { title: "Tugas", type: "terbang" })).status, 400);
    const foreignLead = await post(t, t.ownerToken, "/tasks", { title: "Tugas", leadId: await lead(other) });
    assert.deepEqual([foreignLead.status, foreignLead.body.code], [400, "UNKNOWN_CONTACT"]);
    const foreignUser = await post(t, t.ownerToken, "/tasks", { title: "Tugas", assignedTo: other.cs.id });
    assert.deepEqual([foreignUser.status, foreignUser.body.code], [400, "UNKNOWN_ASSIGNEE"]);
    const inactive = await createUser(t.institutionId, "cs", { is_active: 0 });
    assert.equal((await post(t, t.ownerToken, "/tasks", { title: "Tugas", assignedTo: inactive.id })).body.code, "UNKNOWN_ASSIGNEE");
  });

  test("an order must belong to the contact it is attached to", async () => {
    const t = await team();
    const a = await lead(t, "A");
    const b = await lead(t, "B");
    const order = (await query("INSERT INTO orders (institution_id, order_number, lead_id) VALUES (?, ?, ?)", [t.institutionId, `ORD-T-${Date.now()}`, a])).insertId;
    assert.equal((await post(t, t.ownerToken, "/tasks", { title: "Cek", leadId: b, orderId: order })).body.code, "UNKNOWN_ORDER");
    const ok = await post(t, t.ownerToken, "/tasks", { title: "Cek", leadId: a, orderId: order });
    assert.equal(ok.status, 201);
    assert.ok(ok.body.data.orderNumber.startsWith("ORD-T-"));
  });

  test("staff make as many tasks as they like, but only give them to themselves", async () => {
    const t = await team();
    const leadId = await lead(t);
    await make(t, { leadId, type: "follow_up" }, t.csToken);
    await make(t, { leadId, type: "follow_up" }, t.csToken); // a person is not held to one open task per kind
    const mine = await make(t, { assignedTo: t.cs.id }, t.csToken);
    assert.equal(mine.assignedTo, t.cs.id);
    const toOther = await post(t, t.csToken, "/tasks", { title: "Untukmu", assignedTo: t.cs2.id });
    assert.deepEqual([toOther.status, toOther.body.code], [403, "TASK_FORBIDDEN"]);
    assert.equal((await post(t, t.ownerToken, "/tasks", { title: "Untukmu", assignedTo: t.cs2.id })).status, 201, "a manager may");
  });

  test("everyone sees their own and untaken tasks; managers see all; shops never see each other's", async () => {
    const t = await team();
    const other = await team();
    await make(t, { title: "Milik cs1", assignedTo: t.cs.id });
    await make(t, { title: "Milik cs2", assignedTo: t.cs2.id });
    await make(t, { title: "Belum diambil" });
    await make(other, { title: "Toko lain" }, other.ownerToken);

    const titles = async (token, query = "") => (await get(t, token, `/tasks${query}`)).body.data.map((x) => x.title).sort();
    assert.deepEqual(await titles(t.csToken), ["Belum diambil", "Milik cs1"]);
    assert.deepEqual(await titles(t.cs2Token), ["Belum diambil", "Milik cs2"]);
    assert.deepEqual(await titles(t.ownerToken), ["Belum diambil", "Milik cs1", "Milik cs2"]);
    assert.deepEqual(await titles(t.ownerToken, "?assignee=unassigned"), ["Belum diambil"]);
    assert.deepEqual(await titles(t.csToken, "?assignee=me"), ["Milik cs1"]);
    assert.deepEqual(await titles(t.ownerToken, `?assignee=${t.cs2.id}`), ["Milik cs2"]);
    assert.deepEqual(await titles(t.ownerToken, "?q=cs2"), ["Milik cs2"]);

    const listed = await get(t, t.csToken, "/tasks");
    assert.deepEqual(listed.body.summary, { active: 2, overdue: 0, unassigned: 1, mine: 1 });
    assert.deepEqual((await get(t, t.ownerToken, "/tasks")).body.summary, { active: 3, overdue: 0, unassigned: 1, mine: 0 });

    const page = await get(t, t.ownerToken, "/tasks?limit=2&offset=2");
    assert.deepEqual([page.body.data.length, page.body.total], [1, 3]);
    assert.equal((await get(t, t.ownerToken, "/tasks?status=bukan")).status, 400);
  });

  test("a task is hidden from staff it was not meant for, and from other shops", async () => {
    const t = await team();
    const other = await team();
    const theirs = await make(t, { assignedTo: t.cs2.id });
    assert.equal((await get(t, t.csToken, `/tasks/${theirs.id}`)).status, 404);
    assert.equal((await get(t, other.ownerToken, `/tasks/${theirs.id}`)).status, 404);
    assert.equal((await put(t, other.ownerToken, `/tasks/${theirs.id}`, { status: "done" })).status, 404);
    assert.equal((await post(t, other.ownerToken, `/tasks/${theirs.id}/claim`, {})).status, 404);
    assert.equal((await post(t, other.ownerToken, `/tasks/${theirs.id}/comments`, { text: "hai" })).status, 404);
    assert.equal((await post(t, t.csToken, `/tasks/${theirs.id}/comments`, { text: "hai" })).status, 404);
  });

  test("late tasks are flagged and listed on request", async () => {
    const t = await team();
    const late = await make(t, { title: "Terlambat", dueAt: new Date(Date.now() + 60_000).toISOString() });
    await make(t, { title: "Nanti", dueAt: new Date(Date.now() + 3600_000).toISOString() });
    await query("UPDATE tasks SET due_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR) WHERE id = ?", [late.id]);
    const res = await get(t, t.ownerToken, "/tasks?overdue=true");
    assert.deepEqual(res.body.data.map((x) => [x.title, x.overdue]), [["Terlambat", true]]);
    assert.equal(res.body.summary.overdue, 1);
  });

  test("the screen's lists: kinds, statuses and who can be given a task", async () => {
    const t = await team();
    await createUser(t.institutionId, "cs", { is_active: 0 });
    const res = await get(t, t.csToken, "/tasks/meta");
    assert.equal(res.status, 200);
    assert.ok(res.body.data.types.some((x) => x.value === "check_stock" && x.label === "Cek stok"));
    assert.deepEqual(res.body.data.assignees.map((u) => u.id).sort(), [t.owner.id, t.cs.id, t.finance.id, t.cs2.id, t.wh.id].sort());
    assert.equal((await get(t, t.csToken, "/tasks/abc")).status, 400);
  });
});

describe("changing tasks", () => {
  test("a task goes open, in progress, done; it can be reopened; a finished one cannot become cancelled", async () => {
    const t = await team();
    const task = await make(t, { assignedTo: t.cs.id });
    assert.equal((await put(t, t.csToken, `/tasks/${task.id}`, { status: "in_progress" })).body.data.status, "in_progress");
    const done = (await put(t, t.csToken, `/tasks/${task.id}`, { status: "done" })).body.data;
    assert.deepEqual([done.status, done.overdue], ["done", false]);
    assert.ok(done.completedAt);
    assert.equal((await row("SELECT completed_by FROM tasks WHERE id = ?", [task.id])).completed_by, t.cs.id);

    const bad = await put(t, t.ownerToken, `/tasks/${task.id}`, { status: "cancelled" });
    assert.deepEqual([bad.status, bad.body.code], [409, "TASK_BAD_TRANSITION"]);
    const reopened = (await put(t, t.ownerToken, `/tasks/${task.id}`, { status: "open" })).body.data;
    assert.deepEqual([reopened.status, reopened.completedAt], ["open", null]);

    const history = (await get(t, t.ownerToken, `/tasks/${task.id}`)).body.data.events.map((e) => e.detail ?? e.event);
    assert.deepEqual(history.slice(1), ["status: open → in_progress", "status: in_progress → done", "status: done → open"]);
    assert.equal(await deliveries(t, "task.completed"), 1);
    assert.equal(await deliveries(t, "task.updated"), 2);
    assert.equal((await put(t, t.ownerToken, `/tasks/${task.id}`, {})).status, 400);
  });

  test("a manager changes everything: words, priority, time, person, and releases it", async () => {
    const t = await team();
    const task = await make(t, { assignedTo: t.cs.id });
    const changed = (await put(t, t.ownerToken, `/tasks/${task.id}`, { title: "Judul baru", note: "Catatan", priority: "low", assignedTo: t.cs2.id, dueAt: new Date(Date.now() + 86400_000).toISOString() })).body.data;
    assert.deepEqual([changed.title, changed.note, changed.priority, changed.assignedTo, changed.assigneeName.length > 0], ["Judul baru", "Catatan", "low", t.cs2.id, true]);
    assert.equal((await put(t, t.ownerToken, `/tasks/${task.id}`, { assignedTo: null })).body.data.assignedTo, null);
    assert.equal((await put(t, t.ownerToken, `/tasks/${task.id}`, { assignedTo: 999999 })).body.code, "UNKNOWN_ASSIGNEE");
    assert.equal((await put(t, t.ownerToken, `/tasks/${task.id}`, { dueAt: null })).body.data.dueAt, null);
    const events = (await get(t, t.ownerToken, `/tasks/${task.id}`)).body.data.events.map((e) => e.event);
    assert.ok(events.includes("assigned") && events.includes("updated"));
  });

  test("a team member works their own task but cannot rewrite or reassign it", async () => {
    const t = await team();
    const task = await make(t, { assignedTo: t.cs.id, priority: "normal" });
    assert.equal((await put(t, t.csToken, `/tasks/${task.id}`, { note: "Sudah ditelepon", status: "in_progress", dueAt: new Date(Date.now() + 7200_000).toISOString() })).status, 200);
    const title = await put(t, t.csToken, `/tasks/${task.id}`, { title: "Ganti" });
    assert.deepEqual([title.status, title.body.code], [403, "TASK_FORBIDDEN"]);
    assert.equal((await put(t, t.csToken, `/tasks/${task.id}`, { priority: "high" })).status, 403);
    assert.equal((await put(t, t.csToken, `/tasks/${task.id}`, { assignedTo: t.cs2.id })).status, 403);
    assert.equal((await put(t, t.csToken, `/tasks/${task.id}`, { assignedTo: null })).status, 403);
    assert.equal((await put(t, t.cs2Token, `/tasks/${task.id}`, { status: "done" })).status, 404, "not theirs");
  });

  test("a task nobody has can be taken by pressing take, or by assigning it to yourself", async () => {
    const t = await team();
    const a = await make(t);
    const b = await make(t);
    assert.equal((await post(t, t.csToken, `/tasks/${a.id}/claim`, {})).body.data.assignedTo, t.cs.id);
    assert.equal((await put(t, t.cs2Token, `/tasks/${b.id}`, { assignedTo: t.cs2.id })).body.data.assignedTo, t.cs2.id);
    const taken = await post(t, t.cs2Token, `/tasks/${a.id}/claim`, {});
    assert.equal(taken.status, 404, "it is no longer visible to the other person");
    const again = await post(t, t.ownerToken, `/tasks/${a.id}/claim`, {});
    assert.deepEqual([again.status, again.body.code], [409, "TASK_TAKEN"]);
    const eventsA = (await get(t, t.csToken, `/tasks/${a.id}`)).body.data.events.map((e) => e.detail ?? e.event);
    assert.ok(eventsA.includes("diambil sendiri"));
  });

  test("two people pressing take at the same moment: one wins, the other is told", async () => {
    const t = await team();
    const task = await make(t);
    const [x, y] = await Promise.all([post(t, t.csToken, `/tasks/${task.id}/claim`, {}), post(t, t.cs2Token, `/tasks/${task.id}/claim`, {})]);
    assert.deepEqual([x.status, y.status].sort(), [200, 409]);
    assert.equal(await row("SELECT assigned_to FROM tasks WHERE id = ?", [task.id]).then((r) => [t.cs.id, t.cs2.id].includes(r.assigned_to)), true);
  });

  test("a finished task cannot be taken", async () => {
    const t = await team();
    const task = await make(t);
    await put(t, t.ownerToken, `/tasks/${task.id}`, { status: "done" });
    assert.equal((await post(t, t.csToken, `/tasks/${task.id}/claim`, {})).body.code, "TASK_BAD_TRANSITION");
  });

  test("comments are added to the history by anyone who can see the task", async () => {
    const t = await team();
    const task = await make(t, { assignedTo: t.cs.id });
    const res = await post(t, t.csToken, `/tasks/${task.id}/comments`, { text: "Sudah dihubungi, tidak diangkat" });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.data.events.at(-1), { id: res.body.data.events.at(-1).id, actor: "user", actorName: res.body.data.events.at(-1).actorName, event: "comment", detail: "Sudah dihubungi, tidak diangkat", createdAt: res.body.data.events.at(-1).createdAt });
    assert.equal((await post(t, t.csToken, `/tasks/${task.id}/comments`, { text: " " })).status, 400);
  });

  test("only managers delete", async () => {
    const t = await team();
    const task = await make(t, { assignedTo: t.cs.id });
    assert.equal((await api().delete(`/api/v1/tasks/${task.id}`).set(bearer(t.csToken))).status, 403);
    assert.equal((await api().delete(`/api/v1/tasks/${task.id}`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await get(t, t.ownerToken, `/tasks/${task.id}`)).status, 404);
  });

  test("the task area can be switched off by the package", async () => {
    const t = await team();
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.tasks', false) WHERE id = ?", [t.institutionId]);
    const res = await get(t, t.ownerToken, "/tasks");
    assert.deepEqual([res.status, res.body.code], [403, "FEATURE_DISABLED"]);
  });
});

describe("one open task per kind (agents and rules)", () => {
  test("asking again while one is open returns it; after it is done a new one can be made; a person is not limited", async () => {
    const t = await team();
    const leadId = await lead(t);
    const first = await createTask({ institutionId: t.institutionId, actor: systemActor, leadId, type: "follow_up" });
    const again = await createTask({ institutionId: t.institutionId, actor: systemActor, leadId, type: "follow_up" });
    assert.deepEqual([first.created, again.created, again.task.id], [true, false, first.task.id]);
    const other = await createTask({ institutionId: t.institutionId, actor: systemActor, leadId, type: "check_stock" });
    assert.equal(other.created, true, "another kind is another task");

    await updateTask({ institutionId: t.institutionId, id: first.task.id, actor: userActor({ id: t.owner.id, role: "owner" }), patch: { status: "done" } });
    const next = await createTask({ institutionId: t.institutionId, actor: systemActor, leadId, type: "follow_up" });
    assert.deepEqual([next.created, next.task.id === first.task.id], [true, false]);
  });

  test("two agents asking at the same moment still make one task", async () => {
    const t = await team();
    const leadId = await lead(t);
    const results = await Promise.all(Array.from({ length: 6 }, () => createTask({ institutionId: t.institutionId, actor: systemActor, leadId, type: "handle_chat" })));
    assert.equal(results.filter((r) => r.created).length, 1);
    assert.equal(new Set(results.map((r) => r.task.id)).size, 1);
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM tasks WHERE lead_id = ?", [leadId])).n), 1);
  });

  test("a cap on tasks made by AI agents per day keeps a loop from flooding the list", async () => {
    const t = await team();
    const leadId = await lead(t);
    const rows = Array.from({ length: AI_TASKS_PER_DAY }, (_, i) => [t.institutionId, "other", `Tugas ${i}`, "ai_agent"]);
    await query("INSERT INTO tasks (institution_id, type, title, source) VALUES ?", [rows]);
    await assert.rejects(createTask({ institutionId: t.institutionId, actor: agentActor(1), leadId, type: "follow_up" }), (err) => err.code === "TASK_AI_LIMIT" && err.statusCode === 409);
    const byStaff = await post(t, t.ownerToken, "/tasks", { title: "Staf tetap bisa" });
    assert.equal(byStaff.status, 201);
  });
});

describe("settings and tasks made by rules", () => {
  test("settings start off, are validated, kept per shop, and only managers change them", async () => {
    const t = await team();
    const other = await team();
    assert.deepEqual((await get(t, t.ownerToken, "/tasks/settings")).body.data, { autoOnHandoff: false, autoOnPaymentProof: false, assignToChatOwner: true, defaultDueMinutes: 60, notifyOverdue: true });
    assert.equal((await put(t, t.ownerToken, "/tasks/settings", { autoOnHandoff: true, defaultDueMinutes: 30 })).body.data.defaultDueMinutes, 30);
    assert.equal((await get(t, other.ownerToken, "/tasks/settings")).body.data.autoOnHandoff, false);
    assert.equal((await put(t, t.ownerToken, "/tasks/settings", { defaultDueMinutes: 1 })).status, 400);
    assert.equal((await put(t, t.ownerToken, "/tasks/settings", {})).status, 400);
    assert.equal((await put(t, t.csToken, "/tasks/settings", { autoOnHandoff: true })).status, 403);
    assert.equal((await get(t, t.csToken, "/tasks/settings")).status, 403);
  });

  test("a hand-off makes no task unless the shop asked for it; then one, due soon, for the person who owns the chat", async () => {
    const t = await team();
    const leadId = await lead(t);
    await query("UPDATE leads SET assigned_cs_id = ? WHERE id = ?", [t.cs.id, leadId]);
    await startHandoff({ institutionId: t.institutionId, leadId, reason: "customer_request" });
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM tasks WHERE institution_id = ?", [t.institutionId])).n), 0, "off by default");

    await put(t, t.ownerToken, "/tasks/settings", { autoOnHandoff: true, defaultDueMinutes: 30 });
    await query("UPDATE leads SET handled_by = 'ai' WHERE id = ?", [leadId]);
    await startHandoff({ institutionId: t.institutionId, leadId, reason: "customer_request" });
    const [task] = (await get(t, t.ownerToken, "/tasks")).body.data;
    assert.deepEqual([task.type, task.source, task.assignedTo, task.leadId, task.title], ["handle_chat", "rule", t.cs.id, leadId, "Tangani chat: Pelanggan meminta berbicara dengan manusia"]);
    const minutes = (new Date(task.dueAt) - Date.now()) / 60_000;
    assert.ok(minutes > 28 && minutes <= 30, `due in ${minutes} minutes`);

    await query("UPDATE leads SET handled_by = 'ai' WHERE id = ?", [leadId]);
    await startHandoff({ institutionId: t.institutionId, leadId, reason: "guardrail" });
    assert.equal((await get(t, t.ownerToken, "/tasks")).body.total, 1, "still one open task for this chat");
  });

  test("the chat's owner can be left out, a staff takeover makes no task, and the feature switch wins", async () => {
    const t = await team();
    await put(t, t.ownerToken, "/tasks/settings", { autoOnHandoff: true, assignToChatOwner: false });
    const a = await lead(t);
    await query("UPDATE leads SET assigned_cs_id = ? WHERE id = ?", [t.cs.id, a]);
    await startHandoff({ institutionId: t.institutionId, leadId: a, reason: "customer_request" });
    assert.equal((await row("SELECT assigned_to FROM tasks WHERE lead_id = ?", [a])).assigned_to, null);

    const b = await lead(t);
    await startHandoff({ institutionId: t.institutionId, leadId: b, reason: "manual" });
    assert.equal(await row("SELECT id FROM tasks WHERE lead_id = ?", [b]), undefined);

    const c = await lead(t);
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.tasks', false) WHERE id = ?", [t.institutionId]);
    await startHandoff({ institutionId: t.institutionId, leadId: c, reason: "customer_request" });
    assert.equal(await row("SELECT id FROM tasks WHERE lead_id = ?", [c]), undefined);
  });

  test("a payment proof to check is its own switch, high priority, and its own kind of task", async () => {
    const t = await team();
    const leadId = await lead(t);
    await put(t, t.ownerToken, "/tasks/settings", { autoOnHandoff: true });
    await startHandoff({ institutionId: t.institutionId, leadId, reason: "payment_proof" });
    assert.equal(await row("SELECT id FROM tasks WHERE lead_id = ? AND type = 'check_payment'", [leadId]), undefined, "the proof switch is separate");

    await put(t, t.ownerToken, "/tasks/settings", { autoOnPaymentProof: true });
    await query("UPDATE leads SET handled_by = 'ai' WHERE id = ?", [leadId]);
    await startHandoff({ institutionId: t.institutionId, leadId, reason: "payment_proof" });
    const task = await row("SELECT type, priority, title FROM tasks WHERE lead_id = ?", [leadId]);
    assert.deepEqual([task.type, task.priority, task.title], ["check_payment", "high", "Periksa bukti pembayaran"]);
  });

  test("when the team answers the customer, the chat task made by a rule is done; one a person wrote is left", async () => {
    const t = await shop();
    mockNetwork();
    await query("INSERT INTO webhook_endpoints (institution_id, name, url, encrypted_secret, events_json) VALUES (?, 'n8n', 'https://example.test/hook', 'x', '[\"*\"]')", [t.institutionId]);
    await put(t, t.ownerToken, "/tasks/settings", { autoOnHandoff: true });

    await write(t, "saya mau komplain, barang rusak");
    const leadRow = await waitFor(async () => (await row("SELECT * FROM leads WHERE institution_id = ? AND handled_by = 'human'", [t.institutionId])));
    const auto = await waitFor(async () => row("SELECT * FROM tasks WHERE lead_id = ? AND type = 'handle_chat'", [leadRow.id]));
    assert.equal(auto.status, "open");
    const mine = await make(t, { leadId: leadRow.id, type: "handle_chat", title: "Tulisan saya sendiri" });

    const sent = await post(t, t.csToken, "/chats/send", { lead_id: leadRow.id, content_text: "Halo kak, saya Rina dari tim CS" });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    const after = await row("SELECT status, completed_by FROM tasks WHERE id = ?", [auto.id]);
    assert.deepEqual([after.status, after.completed_by], ["done", t.cs.id]);
    assert.equal((await row("SELECT status FROM tasks WHERE id = ?", [mine.id])).status, "open");
    assert.equal(await deliveries(t, "task.completed"), 1);
  });
});

describe("late tasks", () => {
  test("a task that passes its time is announced once, and again only after a new time is set", async () => {
    await announceOverdue(); // anything left late by earlier tests
    const t = await team();
    const task = await make(t, { assignedTo: t.cs.id, dueAt: new Date(Date.now() + 60_000).toISOString() });
    const quiet = await make(t, { title: "Belum waktunya", dueAt: new Date(Date.now() + 3600_000).toISOString() });
    const done = await make(t, { title: "Sudah selesai", dueAt: new Date(Date.now() + 60_000).toISOString() });
    await put(t, t.ownerToken, `/tasks/${done.id}`, { status: "done" });
    await query("UPDATE tasks SET due_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) WHERE id IN (?, ?)", [task.id, done.id]);

    assert.equal(await announceOverdue(), 1);
    assert.equal(await announceOverdue(), 0, "once is enough");
    assert.equal(await deliveries(t, "task.overdue"), 1);
    const events = (await get(t, t.ownerToken, `/tasks/${task.id}`)).body.data.events;
    assert.deepEqual(events.at(-1).event, "overdue");
    assert.equal((await get(t, t.ownerToken, `/tasks/${quiet.id}`)).body.data.events.some((e) => e.event === "overdue"), false);

    await put(t, t.ownerToken, `/tasks/${task.id}`, { dueAt: new Date(Date.now() - 60_000).toISOString() });
    assert.equal(await announceOverdue(), 1, "a new time can be missed again");
  });

  test("several workers at once announce a late task only one time", async () => {
    await announceOverdue();
    const t = await team();
    const task = await make(t, { dueAt: new Date(Date.now() + 60_000).toISOString() });
    await query("UPDATE tasks SET due_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) WHERE id = ?", [task.id]);
    const counts = await Promise.all([announceOverdue(), announceOverdue(), announceOverdue()]);
    assert.equal(counts.reduce((a, b) => a + b, 0), 1);
    assert.equal(await deliveries(t, "task.overdue"), 1);
  });

  test("a shop can turn the late notice off", async () => {
    await announceOverdue();
    const t = await team();
    const task = await make(t, { dueAt: new Date(Date.now() + 60_000).toISOString() });
    await put(t, t.ownerToken, "/tasks/settings", { notifyOverdue: false });
    await query("UPDATE tasks SET due_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) WHERE id = ?", [task.id]);
    assert.equal(await announceOverdue(), 0);
    assert.equal((await row("SELECT overdue_notified_at FROM tasks WHERE id = ?", [task.id])).overdue_notified_at, null);
  });
});

test("the webhook catalog lists the task events", async () => {
  const t = await team();
  const res = await get(t, t.ownerToken, "/integrations/events");
  const names = JSON.stringify(res.body);
  for (const name of ["task.created", "task.updated", "task.completed", "task.overdue"]) assert.ok(names.includes(name), name);
});
