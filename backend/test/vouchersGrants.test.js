import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);

const row = async (sql, params) => (await query(sql, params))[0];
const quotaOf = async (t) => Number((await row("SELECT ai_token_quota AS q FROM institutions WHERE id = ?", [t.institutionId])).q);
const voucher = (sa, body) => api().post("/api/v1/platform/vouchers").set(bearer(sa.token)).send(body);
const ask = (t, body, token = t.ownerToken) => api().post("/api/v1/ai/topups").set(bearer(token)).send(body);
const price = (t, tokens, code) => api().get(`/api/v1/ai/topups/price?tokens=${tokens}${code ? `&voucher=${encodeURIComponent(code)}` : ""}`).set(bearer(t.ownerToken));
let n = 0;
const code = (p = "HEMAT") => `${p}${Date.now().toString(36).toUpperCase()}${++n}`;

describe("the team adds tokens to a client directly", () => {
  test("a grant adds to the quota at once, is kept with its reason, and shows in the client's history", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant({ ai_token_quota: 100000 });
    const res = await api().post("/api/v1/ai/topups/grant").set(bearer(sa.token)).send({ institutionId: t.institutionId, tokens: 250000, reason: "Ganti rugi gangguan layanan" });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual([res.body.data.status, res.body.data.isGrant, res.body.data.tokens, res.body.data.quotedAmountIdr, res.body.data.note], ["credited", true, 250000, 0, "Ganti rugi gangguan layanan"]);
    assert.equal(res.body.balance.totalQuota, 350000);
    assert.equal(await quotaOf(t), 350000);

    const history = await api().get("/api/v1/ai/topups").set(bearer(t.ownerToken));
    assert.equal(history.body.data[0].isGrant, true);
    assert.equal(history.body.balance.remainingTokens, 350000 - history.body.balance.consumedTokens);
    const audit = await row("SELECT action FROM audit_logs WHERE institution_id = ? AND action = 'token_topup.grant'", [t.institutionId]);
    assert.ok(audit, "recorded for the team");
  });

  test("only the team can grant, to a shop that exists, a sensible amount, with a reason", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const grant = (token, body) => api().post("/api/v1/ai/topups/grant").set(bearer(token)).send(body);
    assert.equal((await grant(t.ownerToken, { institutionId: t.institutionId, tokens: 100000, reason: "Coba sendiri" })).status, 403);
    assert.equal((await api().post("/api/v1/ai/topups/grant").send({})).status, 401);
    assert.equal((await grant(sa.token, { institutionId: 99999999, tokens: 100000, reason: "Toko tidak ada" })).status, 404);
    assert.equal((await grant(sa.token, { institutionId: t.institutionId, tokens: 100000 })).status, 400, "no reason");
    assert.equal((await grant(sa.token, { institutionId: t.institutionId, tokens: 1500, reason: "Bukan kelipatan" })).body.code, "INVALID_TOKEN_AMOUNT");
    assert.equal((await grant(sa.token, { institutionId: t.institutionId, tokens: 0, reason: "Nol" })).status, 400);
    assert.equal((await grant(sa.token, { institutionId: t.institutionId, tokens: 200000000, reason: "Terlalu besar" })).body.code, "INVALID_TOKEN_AMOUNT");
    const before = await quotaOf(t);
    assert.equal(before, 1000000, "nothing was added by the refused grants");
  });

  test("two grants at once both land", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant({ ai_token_quota: 0 });
    const send = () => api().post("/api/v1/ai/topups/grant").set(bearer(sa.token)).send({ institutionId: t.institutionId, tokens: 100000, reason: "Bersamaan" });
    const [a, b] = await Promise.all([send(), send()]);
    assert.deepEqual([a.status, b.status], [201, 201]);
    assert.equal(await quotaOf(t), 200000);
  });
});

