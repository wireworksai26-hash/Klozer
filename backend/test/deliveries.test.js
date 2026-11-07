import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, createUser, login, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { createChannel } from "../src/services/channels/channelRepository.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(++seq).toString(36)}`;
const answer = (status, json) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => json });

/** Pretend to be Meta: record every message sent, answer ok (or with an error code). */
function mockMeta({ fail = null } = {}) {
  const sent = [];
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const body = typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : null;
    if (String(url).endsWith("/messages") && body?.type === "text") {
      sent.push({ to: body.to, text: body.text.body });
      return fail ? answer(400, { error: { code: fail, message: "Message undeliverable" } }) : answer(200, { messages: [{ id: `wamid.${sent.length}` }] });
    }
    throw new Error(`unexpected fetch ${url}`);
  });
  return sent;
}

async function shop({ withChannel = true } = {}) {
  const t = await createTenant();
  if (withChannel) await createChannel({ institutionId: t.institutionId, type: "whatsapp", name: "Toko", externalId: `9${Date.now() % 100000}${++seq}`, accessToken: "EAAG-token" });
  const pic = await createUser(t.institutionId, "pic_delivery", { name: "Andi Kurir" });
  await query("UPDATE users SET phone_number = '081234500011' WHERE id = ?", [pic.id]);
  const picToken = await login(pic.email);
  return { ...t, pic, picToken };
}

