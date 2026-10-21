import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { crc16, parseTlv } from "../src/utils/qris.js";
import { PLAN_FEATURES, planOffer } from "../src/utils/plans.js";
import { staticQris } from "./qrisFixture.js";

after(teardownDatabase);

const SECRET = "test-notify-secret";
const STATIC = staticQris();
const row = async (sql, params) => (await query(sql, params))[0];
const num = (v) => Number(v);

let sa;
let seq = 0;
before(async () => {
  await setupDatabase();
  sa = await createSuperadmin();
  // the team's QRIS: its picture is read, the code inside is kept, and the method is switched on
  const method = (await api().post("/api/v1/platform/payment-methods").set(bearer(sa.token)).send({ kind: "qris", label: "QRIS Merchant", sortOrder: 1 })).body.data;
  const png = await QRCode.toBuffer(STATIC, { errorCorrectionLevel: "M", margin: 4, width: 420 });
  const up = await api().put(`/api/v1/platform/payment-methods/${method.id}/qris`).set(bearer(sa.token)).send({ fileBase64: png.toString("base64"), fileName: "qris.png" });
  assert.equal(up.status, 200, JSON.stringify(up.body));
  assert.equal((await api().put(`/api/v1/platform/payment-methods/${method.id}`).set(bearer(sa.token)).send({ isActive: true })).status, 200);
});

const notify = (body, secret = SECRET) => api().post("/api/v1/payments/platform-notify").set("X-Notify-Secret", secret).send(body);
const plans = (t) => api().get("/api/v1/billing/plans").set(bearer(t.ownerToken));
const buy = (t, plan, period, token = t.ownerToken) => api().post("/api/v1/billing/orders").set(bearer(token)).send({ plan, period });
const quotaOf = async (t) => num((await row("SELECT ai_token_quota AS q FROM institutions WHERE id = ?", [t.institutionId])).q);
const shopRow = (t) => row("SELECT subscription_tier, subscription_expires_at, features_json, ai_token_quota FROM institutions WHERE id = ?", [t.institutionId]);
const ref = () => `ref-${Date.now().toString(36)}-${++seq}`;
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};
const features = (r) => (typeof r.features_json === "string" ? JSON.parse(r.features_json) : r.features_json);

describe("the merchant's QRIS becomes dynamic", () => {
  test("the code is read from the picture, only the fact that it is dynamic and the merchant name are shown, never the code", async () => {
    const list = await api().get("/api/v1/platform/payment-methods").set(bearer(sa.token));
    const qris = list.body.data.find((m) => m.kind === "qris" && m.isActive);
    assert.deepEqual([qris.dynamicQris, qris.merchantName], [true, "Toko Contoh"]);
    const pub = await api().get("/api/v1/public/payment-methods");
    assert.ok(pub.body.data.some((m) => m.dynamicQris));
    assert.doesNotMatch(JSON.stringify([list.body, pub.body]), /ID1000000000001|6304/, "the code text is not in any response");
  });

  test("a picture with no QR code is kept, the method just stays static, and the code can be pasted instead", async () => {
    const m = (await api().post("/api/v1/platform/payment-methods").set(bearer(sa.token)).send({ kind: "qris", label: "QRIS Tempel", sortOrder: 50 })).body.data;
    const blank = await QRCode.toBuffer("bukan qris, hanya teks biasa", { margin: 4, width: 300 });
    const up = await api().put(`/api/v1/platform/payment-methods/${m.id}/qris`).set(bearer(sa.token)).send({ fileBase64: blank.toString("base64") });
    assert.equal(up.status, 200);
    assert.equal(up.body.data.dynamicQris, false);
    assert.equal(up.body.qrisRead.ok, false, "text was read, but it is not a QRIS");

    const put = (payload) => api().put(`/api/v1/platform/payment-methods/${m.id}/qris-code`).set(bearer(sa.token)).send({ payload });
    assert.equal((await put("hanya teks yang cukup panjang tetapi bukan kode qris sama sekali")).body.code, "INVALID_QRIS_CODE");
    const damaged = STATIC.slice(0, -4) + "0000";
    assert.equal((await put(damaged)).status, 400, "a damaged code is refused");
    assert.equal((await put(staticQris([["54", "10000"]]))).status, 400, "a code that already has an amount is refused");
    const good = await put(staticQris([], "Toko Tempel"));
    assert.deepEqual([good.status, good.body.data.dynamicQris, good.body.data.merchantName], [200, true, "Toko Tempel"]);
    const gone = await api().delete(`/api/v1/platform/payment-methods/${m.id}/qris-code`).set(bearer(sa.token));
    assert.equal(gone.body.data.dynamicQris, false);
    await api().delete(`/api/v1/platform/payment-methods/${m.id}`).set(bearer(sa.token));
  });

  test("only the team can set the code", async () => {
    const t = await createTenant();
    const res = await api().put("/api/v1/platform/payment-methods/1/qris-code").set(bearer(t.ownerToken)).send({ payload: STATIC });
    assert.equal(res.status, 403);
  });
});

