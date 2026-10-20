import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { assertTokenQuota } from "../src/services/tokenService.js";
import { TIER_TOKEN_BUNDLE, TOPUP_PACKS, topupPrice } from "../src/utils/constants.js";

before(setupDatabase);
after(teardownDatabase);

const row = async (sql, params) => (await query(sql, params))[0];
const quotaOf = async (t) => Number((await row("SELECT ai_token_quota AS q FROM institutions WHERE id = ?", [t.institutionId])).q);
const ask = (t, body, token = t.ownerToken) => api().post("/api/v1/ai/topups").set(bearer(token)).send(body);
const quote = (sa, id, body) => api().put(`/api/v1/ai/topups/${id}/quote`).set(bearer(sa.token)).send(body);
const credit = (sa, id) => api().post(`/api/v1/ai/topups/${id}/credit`).set(bearer(sa.token));

describe("asking for more tokens", () => {
  test("an owner asks for an amount and is priced from the list at once; it shows with the balance and the price list", async () => {
    const t = await createTenant({ ai_token_quota: 500000 });
    const res = await ask(t, { tokens: 500000, note: "Promo akhir bulan" });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual([res.body.data.tokens, res.body.data.status, res.body.data.quotedAmountIdr, res.body.data.note, res.body.data.quotedBySystem], [500000, "quoted", 75000, "Promo akhir bulan", true]);

    const list = await api().get("/api/v1/ai/topups").set(bearer(t.ownerToken));
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.balance.totalQuota, 500000);
    assert.deepEqual(list.body.rules, { step: 100000, min: 100000, max: 100000000, maxOpen: 3 });
    assert.deepEqual(list.body.packs.map((p) => [p.tokens, p.priceIdr]), [[500000, 75000], [1000000, 135000], [2500000, 315000], [5000000, 595000]]);
  });

  test("the price list: packs at their price, other amounts at the nearest pack's rate, cheaper per token as the pack grows", () => {
    for (const pack of TOPUP_PACKS) assert.equal(topupPrice(pack.tokens), pack.priceIdr);
    assert.equal(topupPrice(700000), 105000);
    assert.equal(topupPrice(100000), 15000);
    assert.equal(topupPrice(10000000), 1190000);
    const perThousand = TOPUP_PACKS.map((p) => p.priceIdr / (p.tokens / 1000));
    assert.deepEqual([...perThousand].sort((a, b) => b - a), perThousand, "the rate falls as the pack grows");
    assert.ok(perThousand.every((r) => r >= 110 && r <= 160), "affordable and not suspiciously cheap");
    let last = 0;
    for (let tokens = 100000; tokens <= 6000000; tokens += 100000) {
      const price = topupPrice(tokens);
      assert.ok(price >= last, `price never drops as the amount grows (${tokens})`);
      assert.equal(price % 1000, 0);
      last = price;
    }
  });

  test("the price of an amount can be asked before asking for it, and bad amounts are refused", async () => {
    const t = await createTenant();
    const get = (tokens) => api().get(`/api/v1/ai/topups/price?tokens=${tokens}`).set(bearer(t.ownerToken));
    const pack = await get(1000000);
    assert.deepEqual([pack.status, pack.body.data.priceIdr, pack.body.data.perThousandIdr], [200, 135000, 135]);
    assert.equal((await get(700000)).body.data.priceIdr, 105000);
    assert.equal((await get(150000)).body.code, "INVALID_TOKEN_AMOUNT");
    assert.equal((await get("abc")).status, 400);
    assert.equal((await api().get("/api/v1/ai/topups/price?tokens=100000").set(bearer(t.csToken))).status, 403);
    const made = await ask(t, { tokens: 700000 });
    assert.equal(made.body.data.quotedAmountIdr, 105000, "asking for it charges what was shown");
  });

  test("saying it has paid marks the request for the team, with the reference, once it is open", async () => {
    const t = await createTenant();
    const sa = await createSuperadmin();
    const { body } = await ask(t, { tokens: 1000000 });
    const paid = await api().post(`/api/v1/ai/topups/${body.data.id}/paid`).set(bearer(t.ownerToken)).send({ reference: "Transfer a.n. Budi jam 14.20" });
    assert.equal(paid.status, 200);
    assert.deepEqual([paid.body.data.paymentReference, Boolean(paid.body.data.paymentClaimedAt)], ["Transfer a.n. Budi jam 14.20", true]);
    assert.equal((await api().post(`/api/v1/ai/topups/${body.data.id}/paid`).set(bearer(t.csToken)).send({})).status, 403);
    const queue = await api().get("/api/v1/ai/topups/admin?status=quoted").set(bearer(sa.token));
    assert.equal(queue.body.topups[0].id, body.data.id, "payments to confirm come first");
    await api().post(`/api/v1/ai/topups/${body.data.id}/cancel`).set(bearer(t.ownerToken));
    assert.equal((await api().post(`/api/v1/ai/topups/${body.data.id}/paid`).set(bearer(t.ownerToken)).send({})).body.code, "TOPUP_CLOSED");
  });

  test("the amount must be a whole step inside the limits", async () => {
    const t = await createTenant();
    for (const tokens of [0, 50000, 150000, 100100000, 123456, -100000]) {
      const res = await ask(t, { tokens });
      assert.equal(res.status, 400, `${tokens} refused`);
    }
    assert.equal((await ask(t, { tokens: "banyak" })).status, 400);
    assert.equal((await ask(t, { tokens: 100000, note: "x".repeat(301) })).status, 400);
    assert.equal((await ask(t, { tokens: 100000 })).status, 201);
  });

  test("only managers ask, and shops never see each other's requests", async () => {
    const a = await createTenant();
    const b = await createTenant();
    assert.equal((await ask(a, { tokens: 100000 }, a.csToken)).status, 403);
    assert.equal((await ask(a, { tokens: 100000 }, a.financeToken)).status, 403);
    const mine = await ask(a, { tokens: 200000 });
    assert.equal((await api().get("/api/v1/ai/topups").set(bearer(b.ownerToken))).body.data.length, 0);
    assert.equal((await api().post(`/api/v1/ai/topups/${mine.body.data.id}/cancel`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await api().get("/api/v1/ai/topups").set(bearer(a.csToken))).status, 403);
  });

  test("at most three open requests at a time, even when they arrive together", async () => {
    const t = await createTenant();
    const results = await Promise.all(Array.from({ length: 6 }, () => ask(t, { tokens: 100000 })));
    assert.equal(results.filter((r) => r.status === 201).length, 3);
    assert.ok(results.filter((r) => r.status === 409).every((r) => r.body.code === "TOPUP_OPEN_LIMIT"));
    const first = results.find((r) => r.status === 201);
    assert.equal((await api().post(`/api/v1/ai/topups/${first.body.data.id}/cancel`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await ask(t, { tokens: 100000 })).status, 201, "cancelling frees a place");
  });

  test("a shop can withdraw a request that is open, but not twice", async () => {
    const t = await createTenant();
    const { body } = await ask(t, { tokens: 300000 });
    const done = await api().post(`/api/v1/ai/topups/${body.data.id}/cancel`).set(bearer(t.ownerToken));
    assert.equal(done.body.data.status, "cancelled");
    const again = await api().post(`/api/v1/ai/topups/${body.data.id}/cancel`).set(bearer(t.ownerToken));
    assert.deepEqual([again.status, again.body.code], [409, "TOPUP_CLOSED"]);
  });
});

describe("the team prices and credits", () => {
  test("quote, then credit: the tokens are added to the quota, once", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant({ ai_token_quota: 1000 });
    const { body } = await ask(t, { tokens: 500000 });

    assert.equal(body.data.quotedAmountIdr, 75000, "priced from the list");
    const quoted = await quote(sa, body.data.id, { amountIdr: 125000, note: "Transfer ke rekening Klozer, kirim bukti" });
    assert.deepEqual([quoted.body.data.status, quoted.body.data.quotedAmountIdr, quoted.body.data.quoteNote], ["quoted", 125000, "Transfer ke rekening Klozer, kirim bukti"]);
    const seen = (await api().get("/api/v1/ai/topups").set(bearer(t.ownerToken))).body.data[0];
    assert.deepEqual([seen.status, seen.quotedAmountIdr], ["quoted", 125000], "the shop sees the price");

    const credited = await credit(sa, body.data.id);
    assert.equal(credited.status, 200);
    assert.equal(credited.body.balance.totalQuota, 501000);
    assert.equal(await quotaOf(t), 501000);

    const twice = await credit(sa, body.data.id);
    assert.deepEqual([twice.status, twice.body.code], [409, "TOPUP_ALREADY_CREDITED"]);
    assert.equal(await quotaOf(t), 501000, "never added twice");
    assert.equal((await quote(sa, body.data.id, { amountIdr: 1 })).status, 409, "a credited request cannot be repriced");
    assert.equal((await api().post(`/api/v1/ai/topups/${body.data.id}/cancel`).set(bearer(t.ownerToken))).status, 409);
  });

  test("two people pressing credit at the same moment add the tokens once", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant({ ai_token_quota: 0 });
    const { body } = await ask(t, { tokens: 200000 });
    await quote(sa, body.data.id, { amountIdr: 50000 });
    const results = await Promise.all([credit(sa, body.data.id), credit(sa, body.data.id), credit(sa, body.data.id)]);
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal(await quotaOf(t), 200000);
  });

  test("a shop that ran out of tokens can use the AI again after the top up", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant({ ai_token_quota: 1000 });
    await query("UPDATE institutions SET ai_tokens_used = ai_token_quota WHERE id = ?", [t.institutionId]);
    await assert.rejects(assertTokenQuota(t.institutionId), (err) => err.code === "TOKEN_QUOTA_EXHAUSTED");
    const { body } = await ask(t, { tokens: 100000 });
    await quote(sa, body.data.id, { amountIdr: 30000 });
    await credit(sa, body.data.id);
    assert.equal((await assertTokenQuota(t.institutionId)).remainingTokens, 100000);
  });

  test("the price must be a positive amount, and the request can be repriced while open", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const { body } = await ask(t, { tokens: 100000 });
    assert.equal(body.data.quotedAmountIdr, 15000);
    assert.equal((await quote(sa, body.data.id, { amountIdr: 0 })).status, 400);
    assert.equal((await quote(sa, body.data.id, { amountIdr: "murah" })).status, 400);
    await quote(sa, body.data.id, { amountIdr: 40000 });
    assert.equal((await quote(sa, body.data.id, { amountIdr: 35000 })).body.data.quotedAmountIdr, 35000);
  });

  test("the queue lists every shop's requests, open ones first, and the team can cancel one", async () => {
    const sa = await createSuperadmin();
    const a = await createTenant();
    const b = await createTenant();
    const one = await ask(a, { tokens: 100000 });
    const two = await ask(b, { tokens: 200000 });
    await quote(sa, two.body.data.id, { amountIdr: 75000 });
    await credit(sa, two.body.data.id);

    const queue = await api().get("/api/v1/ai/topups/admin").set(bearer(sa.token));
    assert.equal(queue.status, 200);
    const mine = queue.body.topups.filter((x) => [one.body.data.id, two.body.data.id].includes(x.id));
    assert.deepEqual(mine.map((x) => x.status), ["quoted", "credited"]);
    assert.ok(mine[0].institutionName);
    assert.ok(queue.body.open >= 1);

    const onlyOpen = await api().get("/api/v1/ai/topups/admin?status=quoted").set(bearer(sa.token));
    assert.ok(onlyOpen.body.topups.length >= 1 && onlyOpen.body.topups.every((x) => x.status === "quoted"));
    assert.equal((await api().get("/api/v1/ai/topups/admin?status=nonsense").set(bearer(sa.token))).status, 400);

    const cancelled = await api().post(`/api/v1/ai/topups/${one.body.data.id}/cancel-by-team`).set(bearer(sa.token));
    assert.equal(cancelled.body.data.status, "cancelled");
  });

  test("shops cannot use the team's side", async () => {
    const t = await createTenant();
    const { body } = await ask(t, { tokens: 100000 });
    for (const [method, path, send] of [
      ["get", "/api/v1/ai/topups/admin"],
      ["put", `/api/v1/ai/topups/${body.data.id}/quote`, { amountIdr: 1000 }],
      ["post", `/api/v1/ai/topups/${body.data.id}/credit`],
      ["post", `/api/v1/ai/topups/${body.data.id}/cancel-by-team`],
    ]) {
      const res = await api()[method](path).set(bearer(t.ownerToken)).send(send);
      assert.equal(res.status, 403, `${method} ${path}`);
    }
    assert.equal(await quotaOf(t), 1000000);
  });

  test("every step is recorded in the audit log", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const { body } = await ask(t, { tokens: 100000 });
    await quote(sa, body.data.id, { amountIdr: 25000 });
    await api().post(`/api/v1/ai/topups/${body.data.id}/paid`).set(bearer(t.ownerToken)).send({ reference: "ref" });
    await credit(sa, body.data.id);
    const actions = (await query("SELECT action FROM audit_logs WHERE institution_id = ? AND action LIKE 'token_topup.%' ORDER BY id", [t.institutionId])).map((r) => r.action);
    assert.deepEqual(actions, ["token_topup.request", "token_topup.quote", "token_topup.paid_claim", "token_topup.credit"]);
  });
});