async function order(t, { status = "paid", method = "qris", fulfillment = "delivery", total = 250000 } = {}) {
  const lead = (await query("INSERT INTO leads (institution_id, phone_number, external_id, name, address_full, city) VALUES (?, ?, ?, 'Siti Aminah', 'Jl. Slamet Riyadi 1', 'Solo')", [t.institutionId, `62899${String(++seq).padStart(7, "0")}`, uniq()])).insertId;
  const id = (await query("INSERT INTO orders (institution_id, order_number, lead_id, subtotal_amount, total_amount, payment_method, fulfillment_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [t.institutionId, `ORD-D-${uniq()}`, lead, total, total, method, fulfillment, status])).insertId;
  await query("INSERT INTO order_items (order_id, item_name, quantity, unit_price, subtotal) VALUES (?, 'Kemeja Batik', 2, 125000, 250000)", [id]);
  return id;
}

const assign = (token, body) => api().post("/api/v1/deliveries").set(bearer(token)).send(body);
const orderStatus = async (id) => (await query("SELECT status FROM orders WHERE id = ?", [id]))[0].status;

describe("handing an order to a delivery PIC", () => {
  test("the PIC is told on their phone with what they need at the door, and the result is recorded", async () => {
    const sent = mockMeta();
    const t = await shop();
    const orderId = await order(t);
    const res = await assign(t.ownerToken, { order_id: orderId, pic_user_id: t.pic.id, note: "Titip satpam" });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, "assigned");
    assert.equal(res.body.data.notify_status, "sent");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "6281234500011", "the message goes to the PIC's own number");
    for (const part of ["Andi", "ORD-D-", "Siti Aminah", "Jl. Slamet Riyadi 1, Solo", "2x Kemeja Batik", "Titip satpam"]) assert.ok(sent[0].text.includes(part), part);
  });

  test("the PIC logs in with their own account and sees only their own deliveries", async () => {
    mockMeta();
    const t = await shop();
    const other = await createUser(t.institutionId, "pic_delivery");
    const otherToken = await login(other.email);
    await assign(t.ownerToken, { order_id: await order(t), pic_user_id: t.pic.id });
    await assign(t.ownerToken, { order_id: await order(t), pic_user_id: other.id });

    const mine = await api().get("/api/v1/deliveries").set(bearer(t.picToken));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.items.length, 1);
    assert.equal(mine.body.items[0].pic_user_id, t.pic.id);
    assert.equal((await api().get("/api/v1/deliveries").set(bearer(otherToken))).body.items.length, 1);
    assert.equal((await api().get("/api/v1/deliveries").set(bearer(t.ownerToken))).body.items.length, 2, "the team sees every delivery");
    assert.equal((await api().get(`/api/v1/deliveries?pic_id=${other.id}`).set(bearer(t.picToken))).body.items.length, 1, "a PIC cannot ask for someone else's list");
    assert.equal((await api().get(`/api/v1/deliveries?pic_id=${other.id}`).set(bearer(t.picToken))).body.items[0].pic_user_id, t.pic.id);
  });

  test("a PIC cannot reach the shop's orders, contacts or settings", async () => {
    const t = await shop();
    for (const path of ["/api/v1/orders", "/api/v1/leads", "/api/v1/users", "/api/v1/channels", "/api/v1/deliveries/pics"]) {
      assert.equal((await api().get(path).set(bearer(t.picToken))).status, 403, path);
    }
    assert.equal((await assign(t.picToken, { order_id: 1, pic_user_id: t.pic.id })).status, 403, "a PIC cannot hand out deliveries");
  });

  test("the PIC takes it, then hands it over: the order follows", async () => {
    mockMeta();
    const t = await shop();
    const orderId = await order(t, { status: "paid" });
    const { id } = (await assign(t.ownerToken, { order_id: orderId, pic_user_id: t.pic.id })).body.data;

    const picked = await api().post(`/api/v1/deliveries/${id}/pickup`).set(bearer(t.picToken));
    assert.equal(picked.status, 200);
    assert.equal(picked.body.data.status, "picked_up");
    assert.equal(await orderStatus(orderId), "shipped");
    assert.equal((await api().post(`/api/v1/deliveries/${id}/pickup`).set(bearer(t.picToken))).status, 409, "taking it twice is refused");

    const done = await api().post(`/api/v1/deliveries/${id}/finish`).set(bearer(t.picToken)).send({ result: "delivered", note: "Diterima Ibu Siti" });
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, "delivered");
    assert.equal(await orderStatus(orderId), "delivered");
    assert.equal((await api().post(`/api/v1/deliveries/${id}/finish`).set(bearer(t.picToken)).send({ result: "failed", note: "x" })).status, 409, "a closed delivery stays closed");
    const [{ finished_at }] = await query("SELECT finished_at FROM deliveries WHERE id = ?", [id]);
    assert.ok(finished_at);
  });

  test("a failed delivery needs a reason and leaves the order where it was", async () => {
    mockMeta();
    const t = await shop();
    const orderId = await order(t);
    const { id } = (await assign(t.ownerToken, { order_id: orderId, pic_user_id: t.pic.id })).body.data;
    assert.equal((await api().post(`/api/v1/deliveries/${id}/finish`).set(bearer(t.picToken)).send({ result: "failed" })).status, 400);
    const failed = await api().post(`/api/v1/deliveries/${id}/finish`).set(bearer(t.picToken)).send({ result: "failed", note: "Rumah kosong" });
    assert.equal(failed.body.data.status, "failed");
    assert.equal(failed.body.data.result_note, "Rumah kosong");
    assert.equal(await orderStatus(orderId), "paid");
    // the order can be handed out again
    assert.equal((await assign(t.ownerToken, { order_id: orderId, pic_user_id: t.pic.id })).status, 201);
  });

  test("another PIC cannot touch it, and another shop cannot even see it", async () => {
    mockMeta();
    const t = await shop();
    const stranger = await createUser(t.institutionId, "pic_delivery");
    const strangerToken = await login(stranger.email);
    const outsider = await shop();
    const { id } = (await assign(t.ownerToken, { order_id: await order(t), pic_user_id: t.pic.id })).body.data;

    assert.equal((await api().post(`/api/v1/deliveries/${id}/pickup`).set(bearer(strangerToken))).status, 403);
    assert.equal((await api().post(`/api/v1/deliveries/${id}/finish`).set(bearer(strangerToken)).send({ result: "delivered" })).status, 403);
    assert.equal((await api().post(`/api/v1/deliveries/${id}/pickup`).set(bearer(outsider.picToken))).status, 404);
    assert.equal((await api().post(`/api/v1/deliveries/${id}/cancel`).set(bearer(outsider.ownerToken))).status, 404);
    assert.equal((await query("SELECT status FROM deliveries WHERE id = ?", [id]))[0].status, "assigned");
    assert.equal((await api().get("/api/v1/deliveries").set(bearer(outsider.ownerToken))).body.items.length, 0);
  });

  test("an order or a PIC from another shop cannot be used", async () => {
    mockMeta();
    const t = await shop();
    const outsider = await shop();
    assert.equal((await assign(t.ownerToken, { order_id: await order(outsider), pic_user_id: t.pic.id })).status, 404);
    assert.equal((await assign(t.ownerToken, { order_id: await order(t), pic_user_id: outsider.pic.id })).status, 400);
    const inactive = await createUser(t.institutionId, "pic_delivery", { is_active: 0 });
    assert.equal((await assign(t.ownerToken, { order_id: await order(t), pic_user_id: inactive.id })).status, 400);
    const cs = await createUser(t.institutionId, "cs");
    assert.equal((await assign(t.ownerToken, { order_id: await order(t), pic_user_id: cs.id })).status, 400, "only a delivery PIC can be given a delivery");
  });

  test("an unpaid, picked-up or finished order is refused; cash on delivery is accepted", async () => {
    mockMeta();
    const t = await shop();
    assert.equal((await assign(t.ownerToken, { order_id: await order(t, { status: "waiting_payment" }), pic_user_id: t.pic.id })).status, 409);
    assert.equal((await assign(t.ownerToken, { order_id: await order(t, { fulfillment: "pickup" }), pic_user_id: t.pic.id })).status, 409);
    assert.equal((await assign(t.ownerToken, { order_id: await order(t, { status: "completed" }), pic_user_id: t.pic.id })).status, 409);
    const cod = await assign(t.ownerToken, { order_id: await order(t, { status: "waiting_payment", method: "cod", total: 180000 }), pic_user_id: t.pic.id });
    assert.equal(cod.status, 201);
    assert.equal(cod.body.data.cod_amount, 180000, "the PIC is told how much to collect");
  });

  test("handing an order to a second PIC takes it from the first", async () => {
    mockMeta();
    const t = await shop();
    const second = await createUser(t.institutionId, "pic_delivery");
    const orderId = await order(t);
    const first = (await assign(t.ownerToken, { order_id: orderId, pic_user_id: t.pic.id })).body.data;
    const next = (await assign(t.ownerToken, { order_id: orderId, pic_user_id: second.id })).body.data;
    assert.notEqual(next.id, first.id);
    const rows = await query("SELECT id, status FROM deliveries WHERE order_id = ? ORDER BY id", [orderId]);
    assert.deepEqual(rows.map((r) => r.status), ["cancelled", "assigned"]);
    assert.equal((await api().post(`/api/v1/deliveries/${first.id}/pickup`).set(bearer(t.picToken))).status, 409, "the first PIC can no longer take it");
  });

  test("a manager can take a delivery back", async () => {
    mockMeta();
    const t = await shop();
    const { id } = (await assign(t.ownerToken, { order_id: await order(t), pic_user_id: t.pic.id })).body.data;
    assert.equal((await api().post(`/api/v1/deliveries/${id}/cancel`).set(bearer(t.picToken))).status, 403, "a PIC cannot cancel");
    assert.equal((await api().post(`/api/v1/deliveries/${id}/cancel`).set(bearer(t.ownerToken))).body.data.status, "cancelled");
    assert.equal((await api().post(`/api/v1/deliveries/${id}/cancel`).set(bearer(t.ownerToken))).status, 409);
  });
});