describe("a token top up bill is paid with a dynamic QRIS and settles itself", () => {
  test("the bill waits for its price plus a unique code, and the QRIS carries exactly that amount", async () => {
    const t = await createTenant({ ai_token_quota: 100000 });
    const bill = (await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens: 500000 })).body.data;
    assert.equal(bill.quotedAmountIdr, 75000);
    assert.ok(bill.uniqueCode >= 1 && bill.uniqueCode <= 99);
    assert.equal(bill.payAmountIdr, 75000 + bill.uniqueCode);

    const pay = await api().get(`/api/v1/ai/topups/${bill.id}/pay`).set(bearer(t.ownerToken));
    assert.equal(pay.status, 200);
    assert.equal(pay.body.amountIdr, bill.payAmountIdr);
    const tags = parseTlv(pay.body.qris.payload);
    assert.equal(tags.find(([x]) => x === "54")[1], String(bill.payAmountIdr), "the amount is inside the code");
    assert.equal(tags.find(([x]) => x === "01")[1], "12", "dynamic");
    assert.equal(crc16(pay.body.qris.payload.slice(0, -4)), pay.body.qris.payload.slice(-4), "valid CRC");
    assert.equal(pay.body.qris.merchantName, "Toko Contoh");

    const other = await createTenant();
    assert.equal((await api().get(`/api/v1/ai/topups/${bill.id}/pay`).set(bearer(other.ownerToken))).status, 404, "another shop cannot see it");
  });

  test("a payment of that exact amount adds the tokens by itself, once", async () => {
    const t = await createTenant({ ai_token_quota: 100000 });
    const bill = (await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens: 500000 })).body.data;
    const r = ref();
    const res = await notify({ amount: bill.payAmountIdr, reference: r, source: "gopay", payer: "Budi" });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual([res.body.status, res.body.matchedType, res.body.matchedId], ["matched", "topup", bill.id]);
    assert.equal(await quotaOf(t), 600000);
    const settled = await row("SELECT status, paid_via, credited_by FROM token_topups WHERE id = ?", [bill.id]);
    assert.deepEqual([settled.status, settled.paid_via, settled.credited_by], ["credited", "auto", null]);

    const again = await notify({ amount: bill.payAmountIdr, reference: r });
    assert.deepEqual([again.status, again.body.status], [200, "duplicate"]);
    const stranger = await notify({ amount: bill.payAmountIdr, reference: ref() });
    assert.equal(stranger.body.status, "unmatched", "the bill is closed, nothing is waiting for that amount any more");
    assert.equal(await quotaOf(t), 600000, "added once");

    const history = await api().get("/api/v1/ai/topups").set(bearer(t.ownerToken));
    assert.equal(history.body.data[0].status, "credited");
    assert.equal(history.body.data[0].paidVia, "auto");
  });

  test("two notices of the same amount at once settle the bill only once", async () => {
    const t = await createTenant({ ai_token_quota: 0 });
    const bill = (await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens: 500000 })).body.data;
    const [a, b] = await Promise.all([notify({ amount: bill.payAmountIdr, reference: ref() }), notify({ amount: bill.payAmountIdr, reference: ref() })]);
    assert.deepEqual([a.body.status, b.body.status].sort(), ["matched", "unmatched"]);
    assert.equal(await quotaOf(t), 500000);
  });

  test("open bills of the same price never wait for the same amount", async () => {
    const shops = await Promise.all([createTenant(), createTenant(), createTenant()]);
    const bills = [];
    for (const t of shops) for (let i = 0; i < 3; i++) bills.push((await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens: 1000000 })).body.data.payAmountIdr);
    assert.equal(new Set(bills).size, bills.length, "nine bills, nine different amounts");
    assert.ok(bills.every((amount) => amount > 135000 && amount <= 135099));
  });

  test("a cancelled bill gives its amount back, and a new price from the team gets a fresh code", async () => {
    const t = await createTenant();
    const bill = (await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens: 500000 })).body.data;
    await api().post(`/api/v1/ai/topups/${bill.id}/cancel`).set(bearer(t.ownerToken));
    assert.equal((await notify({ amount: bill.payAmountIdr, reference: ref() })).body.status, "unmatched", "a cancelled bill is not matched");

    const open = (await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens: 500000 })).body.data;
    const requote = await api().put(`/api/v1/ai/topups/${open.id}/quote`).set(bearer(sa.token)).send({ amountIdr: 50000, note: "Harga khusus" });
    assert.equal(requote.status, 200);
    assert.ok(requote.body.data.payAmountIdr > 50000 && requote.body.data.payAmountIdr <= 50099);
    assert.equal((await notify({ amount: open.payAmountIdr, reference: ref() })).body.status, "unmatched", "the old amount no longer matches");
    assert.equal((await notify({ amount: requote.body.data.payAmountIdr, reference: ref() })).body.status, "matched");
  });
});

