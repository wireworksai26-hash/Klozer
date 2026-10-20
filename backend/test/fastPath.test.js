import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { aiMessages, leadOf, mockNetwork, row, say, shop, write } from "./agentTestKit.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

async function seller() {
  const t = await shop({ fastPath: true });
  const kemeja = await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, stock: 10 });
  const anak = await createProduct(t.institutionId, { name: "Kemeja Batik Anak", price: 120000, stock: 0 });
  const sarung = await createProduct(t.institutionId, { name: "Sarung Tenun", price: 90000, stock: 4 });
  await api().post("/api/v1/bank-accounts").set(bearer(t.ownerToken)).send({ bank_code: "BCA", account_number: "1234567890", account_holder: "Toko Batik" });
  await query("UPDATE institutions SET address = 'Jl. Mawar 5, Solo' WHERE id = ?", [t.institutionId]);
  return { ...t, kemeja, anak, sarung };
}
const settings = (t, body, token = t.ownerToken) => api().put("/api/v1/ai/fast-path").set(bearer(token)).send(body);
const usage = async (t) => Number((await row("SELECT COUNT(*) AS n FROM ai_token_usage_logs WHERE institution_id = ?", [t.institutionId])).n);

describe("repetitive questions answered by code", () => {
  test("the bank account is answered from the shop's own data, with no model call and no tokens", async () => {
    const t = await seller();
    const net = mockNetwork();
    await say(t, "rekeningnya berapa ya kak");

    assert.equal(net.calls.replies.length, 0, "the model was never asked");
    const [reply] = await aiMessages(t);
    assert.match(reply.content_text, /BCA: 1234567890 a\.n\. Toko Batik/);
    assert.deepEqual([reply.reply_path, reply.model_used, reply.tokens_used], ["fast:payment", "fast_path", 0]);
    assert.equal(net.calls.graph.at(-1).body.text.body, reply.content_text);
    assert.equal(await usage(t), 0, "nothing was charged to the token quota");
  });

  test("the product list, a price and an address", async () => {
    const t = await seller();
    const net = mockNetwork();
    await say(t, "list produk dong");
    await say(t, "harga kemeja batik berapa?");
    await say(t, "kemeja batik anak ready?");
    await say(t, "sarung ada?");
    await say(t, "alamat tokonya dimana");

    const texts = (await aiMessages(t)).map((m) => m.content_text);
    assert.match(texts[0], /1\. Sarung Tenun: Rp 90\.000/);
    assert.match(texts[0], /Kemeja Batik Anak: Rp 120\.000 \(stok habis\)/);
    assert.equal(texts[1], "Kemeja Batik: Rp 150.000, stok tersedia 10. Mau pesan kak? Sebut jumlahnya ya.");
    assert.equal(texts[2], "Kemeja Batik Anak: Rp 120.000, stoknya sedang habis.");
    assert.match(texts[3], /Sarung Tenun: Rp 90\.000, stok tersedia 4/);
    assert.equal(texts[4], "Alamat kami: Jl. Mawar 5, Solo");
    assert.equal(net.calls.replies.length, 0);
    assert.deepEqual((await aiMessages(t)).map((m) => m.reply_path), ["fast:catalog", "fast:product", "fast:product", "fast:product", "fast:info"]);
  });

  test("greetings and thanks use the shop's persona and cost nothing", async () => {
    const t = await seller();
    await api().put("/api/v1/ai/persona").set(bearer(t.ownerToken)).send({ botName: "Sari", greetingMessage: "Halo kak, ini Sari dari Toko Batik. Ada yang bisa dibantu?" });
    const net = mockNetwork();
    await say(t, "halo kak");
    await say(t, "makasih ya");
    const texts = (await aiMessages(t)).map((m) => m.content_text);
    assert.equal(texts[0], "Halo kak, ini Sari dari Toko Batik. Ada yang bisa dibantu?");
    assert.match(texts[1], /Sama-sama kak/);
    assert.equal(net.calls.replies.length, 0);
  });

  test("anything complex still goes to the assistant, and the assistant is told the shop's opening hours", async () => {
    const t = await seller();
    await settings(t, { storeHours: "Setiap hari 09.00 sampai 17.00" });
    const net = mockNetwork({ replies: ["Bisa kak, kami kirim ke seluruh Indonesia."] });
    await say(t, "bisa kirim ke luar kota dan ada garansi untuk produknya?");

    assert.equal(net.calls.replies.length, 1);
    assert.match(net.calls.replies[0].system, /Jam Buka: Setiap hari 09\.00 sampai 17\.00/);
    const [reply] = await aiMessages(t);
    assert.equal(reply.reply_path, null);
    assert.ok(reply.tokens_used > 0);
  });

  test("opening hours are answered by code once the shop states them, and not before", async () => {
    const t = await seller();
    const net = mockNetwork({ replies: ["Aku cek dulu ya kak."] });
    await say(t, "jam buka berapa?");
    assert.equal(net.calls.replies.length, 1, "no hours given: the assistant handles it");

    await settings(t, { storeHours: "09.00 sampai 17.00" });
    await say(t, "jam buka berapa?");
    assert.equal(net.calls.replies.length, 1, "answered by code now");
    assert.equal((await aiMessages(t)).at(-1).content_text, "Jam buka: 09.00 sampai 17.00");
  });

  test("with nothing to answer from, the normal flow takes over", async () => {
    const t = await shop({ fastPath: true });
    const net = mockNetwork({ replies: ["Maaf kak, rekening belum diatur."] });
    await say(t, "rekeningnya berapa ya");
    await say(t, "list produk dong");
    await say(t, "alamat dimana");
    assert.equal(net.calls.replies.length, 3, "no bank account, no products, no address: three questions for the assistant");
  });

  test("an order in progress is not disturbed, and a question in the middle is answered without losing it", async () => {
    const t = await seller();
    await api().put("/api/v1/commerce/settings").set(bearer(t.ownerToken)).send({ enabled: true, shippingMode: "flat", shippingFlatFee: 15000, payQris: false, payTransfer: true });
    const net = mockNetwork({ nlu: (text) => (/kemeja/i.test(text) ? { items: [{ productId: t.kemeja, quantity: 2, mode: "add" }] } : {}) });
    await say(t, "Mau pesan 2 kemeja batik");
    assert.ok(await row("SELECT id FROM order_drafts WHERE institution_id = ? AND active = 1", [t.institutionId]));
    assert.equal((await aiMessages(t)).at(-1).reply_path, "rules", "the order flow answered");

    await say(t, "rekeningnya berapa ya");
    assert.equal((await aiMessages(t)).at(-1).reply_path, "fast:payment");
    assert.ok(await row("SELECT id FROM order_drafts WHERE institution_id = ? AND active = 1", [t.institutionId]), "the draft waits");
    assert.equal(net.calls.replies.length, 0);
  });

  test("while a person holds the chat the fast path stays quiet too", async () => {
    const t = await seller();
    mockNetwork();
    await say(t, "halo");
    const lead = await leadOf(t);
    await api().post(`/api/v1/leads/${lead.id}/handoff`).set(bearer(t.csToken)).send({});
    const before = (await aiMessages(t)).length;
    await write(t, "rekeningnya berapa");
    await new Promise((r) => setTimeout(r, 400));
    assert.equal((await aiMessages(t)).length, before);
  });

  test("out of tokens, repetitive questions are still answered and the rest waits for a person", async () => {
    const t = await seller();
    await query("UPDATE institutions SET ai_tokens_used = ai_token_quota WHERE id = ?", [t.institutionId]);
    const net = mockNetwork();
    await say(t, "rekeningnya berapa ya");
    assert.match((await aiMessages(t))[0].content_text, /BCA/);

    await write(t, "bisa kirim ke luar kota dan ada garansi untuk produknya?");
    await new Promise((r) => setTimeout(r, 400));
    assert.equal((await aiMessages(t)).length, 1, "nothing improvised without tokens");
    assert.equal(net.calls.replies.length, 0);
  });
});

