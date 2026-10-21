import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { staticQris } from "./qrisFixture.js";

after(teardownDatabase);

const SECRET = "test-notify-secret";
let sa;
let PROOF; // a picture of a "transfer proof"
let OTHER_PROOF;
let seq = 0;

before(async () => {
  await setupDatabase();
  sa = await createSuperadmin();
  const method = (await api().post("/api/v1/platform/payment-methods").set(bearer(sa.token)).send({ kind: "qris", label: "QRIS", sortOrder: 1 })).body.data;
  const png = await QRCode.toBuffer(staticQris(), { errorCorrectionLevel: "M", margin: 4, width: 300 });
  await api().put(`/api/v1/platform/payment-methods/${method.id}/qris`).set(bearer(sa.token)).send({ fileBase64: png.toString("base64") });
  await api().put(`/api/v1/platform/payment-methods/${method.id}`).set(bearer(sa.token)).send({ isActive: true });
  PROOF = await QRCode.toBuffer("bukti transfer 1", { margin: 2, width: 200 });
  OTHER_PROOF = await QRCode.toBuffer("bukti transfer 2", { margin: 2, width: 200 });
});

/** A picture nobody has uploaded before (the same picture twice is flagged, which is what these tests must not trip over). */
const unique = () => QRCode.toBuffer(`bukti-${Date.now()}-${++seq}`, { margin: 2, width: 200 });
const ref = () => `proof-${Date.now().toString(36)}-${++seq}`;
const notify = (body) => api().post("/api/v1/payments/platform-notify").set("X-Notify-Secret", SECRET).send(body);
const topup = async (t, tokens = 500000) => (await api().post("/api/v1/ai/topups").set(bearer(t.ownerToken)).send({ tokens })).body.data;
const order = async (t, plan = "starter", period = "monthly") => (await api().post("/api/v1/billing/orders").set(bearer(t.ownerToken)).send({ plan, period })).body.order;
const sendProof = (kind, id, buffer, token, extra = {}) => api().post(kind === "topup" ? `/api/v1/ai/topups/${id}/proof` : `/api/v1/billing/orders/${id}/proof`).set(bearer(token)).send({ fileBase64: buffer.toString("base64"), fileName: "bukti.png", ...extra });
const detail = (type, id, token = sa.token) => api().get(`/api/v1/billing/detail/${type}/${id}`).set(bearer(token));
const summary = (days = 30) => api().get(`/api/v1/billing/summary?days=${days}`).set(bearer(sa.token));

describe("a shop uploads proof of its payment", () => {
  test("a picture goes on a top up bill and on a package bill, and the count shows on the bill", async () => {
    const t = await createTenant();
    const bill = await topup(t);
    const up = await sendProof("topup", bill.id, PROOF, t.ownerToken, { note: "Transfer jam 10.15" });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    assert.equal(up.body.proofCount, 1);
    const list = await api().get("/api/v1/ai/topups").set(bearer(t.ownerToken));
    assert.equal(list.body.data[0].proofCount, 1);

    const o = await order(t);
    assert.equal((await sendProof("order", o.id, PROOF, t.ownerToken)).status, 201);
    const orders = await api().get("/api/v1/billing/orders").set(bearer(t.ownerToken));
    assert.equal(orders.body.data[0].proofCount, 1);
  });

  test("only managers of that shop, only real pictures, a few per bill, nothing on a cancelled bill", async () => {
    const t = await createTenant();
    const other = await createTenant();
    const bill = await topup(t);
    assert.equal((await sendProof("topup", bill.id, PROOF, t.csToken)).status, 403, "cs cannot");
    assert.equal((await sendProof("topup", bill.id, PROOF, other.ownerToken)).status, 404, "another shop cannot");
    assert.ok([400, 415].includes((await sendProof("topup", bill.id, Buffer.from("<html><script>alert(1)</script></html>"), t.ownerToken)).status), "a page is refused");
    assert.equal((await sendProof("topup", bill.id, Buffer.concat([PROOF, Buffer.alloc(3_100_000)]), t.ownerToken)).status, 413, "too large");
    assert.equal((await api().post(`/api/v1/ai/topups/${bill.id}/proof`).set(bearer(t.ownerToken)).send({ fileBase64: "%%%tidak base64 sama sekali, cukup panjang untuk lolos%%%" })).status, 400);

    for (let i = 0; i < 3; i++) assert.equal((await sendProof("topup", bill.id, Buffer.concat([PROOF, Buffer.from([i])]), t.ownerToken)).status, 201);
    assert.equal((await sendProof("topup", bill.id, PROOF, t.ownerToken)).body.code, "PROOF_LIMIT");

    const gone = await topup(t, 1000000);
    await api().post(`/api/v1/ai/topups/${gone.id}/cancel`).set(bearer(t.ownerToken));
    assert.equal((await sendProof("topup", gone.id, PROOF, t.ownerToken)).body.code, "BILL_CLOSED");
  });
});