describe("vouchers the team gives to clients", () => {
  test("a percent voucher discounts the bill, with the cap, and the bill keeps the list price and the discount", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const c = code();
    const made = await voucher(sa, { code: c.toLowerCase(), description: "Promo akhir bulan", discountType: "percent", discountValue: 20, maxDiscountIdr: 20000 });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    assert.equal(made.body.data.code, c, "codes are kept in capitals");

    const shown = await price(t, 1000000, c.toLowerCase());
    assert.deepEqual([shown.status, shown.body.data.priceIdr, shown.body.data.discountIdr, shown.body.data.chargeIdr], [200, 135000, 20000, 115000], "20 percent is Rp 27.000 but the cap is Rp 20.000");
    const small = await price(t, 500000, c);
    assert.deepEqual([small.body.data.discountIdr, small.body.data.chargeIdr], [15000, 60000], "20 percent of Rp 75.000, under the cap");

    const bill = await ask(t, { tokens: 1000000, voucher: c });
    assert.equal(bill.status, 201, JSON.stringify(bill.body));
    assert.deepEqual([bill.body.data.quotedAmountIdr, bill.body.data.listPriceIdr, bill.body.data.discountIdr, bill.body.data.voucherCode], [115000, 135000, 20000, c]);
    assert.match(bill.body.data.quoteNote, new RegExp(c));
  });

  test("a fixed voucher takes off an amount but never makes a bill free", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const c = code("TETAP");
    await voucher(sa, { code: c, discountType: "fixed", discountValue: 50000 });
    assert.equal((await price(t, 1000000, c)).body.data.chargeIdr, 85000);
    const big = code("BESAR");
    await voucher(sa, { code: big, discountType: "fixed", discountValue: 9000000 });
    const shown = await price(t, 500000, big);
    assert.deepEqual([shown.body.data.discountIdr, shown.body.data.chargeIdr], [74000, 1000], "at least Rp 1.000 is always charged");
  });

  test("a voucher is refused when it does not apply: unknown, off, not yet, expired, too small an amount", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const off = code("OFF");
    const later = code("NANTI");
    const past = code("LEWAT");
    const min = code("MIN");
    await voucher(sa, { code: off, discountType: "percent", discountValue: 10, isActive: false });
    await voucher(sa, { code: later, discountType: "percent", discountValue: 10, validFrom: new Date(Date.now() + 86400000).toISOString() });
    await voucher(sa, { code: past, discountType: "percent", discountValue: 10, validFrom: new Date(Date.now() - 2 * 86400000).toISOString(), validUntil: new Date(Date.now() - 86400000).toISOString() });
    await voucher(sa, { code: min, discountType: "percent", discountValue: 10, minTokens: 1000000 });

    assert.equal((await price(t, 500000, "TIDAKADA")).body.code, "VOUCHER_INVALID");
    assert.equal((await price(t, 500000, off)).body.code, "VOUCHER_INVALID");
    assert.equal((await price(t, 500000, later)).body.code, "VOUCHER_NOT_STARTED");
    assert.equal((await price(t, 500000, past)).body.code, "VOUCHER_EXPIRED");
    const tooSmall = await price(t, 500000, min);
    assert.equal(tooSmall.body.code, "VOUCHER_MIN_TOKENS");
    assert.equal((await price(t, 1000000, min)).status, 200);
    assert.equal((await ask(t, { tokens: 500000, voucher: min })).status, 400, "asking is refused the same way");
    assert.equal((await query("SELECT id FROM token_topups WHERE institution_id = ?", [t.institutionId])).length, 0, "no bill was made by a refused voucher");
  });

  test("a voucher for one client works only for that client, and other clients cannot tell it exists", async () => {
    const sa = await createSuperadmin();
    const mine = await createTenant();
    const other = await createTenant();
    const c = code("KHUSUS");
    assert.equal((await voucher(sa, { code: c, discountType: "percent", discountValue: 10, institutionId: mine.institutionId })).status, 201);
    assert.equal((await price(mine, 500000, c)).status, 200);
    const refused = await price(other, 500000, c);
    const unknown = await price(other, 500000, "TIDAKADA");
    assert.deepEqual([refused.status, refused.body.code, refused.body.message], [unknown.status, unknown.body.code, unknown.body.message], "the same answer as for a code that does not exist");
    assert.equal((await voucher(sa, { code: code(), discountType: "percent", discountValue: 10, institutionId: 99999999 })).status, 400);
  });

  test("uses are limited in all and per client; cancelling a bill gives the use back", async () => {
    const sa = await createSuperadmin();
    const a = await createTenant();
    const b = await createTenant();
    const c = await createTenant();
    const v = code("TERBATAS");
    await voucher(sa, { code: v, discountType: "percent", discountValue: 10, maxUses: 2 });

    const first = await ask(a, { tokens: 500000, voucher: v });
    assert.equal(first.status, 201);
    assert.equal((await ask(a, { tokens: 500000, voucher: v })).body.code, "VOUCHER_ALREADY_USED", "once per client by default");
    assert.equal((await ask(b, { tokens: 500000, voucher: v })).status, 201);
    assert.equal((await ask(c, { tokens: 500000, voucher: v })).body.code, "VOUCHER_USED_UP");

    const cancel = await api().post(`/api/v1/ai/topups/${first.body.data.id}/cancel`).set(bearer(a.ownerToken));
    assert.equal(cancel.status, 200);
    assert.equal((await ask(c, { tokens: 500000, voucher: v })).status, 201, "the use came back");
  });

  test("the last use cannot be taken twice by two bills at once", async () => {
    const sa = await createSuperadmin();
    const a = await createTenant();
    const b = await createTenant();
    const v = code("TERAKHIR");
    await voucher(sa, { code: v, discountType: "percent", discountValue: 10, maxUses: 1 });
    const results = await Promise.all([ask(a, { tokens: 500000, voucher: v }), ask(b, { tokens: 500000, voucher: v })]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  });

  test("the team lists, edits and deletes vouchers; one that was used can only be switched off", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const v = code("KELOLA");
    const made = (await voucher(sa, { code: v, discountType: "percent", discountValue: 10 })).body.data;
    assert.equal((await voucher(sa, { code: v, discountType: "percent", discountValue: 5 })).body.code, "VOUCHER_CODE_TAKEN");

    const list = await api().get("/api/v1/platform/vouchers").set(bearer(sa.token));
    assert.ok(list.body.vouchers.some((x) => x.id === made.id && x.state === "active" && x.usesCount === 0));

    const edited = await api().put(`/api/v1/platform/vouchers/${made.id}`).set(bearer(sa.token)).send({ discountValue: 15, maxUses: 5 });
    assert.deepEqual([edited.status, edited.body.data.discountValue, edited.body.data.maxUses, edited.body.data.code], [200, 15, 5, v]);
    assert.equal((await api().put(`/api/v1/platform/vouchers/${made.id}`).set(bearer(sa.token)).send({ code: "GANTI" })).status, 400, "the code cannot be changed");
    assert.equal((await api().put(`/api/v1/platform/vouchers/${made.id}`).set(bearer(sa.token)).send({ discountValue: 150 })).status, 400, "a percent cannot pass 100");

    const bill = await ask(t, { tokens: 500000, voucher: v });
    assert.equal(bill.body.data.discountIdr, 11250, "the new value, 15 percent of Rp 75.000");
    await api().put(`/api/v1/platform/vouchers/${made.id}`).set(bearer(sa.token)).send({ discountValue: 50 });
    assert.equal(Number((await row("SELECT discount_idr AS d FROM token_topups WHERE id = ?", [bill.body.data.id])).d), 11250, "a bill keeps the discount it was given");

    const used = await api().get("/api/v1/platform/vouchers").set(bearer(sa.token));
    assert.equal(used.body.vouchers.find((x) => x.id === made.id).usesCount, 1);
    assert.equal((await api().delete(`/api/v1/platform/vouchers/${made.id}`).set(bearer(sa.token))).body.code, "VOUCHER_IN_USE");
    assert.equal((await api().put(`/api/v1/platform/vouchers/${made.id}`).set(bearer(sa.token)).send({ isActive: false })).body.data.state, "off");

    const spare = (await voucher(sa, { code: code("HAPUS"), discountType: "fixed", discountValue: 5000 })).body.data;
    assert.equal((await api().delete(`/api/v1/platform/vouchers/${spare.id}`).set(bearer(sa.token))).status, 200);
    assert.equal((await api().delete(`/api/v1/platform/vouchers/${spare.id}`).set(bearer(sa.token))).status, 404);
  });

  test("shops cannot manage vouchers, and the input is checked", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    for (const [method, path, body] of [["get", "/platform/vouchers"], ["post", "/platform/vouchers", { code: "ABC", discountType: "percent", discountValue: 10 }], ["put", "/platform/vouchers/1", { isActive: false }], ["delete", "/platform/vouchers/1"]]) {
      assert.equal((await api()[method](`/api/v1${path}`).set(bearer(t.ownerToken)).send(body)).status, 403, `${method} ${path}`);
    }
    const bad = (body) => voucher(sa, { discountType: "percent", discountValue: 10, ...body });
    assert.equal((await bad({ code: "ab" })).status, 400, "too short");
    assert.equal((await bad({ code: "ada spasi" })).status, 400);
    assert.equal((await bad({ code: code(), discountValue: 120 })).body.code, "INVALID_VOUCHER");
    assert.equal((await bad({ code: code(), discountType: "fixed", discountValue: 500 })).body.code, "INVALID_VOUCHER", "a fixed amount under Rp 1.000");
    assert.equal((await bad({ code: code(), discountType: "fixed", discountValue: 5000, maxDiscountIdr: 1000 })).body.code, "INVALID_VOUCHER", "a cap only for percent");
    assert.equal((await bad({ code: code(), validFrom: "2026-02-01T00:00:00Z", validUntil: "2026-01-01T00:00:00Z" })).body.code, "INVALID_VOUCHER", "ends before it starts");
    assert.equal((await bad({ code: code(), perShopLimit: 0 })).status, 400);
  });

  test("a priced bill the team re-quotes keeps its voucher record, and the queue shows it", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const v = code("ANTRE");
    await voucher(sa, { code: v, discountType: "percent", discountValue: 10 });
    const bill = (await ask(t, { tokens: 1000000, voucher: v })).body.data;
    const queue = await api().get("/api/v1/ai/topups/admin?status=quoted&limit=200").set(bearer(sa.token));
    const found = queue.body.topups.find((x) => x.id === bill.id);
    assert.deepEqual([found.voucherCode, found.listPriceIdr, found.discountIdr], [v, 135000, 13500]);
    const requote = await api().put(`/api/v1/ai/topups/${bill.id}/quote`).set(bearer(sa.token)).send({ amountIdr: 100000, note: "Harga khusus" });
    assert.deepEqual([requote.body.data.quotedAmountIdr, requote.body.data.voucherCode], [100000, v]);
  });
});