describe("the shop's switches", () => {
  test("a topic or the whole fast path can be switched off", async () => {
    const t = await seller();
    const net = mockNetwork({ replies: ["Transfer ke BCA 1234567890 ya kak.", "Ini produk kami kak."] });
    assert.equal((await settings(t, { topics: { payment: false } })).body.data.topics.payment, false);
    await say(t, "rekeningnya berapa ya");
    assert.equal(net.calls.replies.length, 1, "payment is off: the assistant answers");

    await say(t, "halo");
    assert.equal(net.calls.replies.length, 1, "the other topics still work");

    await settings(t, { enabled: false });
    await say(t, "list produk dong");
    assert.equal(net.calls.replies.length, 2, "everything goes to the assistant when it is off");
  });

  test("settings are validated, kept per shop, and only managers change them", async () => {
    const t = await seller();
    const other = await seller();
    assert.deepEqual((await api().get("/api/v1/ai/fast-path").set(bearer(t.ownerToken))).body.data, { enabled: true, topics: { greeting: true, thanks: true, payment: true, catalog: true, product: true, info: true }, storeHours: null });
    assert.equal((await settings(t, { topics: { nonsense: true } })).status, 400);
    assert.equal((await settings(t, { storeHours: "x".repeat(301) })).status, 400);
    assert.equal((await settings(t, {})).status, 400);
    assert.equal((await settings(t, { enabled: false }, t.csToken)).status, 403);
    assert.equal((await api().get("/api/v1/ai/fast-path").set(bearer(t.csToken))).status, 403);

    await settings(t, { enabled: false, storeHours: "09.00-17.00" });
    assert.equal((await api().get("/api/v1/ai/fast-path").set(bearer(other.ownerToken))).body.data.enabled, true);
    assert.equal((await settings(t, { storeHours: null })).body.data.storeHours, null);
  });

  test("the numbers: replies by code, by the order rules and by the assistant, and the tokens that saved", async () => {
    const t = await seller();
    mockNetwork({ replies: ["Bisa kak, kami kirim ke seluruh Indonesia.", "Garansi tiga puluh hari kak."] });
    await say(t, "rekeningnya berapa");
    await say(t, "list produk");
    await say(t, "halo");
    await say(t, "bisa kirim ke luar kota dan ada garansi untuk produknya?");
    await say(t, "kalau pembayaran gagal terus bagaimana ya kak, apakah bisa dibantu manual?");

    const stats = (await api().get("/api/v1/ai/fast-path/stats").set(bearer(t.ownerToken))).body.data;
    assert.deepEqual([stats.fast, stats.model, stats.rules], [3, 2, 0]);
    assert.deepEqual(stats.byTopic, { payment: 1, catalog: 1, greeting: 1 });
    assert.equal(stats.averageTokensPerAiReply, 220);
    assert.equal(stats.estimatedTokensSaved, 3 * 220);
    assert.equal((await api().get("/api/v1/ai/fast-path/stats?days=0").set(bearer(t.ownerToken))).status, 400);
    assert.equal((await api().get("/api/v1/ai/fast-path/stats").set(bearer(t.csToken))).status, 403);
  });
});