describe("buying a package", () => {
  test("a shop sees what it can buy, with the introductory discount on its first purchase", async () => {
    const t = await createTenant();
    const res = await plans(t);
    assert.equal(res.status, 200);
    assert.equal(res.body.firstPurchase, true);
    const pro = res.body.plans.find((p) => p.plan === "pro");
    assert.deepEqual([pro.monthly.priceIdr, pro.monthly.percent, pro.annual.priceIdr, pro.annual.percent, pro.tokensPerMonth], [419300, 30, 5750400, 20, 1000000]);
    assert.deepEqual(pro.monthly, planOffer("pro", "monthly"));
    assert.equal((await api().get("/api/v1/billing/plans").set(bearer(t.csToken))).status, 403, "cs cannot buy");
  });

  test("choosing a plan makes a bill with the exact amount and its QRIS; paying it applies the plan, features and tokens", async () => {
    const t = await createTenant({ ai_token_quota: 200000 });
    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [t.institutionId]);
    const made = await buy(t, "pro", "monthly");
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const order = made.body.order;
    assert.deepEqual([order.status, order.plan, order.period, order.baseAmountIdr, order.discountIdr], ["pending", "pro", "monthly", 419300, 179700]);
    assert.equal(order.payAmountIdr, 419300 + order.uniqueCode);
    assert.equal(parseTlv(made.body.qris.payload).find(([x]) => x === "54")[1], String(order.payAmountIdr));

    const before = await shopRow(t);
    assert.equal(before.subscription_tier, "starter");
    const res = await notify({ amount: order.payAmountIdr, reference: ref(), source: "gopay" });
    assert.deepEqual([res.body.status, res.body.matchedType, res.body.matchedId], ["matched", "order", order.id]);

    const after = await shopRow(t);
    assert.equal(after.subscription_tier, "pro", "the plan");
    assert.equal(num(after.ai_token_quota), 200000 + 1000000, "the plan's tokens");
    const f = features(after);
    for (const key of PLAN_FEATURES.pro) assert.equal(f[key], true, `${key} on`);
    assert.equal(f.baileys, false);
    const days = (new Date(after.subscription_expires_at) - Date.now()) / 86400000;
    assert.ok(days > 27 && days < 32, `about a month (${days})`);

    const shown = await api().get(`/api/v1/billing/orders/${order.id}`).set(bearer(t.ownerToken));
    assert.deepEqual([shown.body.order.status, shown.body.order.paidVia, shown.body.order.tokensGranted, shown.body.qris], ["paid", "auto", 1000000, null]);
    assert.equal(new Date(shown.body.order.activatedUntil).getTime(), new Date(after.subscription_expires_at).getTime());
  });

  test("a Starter plan switches the features off that it does not include", async () => {
    const t = await createTenant();
    const order = (await buy(t, "starter", "monthly")).body.order;
    await notify({ amount: order.payAmountIdr, reference: ref() });
    const f = features(await shopRow(t));
    assert.equal(f.tasks, true);
    assert.equal(f.voiceAi, false);
    assert.equal(f.multiAgent, false);
    assert.equal(num((await shopRow(t)).ai_token_quota), 1000000 + 700000);
  });

  test("the discount is for the first purchase only; renewing the same plan extends from the current end; annual gives a year of tokens", async () => {
    const t = await createTenant({ ai_token_quota: 0 });
    const first = (await buy(t, "pro", "monthly")).body.order;
    assert.equal(first.baseAmountIdr, 419300);
    await notify({ amount: first.payAmountIdr, reference: ref() });
    const end1 = new Date((await shopRow(t)).subscription_expires_at);

    const renew = (await buy(t, "pro", "monthly")).body.order;
    assert.equal(renew.baseAmountIdr, 599000, "regular price now");
    assert.equal(renew.discountIdr, 0);
    await notify({ amount: renew.payAmountIdr, reference: ref() });
    const end2 = new Date((await shopRow(t)).subscription_expires_at);
    assert.equal(end2.getTime(), addMonths(end1, 1).getTime(), "continues from the end of the paid month");
    assert.equal(await quotaOf(t), 2000000);

    const annual = (await buy(t, "pro", "annual")).body.order;
    assert.deepEqual([annual.baseAmountIdr, annual.months], [7188000, 12]);
    await notify({ amount: annual.payAmountIdr, reference: ref() });
    assert.equal(new Date((await shopRow(t)).subscription_expires_at).getTime(), addMonths(end2, 12).getTime());
    assert.equal(await quotaOf(t), 2000000 + 12000000, "a bundle for each month bought");
  });

  test("moving to another plan starts from now, not from the end of the old one", async () => {
    const t = await createTenant();
    const starter = (await buy(t, "starter", "annual")).body.order;
    await notify({ amount: starter.payAmountIdr, reference: ref() });
    const pro = (await buy(t, "pro", "monthly")).body.order;
    await notify({ amount: pro.payAmountIdr, reference: ref() });
    const shop = await shopRow(t);
    assert.equal(shop.subscription_tier, "pro");
    const days = (new Date(shop.subscription_expires_at) - Date.now()) / 86400000;
    assert.ok(days > 27 && days < 32, `a month from now, not a year (${days})`);
  });

  test("a shop has one open bill: a new choice replaces the old, whose amount no longer matches", async () => {
    const t = await createTenant();
    const a = (await buy(t, "starter", "monthly")).body.order;
    const b = (await buy(t, "pro", "annual")).body.order;
    const list = await api().get("/api/v1/billing/orders").set(bearer(t.ownerToken));
    assert.deepEqual(list.body.data.map((o) => o.status), ["pending", "cancelled"]);
    assert.equal((await notify({ amount: a.payAmountIdr, reference: ref() })).body.status, "unmatched");
    assert.equal((await notify({ amount: b.payAmountIdr, reference: ref() })).body.status, "matched");
    assert.equal((await shopRow(t)).subscription_tier, "pro");
  });

  test("an expired bill is not settled by a payment notice, but the team can still confirm it by hand", async () => {
    const t = await createTenant();
    const order = (await buy(t, "starter", "monthly")).body.order;
    await query("UPDATE platform_orders SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR) WHERE id = ?", [order.id]);
    const late = await notify({ amount: order.payAmountIdr, reference: ref() });
    assert.equal(late.body.status, "unmatched");
    const shown = await api().get(`/api/v1/billing/orders/${order.id}`).set(bearer(t.ownerToken));
    assert.equal(shown.body.order.status, "expired");
    assert.equal(shown.body.qris, null, "no code for a bill that is over");
    assert.equal((await api().post(`/api/v1/billing/orders/${order.id}/paid`).set(bearer(t.ownerToken)).send({})).body.code, "ORDER_CLOSED");

    const confirmed = await api().post(`/api/v1/billing/orders/${order.id}/confirm`).set(bearer(sa.token));
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    assert.deepEqual([confirmed.body.data.status, confirmed.body.data.paidVia], ["paid", "manual"]);
    assert.equal((await shopRow(t)).subscription_tier, "starter");
    assert.equal((await api().post(`/api/v1/billing/orders/${order.id}/confirm`).set(bearer(sa.token))).body.code, "ORDER_ALREADY_PAID", "only once");
  });

  test("saying it has paid marks the bill for the team; the team sees paid claims first and can cancel", async () => {
    const t = await createTenant();
    const order = (await buy(t, "pro", "monthly")).body.order;
    const claim = await api().post(`/api/v1/billing/orders/${order.id}/paid`).set(bearer(t.ownerToken)).send({ reference: "Transfer Budi 10.15" });
    assert.equal(claim.status, 200);
    assert.ok(claim.body.data.paymentClaimedAt);
    const queue = await api().get("/api/v1/billing/orders/admin?status=pending&limit=200").set(bearer(sa.token));
    assert.equal(queue.body.orders[0].id, order.id, "claimed bills first");
    assert.equal(queue.body.orders[0].paymentReference, "Transfer Budi 10.15");
    assert.ok(queue.body.orders[0].institutionName);
    const cancel = await api().post(`/api/v1/billing/orders/${order.id}/cancel-by-team`).set(bearer(sa.token));
    assert.equal(cancel.body.data.status, "cancelled");
    assert.equal((await api().post(`/api/v1/billing/orders/${order.id}/confirm`).set(bearer(sa.token))).body.code, "ORDER_CLOSED");
  });

  test("shops cannot see each other's bills, cs cannot buy, and confirming is for the team only", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const order = (await buy(a, "starter", "monthly")).body.order;
    assert.equal((await api().get(`/api/v1/billing/orders/${order.id}`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await api().post(`/api/v1/billing/orders/${order.id}/cancel`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await buy(a, "starter", "monthly", a.csToken)).status, 403);
    assert.equal((await api().post(`/api/v1/billing/orders/${order.id}/confirm`).set(bearer(a.ownerToken))).status, 403);
    assert.equal((await api().get("/api/v1/billing/orders/admin").set(bearer(a.ownerToken))).status, 403);
    assert.equal((await buy(a, "enterprise", "monthly")).status, 400, "enterprise is agreed with the team");
    assert.equal((await buy(a, "pro", "weekly")).status, 400);
  });
});