describe("telling the PIC when the phone notice does not go through", () => {
  test("a PIC without a number, a shop without WhatsApp, and a refused message are each recorded", async () => {
    mockMeta();
    const noPhone = await shop();
    await query("UPDATE users SET phone_number = NULL WHERE id = ?", [noPhone.pic.id]);
    const a = await assign(noPhone.ownerToken, { order_id: await order(noPhone), pic_user_id: noPhone.pic.id });
    assert.equal(a.status, 201, "the delivery is still given");
    assert.equal(a.body.data.notify_status, "skipped");
    assert.match(a.body.data.notify_detail, /Nomor HP/);

    const noChannel = await shop({ withChannel: false });
    const b = await assign(noChannel.ownerToken, { order_id: await order(noChannel), pic_user_id: noChannel.pic.id });
    assert.equal(b.status, 201);
    assert.equal(b.body.data.notify_status, "skipped");

    mock.restoreAll();
    mockMeta({ fail: 131047 });
    const refused = await shop();
    const c = await assign(refused.ownerToken, { order_id: await order(refused), pic_user_id: refused.pic.id });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.notify_status, "failed");
    assert.match(c.body.data.notify_detail, /undeliverable/i);
  });

  test("the notice can be sent again, and a finished delivery is not nagged about", async () => {
    mockMeta({ fail: 131047 });
    const t = await shop();
    const { id } = (await assign(t.ownerToken, { order_id: await order(t), pic_user_id: t.pic.id })).body.data;
    mock.restoreAll();
    const sent = mockMeta();
    const again = await api().post(`/api/v1/deliveries/${id}/notice`).set(bearer(t.ownerToken));
    assert.equal(again.body.data.notify_status, "sent");
    assert.equal(sent.length, 1);
    await api().post(`/api/v1/deliveries/${id}/finish`).set(bearer(t.picToken)).send({ result: "delivered" });
    assert.equal((await api().post(`/api/v1/deliveries/${id}/notice`).set(bearer(t.ownerToken))).status, 409);
    assert.equal(sent.length, 1);
  });
});

describe("the list of PICs to choose from", () => {
  test("it shows active delivery PICs with how many open deliveries each has", async () => {
    mockMeta();
    const t = await shop();
    await createUser(t.institutionId, "pic_delivery", { is_active: 0, name: "Nonaktif" });
    await assign(t.ownerToken, { order_id: await order(t), pic_user_id: t.pic.id });
    const res = await api().get("/api/v1/deliveries/pics").set(bearer(t.csToken));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items.map((p) => [p.name, Number(p.open_deliveries)]), [["Andi Kurir", 1]]);
  });

  test("the owner can create a delivery PIC account and that person can log in", async () => {
    const t = await createTenant();
    const created = await api().post("/api/v1/users").set(bearer(t.ownerToken)).send({ name: "Budi Kurir", email: `budi-${uniq()}@test.local`, role: "pic_delivery", phone_number: "081200000001" });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.role, "pic_delivery");
    const password = created.body.credentials?.password ?? created.body.data.password;
    assert.ok(password, "the one-time password is shown to the owner");
    const loggedIn = await api().post("/api/v1/auth/login").send({ email: created.body.data.email, password });
    assert.equal(loggedIn.status, 200);
    assert.equal(loggedIn.body.user.role, "pic_delivery");
  });
});