describe("the team checks one payment", () => {
  test("detail shows the shop, the bill, the proof, the notice and the history in order", async () => {
    const t = await createTenant({ ai_token_quota: 100000 });
    const bill = await topup(t);
    await api().post(`/api/v1/ai/topups/${bill.id}/paid`).set(bearer(t.ownerToken)).send({ reference: "Budi, 10.15" });
    let d = (await detail("topup", bill.id)).body.data;
    assert.equal(d.signals.claimedWithoutProof, true, "said paid, nothing shown yet");
    assert.equal(d.signals.proofCount, 0);

    await sendProof("topup", bill.id, await unique(), t.ownerToken);
    await notify({ amount: bill.payAmountIdr, reference: ref(), source: "gopay", payer: "Budi" });
    d = (await detail("topup", bill.id)).body.data;
    assert.equal(d.shop.id, t.institutionId);
    assert.equal(d.shop.tokenQuota, 600000);
    assert.deepEqual([d.bill.status, d.bill.payAmountIdr, d.bill.paidVia], ["credited", bill.payAmountIdr, "auto"]);
    assert.deepEqual([d.signals.claimedWithoutProof, d.signals.noticeMatched, d.signals.noticeAmountMatches, d.signals.confirmedByHandWithoutNotice, d.signals.proofReusedElsewhere], [false, true, true, false, false]);
    assert.deepEqual(d.timeline.map((x) => x.kind), ["created", "claimed", "proof", "notice", "settled"]);
    assert.equal(d.timeline.find((x) => x.kind === "notice").source, "gopay");
    assert.equal(d.timeline.find((x) => x.kind === "claimed").reference, "Budi, 10.15");
    assert.equal(d.timeline.find((x) => x.kind === "settled").via, "auto");
    assert.equal(d.proofs.length, 1);
    assert.ok(!("sha256" in d.proofs[0]), "the fingerprint is not sent");
    assert.ok(d.audit.some((a) => a.action === "billing.proof_upload" || a.action === "token_topup.paid_claim"));
  });

  test("the proof picture is served to the team only, exactly as uploaded", async () => {
    const t = await createTenant();
    const bill = await topup(t);
    const mine = await unique();
    await sendProof("topup", bill.id, mine, t.ownerToken);
    const d = (await detail("topup", bill.id)).body.data;
    const image = await api().get(d.proofs[0].url).set(bearer(sa.token)).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(image.status, 200);
    assert.equal(image.headers["content-type"], "image/png");
    assert.equal(image.headers["x-content-type-options"], "nosniff");
    assert.match(image.headers["cache-control"], /no-store/);
    assert.ok(Buffer.compare(image.body, mine) === 0);
    assert.equal((await api().get(d.proofs[0].url).set(bearer(t.ownerToken))).status, 403, "the shop cannot open it through the team's route");
    assert.equal((await api().get(d.proofs[0].url)).status, 401);
    assert.equal((await api().get("/api/v1/platform/payment-proofs/99999999").set(bearer(sa.token))).status, 404);
  });

  test("a bill confirmed by hand with no payment notice behind it is flagged", async () => {
    const t = await createTenant();
    const o = await order(t, "pro", "monthly");
    await api().post(`/api/v1/billing/orders/${o.id}/confirm`).set(bearer(sa.token));
    const d = (await detail("order", o.id)).body.data;
    assert.equal(d.signals.confirmedByHandWithoutNotice, true);
    assert.equal(d.bill.paidVia, "manual");
    const settled = d.timeline.find((x) => x.kind === "settled");
    assert.deepEqual([settled.via, typeof settled.by], ["manual", "string"], "who confirmed it");
    assert.equal(d.shop.tier, "pro");
  });

  test("the same picture on another bill, even of another shop, is flagged on both", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const billA = await topup(a);
    const billB = await topup(b);
    await sendProof("topup", billA.id, OTHER_PROOF, a.ownerToken);
    assert.equal((await detail("topup", billA.id)).body.data.signals.proofReusedElsewhere, false, "alone, nothing to flag");
    await sendProof("topup", billB.id, OTHER_PROOF, b.ownerToken);
    const da = (await detail("topup", billA.id)).body.data;
    const db = (await detail("topup", billB.id)).body.data;
    assert.equal(da.signals.proofReusedElsewhere, true);
    assert.equal(db.signals.proofReusedElsewhere, true);
    assert.equal(db.proofs[0].reusedOn[0].refId, billA.id);
    assert.ok(db.proofs[0].reusedOn[0].institutionName);
    const s = (await summary()).body.data;
    assert.ok(s.attention.reusedProofs >= 1);
  });

  test("detail and summary are for the team only, and the input is checked", async () => {
    const t = await createTenant();
    const bill = await topup(t);
    assert.equal((await detail("topup", bill.id, t.ownerToken)).status, 403);
    assert.equal((await api().get("/api/v1/billing/summary").set(bearer(t.ownerToken))).status, 403);
    assert.equal((await detail("topup", 99999999)).status, 404);
    assert.equal((await detail("order", 99999999)).status, 404);
    assert.equal((await detail("cicilan", 1)).status, 400);
    assert.equal((await api().get("/api/v1/billing/summary?days=0").set(bearer(sa.token))).status, 400);
  });
});