describe("tokens that come with a plan", () => {
  test("the bundles are 700.000 for Starter and 1.000.000 for Pro", () => {
    assert.deepEqual({ ...TIER_TOKEN_BUNDLE }, { starter: 700000, pro: 1000000 });
  });

  test("a shop created by the platform gets the Pro bundle", async () => {
    const sa = await createSuperadmin();
    const res = await api().post("/api/v1/institutions").set(bearer(sa.token)).send({ name: `Toko Baru ${Date.now()}`, email: `baru${Date.now()}@toko.test` });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(Number(res.body.data.ai_token_quota ?? res.body.data.aiTokenQuota), 1000000);
  });

  test("moving a shop to a plan brings that plan's bundle without taking anything away", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant({ ai_token_quota: 200000 });
    await query("UPDATE institutions SET ai_tokens_used = 150000, subscription_tier = 'enterprise' WHERE id = ?", [t.institutionId]);

    await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ subscription_tier: "starter" });
    assert.equal(await quotaOf(t), 150000 + 700000, "at least the Starter bundle is left");

    await query("UPDATE institutions SET ai_token_quota = 5000000, ai_tokens_used = 100000 WHERE id = ?", [t.institutionId]);
    await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ subscription_tier: "pro" });
    assert.equal(await quotaOf(t), 5000000, "tokens already bought or granted are never reduced");

    await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ subscription_tier: "starter", ai_token_quota: 123456 });
    assert.equal(await quotaOf(t), 123456, "a quota set by hand wins");

    await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ subscription_tier: "enterprise" });
    assert.equal(await quotaOf(t), 123456, "enterprise has no fixed bundle");

    await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ name: "Nama Baru" });
    assert.equal(await quotaOf(t), 123456, "an edit that is not a plan change leaves the quota alone");
  });
});