describe("payment notices", () => {
  test("only with the shared secret", async () => {
    assert.equal((await notify({ amount: 1000 }, "salah")).status, 401);
    assert.equal((await api().post("/api/v1/payments/platform-notify").send({ amount: 1000 })).status, 401);
    assert.equal((await notify({ amount: -5 })).status, 400);
    assert.equal((await notify({ amount: 100.5 })).status, 400, "whole rupiah only");
    assert.equal((await notify({})).status, 400);
  });

  test("the amount can arrive the way a notification writes it", async () => {
    const t = await createTenant({ ai_token_quota: 0 });
    const bill = (await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens: 500000 })).body.data;
    const text = `Rp ${bill.payAmountIdr.toLocaleString("id-ID")},00`;
    const res = await notify({ amount: text, reference: ref() });
    assert.equal(res.body.status, "matched", text);
    assert.equal(await quotaOf(t), 500000);
  });

  test("an amount nothing waits for is kept for the team to look at", async () => {
    const res = await notify({ amount: 123456789, reference: "tak-dikenal-1", source: "gopay", payer: "Siapa" });
    assert.equal(res.body.status, "unmatched");
    const list = await api().get("/api/v1/platform/payment-notifications").set(bearer(sa.token));
    const found = list.body.data.find((n) => n.reference === "tak-dikenal-1");
    assert.deepEqual([found.status, found.amountIdr, found.source, found.payer], ["unmatched", 123456789, "gopay", "Siapa"]);
    assert.equal(list.body.notifyEnabled, true);
    const t = await createTenant();
    assert.equal((await api().get("/api/v1/platform/payment-notifications").set(bearer(t.ownerToken))).status, 403);
  });

  test("a matched notice is shown with the shop it settled", async () => {
    const t = await createTenant();
    const order = (await buy(t, "starter", "monthly")).body.order;
    const r = ref();
    await notify({ amount: order.payAmountIdr, reference: r });
    const list = await api().get("/api/v1/platform/payment-notifications?limit=100").set(bearer(sa.token));
    const found = list.body.data.find((n) => n.reference === r);
    assert.deepEqual([found.status, found.matchedType, found.matchedId, found.institutionId], ["matched", "order", order.id, t.institutionId]);
    assert.ok(found.institutionName);
  });

  test("a shop's screens are told when its payment settles", async () => {
    const t = await createTenant();
    const order = (await buy(t, "starter", "monthly")).body.order;
    const { setRealtimeForTests } = await import("../src/realtime.js");
    const events = [];
    setRealtimeForTests({ to: () => ({ emit: (name, payload) => events.push([name, payload]) }) });
    try {
      await notify({ amount: order.payAmountIdr, reference: ref() });
    } finally {
      setRealtimeForTests(null);
    }
    assert.ok(events.some(([name, payload]) => name === "billing:updated" && payload.status === "paid" && payload.plan === "starter"), JSON.stringify(events));
  });
});