describe("following the money", () => {
  test("the summary counts what was received by how it was confirmed, what waits, and what deserves a look", async () => {
    const before = (await summary()).body.data;
    const a = await createTenant();
    const b = await createTenant();
    const c = await createTenant();
    const auto = await topup(a);
    await notify({ amount: auto.payAmountIdr, reference: ref(), source: "gopay" });
    const manual = await order(b, "starter", "monthly");
    await api().post(`/api/v1/billing/orders/${manual.id}/confirm`).set(bearer(sa.token));
    const waiting = await topup(c);
    await api().post(`/api/v1/ai/topups/${waiting.id}/paid`).set(bearer(c.ownerToken)).send({});
    await notify({ amount: 4242424, reference: ref(), source: "gopay" });

    const after = (await summary()).body.data;
    const manualPaid = (await detail("order", manual.id)).body.data.bill.payAmountIdr;
    assert.equal(after.receivedIdr - before.receivedIdr, auto.payAmountIdr + manualPaid);
    assert.equal(after.received.topups.count - before.received.topups.count, 1);
    assert.equal(after.received.orders.count - before.received.orders.count, 1);
    assert.equal(after.received.auto.amountIdr - before.received.auto.amountIdr, auto.payAmountIdr, "only the notice-matched one counts as automatic");
    assert.equal(after.waiting.count - before.waiting.count, 1);
    assert.equal(after.attention.claimedWithoutProof - before.attention.claimedWithoutProof, 1);
    assert.equal(after.attention.confirmedByHandWithoutNotice - before.attention.confirmedByHandWithoutNotice, 1);
    assert.equal(after.attention.unmatchedNotices.amountIdr - before.attention.unmatchedNotices.amountIdr, 4242424);
  });

  test("a grant is not money received", async () => {
    const before = (await summary()).body.data;
    const t = await createTenant();
    await api().post("/api/v1/ai/topups/grant").set(bearer(sa.token)).send({ institutionId: t.institutionId, tokens: 1000000, reason: "Hadiah" });
    const after = (await summary()).body.data;
    assert.equal(after.receivedIdr, before.receivedIdr);
    assert.equal((await query("SELECT COUNT(*) AS n FROM token_topups WHERE is_grant = 1"))[0].n > 0, true);
  });
});
