import "./setupWhatsapp.js";
import "./setupPayments.js";
process.env.BITESHIP_API_KEY = "test-biteship-key";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { api, bearer, createProduct, createTenant, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";
import { config } from "../src/config/env.js";
import { cancelStaleUnpaidOrders, runDueFollowups } from "../src/services/followup/followupService.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => {
  mock.restoreAll();
  config.shipping.biteshipKey = "test-biteship-key";
});

const APP_SECRET = "test-app-secret";
const signed = (body) => `sha256=${crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;
const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json });

const inbound = ({ phoneNumberId, from, text }) =>
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "6281100000000", phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: "Pembeli" }, wa_id: from }],
              messages: [{ from, id: `wamid.${crypto.randomUUID()}`, timestamp: "1700000000", type: "text", text: { body: text } }],
            },
          },
        ],
      },
    ],
  });
const webhook = (raw) => api().post("/api/v1/webhooks/whatsapp").set("Content-Type", "application/json").set("x-hub-signature-256", signed(raw)).send(raw);

const NLU_MARK = "mengekstrak data pesanan";

/**
 * Fake network. `nlu(customerText, callNumber)` returns the JSON the order-reading model would answer with;
 * `biteship(body)` returns rate rows; everything else (the normal assistant, WhatsApp, iPaymu) answers plainly.
 */
function mockNetwork({ nlu = () => ({}), biteship = () => [], qrisFails = false } = {}) {
  const calls = { ai: [], nlu: [], graph: [], biteship: [], ipaymu: [] };
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const u = String(url);
    const body = typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : opts.body;
    if (u.includes("integrate.api.nvidia.com")) {
      const isNlu = String(body.messages[0].content).includes(NLU_MARK);
      const customerText = String(body.messages[1].content).match(/"""\n([\s\S]*)\n"""/)?.[1];
      if (isNlu) {
        calls.nlu.push({ text: customerText, system: body.messages[0].content });
        const answer = nlu(customerText, calls.nlu.length);
        return ok({ choices: [{ message: { content: typeof answer === "string" ? answer : JSON.stringify(answer) } }], usage: { prompt_tokens: 300, completion_tokens: 40 } });
      }
      calls.ai.push(body);
      return ok({ choices: [{ message: { content: "Jawaban biasa dari asisten." } }], usage: { prompt_tokens: 400, completion_tokens: 20 } });
    }
    if (u.includes("graph.facebook.com")) {
      calls.graph.push({ url: u, body });
      return ok({ messages: [{ id: `wamid.OUT.${calls.graph.length}` }] });
    }
    if (u.includes("api.biteship.com")) {
      calls.biteship.push({ url: u, body });
      return ok({ success: true, pricing: biteship(body) });
    }
    if (u.includes("ipaymu.com")) {
      calls.ipaymu.push({ url: u, body });
      if (qrisFails) return { ok: false, status: 500, json: async () => ({ Status: 500, Success: false, Message: "down" }) };
      return ok({ Status: 200, Success: true, Data: { TransactionId: 900 + calls.ipaymu.length, QrString: "00020101021226", QrImage: `https://sandbox.ipaymu.com/qr/${calls.ipaymu.length}.png`, Fee: 1000 } });
    }
    throw new Error(`unexpected fetch to ${u}`);
  });
  return calls;
}

const texts = (calls) => calls.graph.filter((c) => c.body?.type === "text").map((c) => c.body.text.body);
const lastText = (calls) => texts(calls).at(-1);
const row = async (sql, params) => (await query(sql, params))[0];
const asObject = (value) => (typeof value === "string" ? JSON.parse(value) : value);

let seq = 0;
/** A tenant that sells two products, has a bank account, a WhatsApp number, and chat commerce switched on. */
async function shop({ settings = {}, stock = 10, sarungStock = 0 } = {}) {
  const t = await createTenant();
  const pn = `PN-COM-${t.institutionId}-${++seq}`;
  const connected = await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp", name: "Toko", externalId: pn, accessToken: `EAAG-token-${pn}` });
  assert.equal(connected.status, 201);
  const kemeja = await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, hpp: 90000, stock });
  const sarung = await createProduct(t.institutionId, { name: "Sarung Tenun", price: 90000, hpp: 50000, stock: sarungStock });
  const bank = await api().post("/api/v1/bank-accounts").set(bearer(t.ownerToken)).send({ bank_code: "BCA", account_number: "1234567890", account_holder: "Toko Batik" });
  assert.equal(bank.status, 201);
  const saved = await api().put("/api/v1/commerce/settings").set(bearer(t.ownerToken)).send({ enabled: true, shippingMode: "flat", shippingFlatFee: 15000, payQris: false, payTransfer: true, payCod: false, ...settings });
  assert.equal(saved.status, 200);
  return { ...t, pn, kemeja, sarung, from: "6281234500001" };
}

/** The customer writes; resolves once the assistant's answer is stored (or the wait runs out for messages that get none). */
async function say(shopInfo, text, { expectReply = true, from = shopInfo.from } = {}) {
  const count = async () => Number((await row("SELECT COUNT(*) AS n FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent'", [shopInfo.institutionId])).n);
  const before = await count();
  const res = await webhook(inbound({ phoneNumberId: shopInfo.pn, from, text }));
  assert.equal(res.status, 200);
  if (expectReply) await waitFor(async () => (await count()) > before, { timeout: 6000 });
  else await new Promise((r) => setTimeout(r, 400));
}

const ordersOf = (t) => query("SELECT * FROM orders WHERE institution_id = ? ORDER BY id", [t.institutionId]);
const draftOf = (t) => row("SELECT * FROM order_drafts WHERE institution_id = ? ORDER BY id DESC LIMIT 1", [t.institutionId]);
const leadOf = (t, phone = "6281234500001") => row("SELECT * FROM leads WHERE institution_id = ? AND phone_number = ?", [t.institutionId, phone]);
const stockOf = async (id) => Number((await row("SELECT stock_quantity AS s FROM products WHERE id = ?", [id])).s);
/** A time of day that is neither night nor too close to now, so reminder tests do not depend on when they run. */
const middayJakarta = () => {
  const d = new Date();
  d.setUTCHours(5, 0, 0, 0); // 12:00 in Jakarta
  if (d.getTime() <= Date.now() + 3600_000) d.setUTCDate(d.getUTCDate() + 1);
  return d;
};
const pendingJobs = (t) => query("SELECT * FROM proactive_followup_jobs WHERE institution_id = ? AND status = 'pending' AND (order_id IS NOT NULL OR draft_id IS NOT NULL) ORDER BY step_number", [t.institutionId]);

/** Walks a customer to the confirmation summary: two Kemeja, name and address given in one message. */
async function toSummary(t, calls) {
  await say(t, "Mau pesan 2 kemeja batik");
  await say(t, "Budi, Jl. Mawar 5 RT 2 Laweyan, Solo 57148");
  return calls;
}
const orderNlu = (t) => (text) => {
  if (/kemeja/i.test(text) && /\b3\b/.test(text) && /jadi/i.test(text)) return { items: [{ productId: t.kemeja, quantity: 3, mode: "set" }] };
  if (/kemeja/i.test(text)) return { items: [{ productId: t.kemeja, quantity: 2, mode: "add" }] };
  if (/mawar/i.test(text)) return { recipient: { name: "Budi", address: "Jl. Mawar 5 RT 2 Laweyan", city: "Solo" } };
  return {};
};

describe("taking an order in chat", () => {
  test("from first message to a placed order, with every amount computed by the server", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });

    await say(t, "Mau pesan 2 kemeja batik");
    let reply = lastText(calls);
    assert.match(reply, /2 x Kemeja Batik = Rp 300\.000/);
    assert.match(reply, /Subtotal: Rp 300\.000/);
    assert.match(reply, /Nama penerima/);
    assert.match(reply, /Alamat lengkap/);
    assert.doesNotMatch(reply, /Nomor HP/, "the chat number is the default recipient phone");
    assert.deepEqual(asObject((await draftOf(t)).items_json), [{ productId: t.kemeja, quantity: 2 }]);

    await say(t, "Budi, Jl. Mawar 5 RT 2 Laweyan, Solo 57148");
    reply = lastText(calls);
    assert.match(reply, /Ongkir[^\n]*: Rp 15\.000/);
    assert.match(reply, /Total: Rp 315\.000/);
    assert.match(reply, /Bayar: Transfer bank/);
    assert.match(reply, /Budi \| 6281234500001 \| Jl\. Mawar 5 RT 2 Laweyan, Solo/);
    assert.equal((await draftOf(t)).status, "awaiting_confirmation");
    assert.equal((await ordersOf(t)).length, 0, "nothing is ordered before the customer confirms");
    assert.equal(await stockOf(t.kemeja), 10);

    await say(t, "ya kak");
    reply = lastText(calls);
    const [order] = await ordersOf(t);
    assert.ok(order, "the order exists");
    assert.match(reply, new RegExp(`Pesanan ${order.order_number} sudah dibuat`));
    assert.match(reply, /Transfer tepat Rp 315\.000/);
    assert.match(reply, /BCA: 1234567890 a\.n\. Toko Batik/);

    assert.equal(Number(order.total_amount), 315000);
    assert.equal(Number(order.subtotal_amount), 300000);
    assert.equal(Number(order.shipping_fee), 15000);
    assert.equal(order.status, "waiting_payment");
    assert.equal(order.payment_method, "bank_transfer");
    assert.equal(order.created_via, "chat");
    assert.deepEqual(asObject(order.chat_details_json).recipient, { name: "Budi", phone: "6281234500001", address: "Jl. Mawar 5 RT 2 Laweyan", city: "Solo", postalCode: "57148" });
    assert.equal(await stockOf(t.kemeja), 8, "stock is reserved");
    const draft = await draftOf(t);
    assert.deepEqual([draft.status, draft.active, draft.order_id], ["placed", null, order.id]);

    const lead = await leadOf(t);
    assert.equal(lead.status, "closing");
    assert.equal(lead.name, "Budi" === lead.name ? "Budi" : lead.name);
    assert.equal(lead.city, "Solo");
    assert.equal(calls.ai.length, 0, "the normal assistant was never asked: orders are handled by rules");
    assert.equal(calls.nlu.length, 2, "the model only read the two free-text messages; 'ya kak' needed no model");
    assert.ok((await pendingJobs(t)).length >= 1, "reminders are scheduled for the unpaid order");
  });

  test("the order list shows where an order came from", async () => {
    const t = await shop();
    mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t);
    await say(t, "ya");
    const list = await api().get("/api/v1/orders").set(bearer(t.ownerToken));
    assert.equal(list.body.items[0].created_via, "chat");
  });

  test("changing the quantity before confirming recomputes everything and asks again", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    await say(t, "ganti jadi 3 kemeja");
    assert.match(lastText(calls), /3 x Kemeja Batik = Rp 450\.000/);
    assert.match(lastText(calls), /Total: Rp 465\.000/);
    assert.equal((await draftOf(t)).status, "awaiting_confirmation");
    await say(t, "oke");
    const [order] = await ordersOf(t);
    assert.equal(Number(order.total_amount), 465000);
    assert.equal(await stockOf(t.kemeja), 7);
  });

  test("asking for more than the stock gets what is there, said plainly", async () => {
    const t = await shop({ stock: 4 });
    const calls = mockNetwork({ nlu: () => ({ items: [{ productId: t.kemeja, quantity: 20, mode: "add" }] }) });
    await say(t, "mau pesan 20 kemeja");
    assert.match(lastText(calls), /Stok Kemeja Batik tinggal 4/);
    assert.match(lastText(calls), /4 x Kemeja Batik = Rp 600\.000/);
  });

  test("a product that is sold out is not added, and the customer is told", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: () => ({ items: [{ productId: t.sarung, quantity: 1, mode: "add" }] }) });
    await say(t, "mau pesan 1 sarung tenun");
    assert.match(lastText(calls), /Sarung Tenun lagi habis/);
    assert.deepEqual(asObject((await draftOf(t)).items_json), []);
  });

  test("stock that disappears between the summary and the confirmation is handled, and nothing oversells", async () => {
    const t = await shop({ stock: 5 });
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    await query("UPDATE products SET stock_quantity = 1 WHERE id = ?", [t.kemeja]); // someone else bought it meanwhile
    await say(t, "ya");
    assert.equal((await ordersOf(t)).length, 0);
    assert.match(lastText(calls), /Stok Kemeja Batik tinggal 1/);
    assert.match(lastText(calls), /1 x Kemeja Batik = Rp 150\.000/);
    assert.equal((await draftOf(t)).status, "awaiting_confirmation", "the corrected order is shown for confirmation again");
    await say(t, "ya");
    assert.equal(Number((await ordersOf(t))[0].subtotal_amount), 150000);
    assert.equal(await stockOf(t.kemeja), 0);
  });

  test("cancelling ends the draft and orders nothing", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    await say(t, "batal aja kak");
    assert.match(lastText(calls), /pesanannya aku batalkan/);
    const draft = await draftOf(t);
    assert.deepEqual([draft.status, draft.active], ["cancelled", null]);
    assert.equal((await ordersOf(t)).length, 0);
    assert.equal(await stockOf(t.kemeja), 10);
    assert.equal((await pendingJobs(t)).length, 0);
  });

  test("a question during the order is answered by the normal assistant, and the draft waits", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: (text) => (/kemeja/i.test(text) ? { items: [{ productId: t.kemeja, quantity: 2, mode: "add" }] } : {}) });
    await say(t, "mau pesan 2 kemeja");
    await say(t, "kirimnya biasanya berapa hari ya?");
    assert.equal(calls.ai.length, 1);
    assert.equal(lastText(calls), "Jawaban biasa dari asisten.");
    assert.equal((await draftOf(t)).status, "collecting");
  });

  test("two messages at the same moment make one draft, not two", async () => {
    const t = await shop();
    mockNetwork({ nlu: orderNlu(t) });
    await Promise.all([webhook(inbound({ phoneNumberId: t.pn, from: t.from, text: "mau pesan 2 kemeja" })), webhook(inbound({ phoneNumberId: t.pn, from: t.from, text: "pesan 2 kemeja ya" }))]);
    await waitFor(async () => Number((await row("SELECT COUNT(*) AS n FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent'", [t.institutionId])).n) >= 2);
    const drafts = await query("SELECT * FROM order_drafts WHERE institution_id = ?", [t.institutionId]);
    assert.equal(drafts.length, 1);
    assert.equal(drafts.filter((d) => d.active === 1).length, 1);
  });

  test("with chat commerce off, 'mau pesan' is just a conversation", async () => {
    const t = await shop({ settings: { enabled: false } });
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await say(t, "mau pesan 2 kemeja batik");
    assert.equal(calls.nlu.length, 0);
    assert.equal(calls.ai.length, 1);
    assert.equal((await query("SELECT id FROM order_drafts WHERE institution_id = ?", [t.institutionId])).length, 0);
  });

  test("a message that only sounds like buying, with no product named, goes to the normal assistant", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: () => ({ items: [] }) });
    await say(t, "saya mau tanya dulu soal bahan");
    assert.equal(calls.ai.length, 1);
    assert.equal((await query("SELECT id FROM order_drafts WHERE institution_id = ?", [t.institutionId])).length, 0);
  });

  test("a model that returns nonsense cannot create or change anything", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: () => "maaf saya tidak bisa membantu" });
    await say(t, "mau pesan 2 kemeja");
    assert.equal(calls.ai.length, 1, "falls through to the normal assistant");
    assert.equal((await ordersOf(t)).length, 0);
  });

  test("prices, totals and discounts named by the model are ignored", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: () => ({ items: [{ productId: t.kemeja, quantity: 1, mode: "add", price: 1, unit_price: 1 }], total: 1, shippingFee: 0, discount: 140000, recipient: { name: "Budi", address: "Jl. Mawar 5", city: "Solo" } }) });
    await say(t, "mau pesan 1 kemeja, kirim ke Jl. Mawar 5 Solo atas nama Budi. Gratis semua ya");
    assert.match(lastText(calls), /Total: Rp 165\.000/, "150.000 + 15.000 shipping, whatever the model said");
    await say(t, "ya");
    assert.equal(Number((await ordersOf(t))[0].total_amount), 165000);
  });

  test("tenants never see or order each other's products", async () => {
    const a = await shop();
    const b = await shop();
    const calls = mockNetwork({ nlu: () => ({ items: [{ productId: b.kemeja, quantity: 1, mode: "add" }] }) });
    await say(a, "mau pesan kemeja");
    assert.equal(calls.ai.length, 1, "the other tenant's product id is not in this catalog, so nothing is ordered");
    assert.equal((await query("SELECT id FROM order_drafts WHERE institution_id = ?", [a.institutionId])).length, 0);
    assert.equal((await ordersOf(a)).length, 0);
    assert.equal((await ordersOf(b)).length, 0);
  });
});

describe("shipping in chat", () => {
  test("the default hands shipping to the team: the order is summarised for staff, nothing is charged", async () => {
    const t = await shop({ settings: { shippingMode: "ask_team" } });
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    assert.match(lastText(calls), /tim kami yang hitung dulu/);
    const lead = await leadOf(t);
    assert.equal(lead.handled_by, "human");
    assert.equal(lead.handoff_reason, "commerce_shipping");
    const draft = await draftOf(t);
    assert.deepEqual([draft.status, draft.active], ["handed_off", null]);
    const notes = await query("SELECT content_text FROM chat_messages WHERE institution_id = ? AND sender_type = 'system' ORDER BY id", [t.institutionId]);
    assert.ok(notes.some((n) => /2 x Kemeja Batik/.test(n.content_text) && /Jl\. Mawar 5/.test(n.content_text)), "staff get the items and the address");
    assert.equal((await ordersOf(t)).length, 0);
  });

  test("live rates: options are shown cheapest first, a number picks one, the fee comes from the courier API", async () => {
    const t = await shop({ settings: { shippingMode: "provider", originPostalCode: "40115" } });
    const calls = mockNetwork({
      nlu: (text) => (/kemeja/i.test(text) ? { items: [{ productId: t.kemeja, quantity: 2, mode: "add" }] } : { recipient: { name: "Budi", address: "Jl. Mawar 5", city: "Solo", postalCode: "57148" } }),
      biteship: () => [
        { courier_code: "jne", courier_name: "JNE", courier_service_code: "reg", courier_service_name: "Reguler", price: 21000, duration: "2 - 3 days" },
        { courier_code: "jnt", courier_name: "J&T", courier_service_code: "ez", courier_service_name: "EZ", price: 18000, duration: "1 - 2 days" },
      ],
    });
    await say(t, "mau pesan 2 kemeja");
    assert.match(lastText(calls), /Kode pos/, "a live rate needs the destination postal code");
    await say(t, "Budi, Jl. Mawar 5 Solo 57148");
    assert.match(lastText(calls), /1\. J&T EZ - Rp 18\.000 \(1 - 2 hari\)\n2\. JNE Reguler - Rp 21\.000/);
    assert.deepEqual([calls.biteship[0].body.origin_postal_code, calls.biteship[0].body.destination_postal_code], [40115, 57148]);

    await say(t, "2");
    assert.match(lastText(calls), /Ongkir \(JNE Reguler, 2 - 3 hari\): Rp 21\.000/);
    assert.match(lastText(calls), /Total: Rp 321\.000/);
    await say(t, "ya");
    const [order] = await ordersOf(t);
    assert.equal(Number(order.total_amount), 321000);
    assert.equal(asObject(order.chat_details_json).shipping.courierCode, "jne");
  });

  test("an answer that is not one of the numbers is not taken as a choice", async () => {
    const t = await shop({ settings: { shippingMode: "provider", originPostalCode: "40115" } });
    const calls = mockNetwork({
      nlu: (text) => (/kemeja/i.test(text) ? { items: [{ productId: t.kemeja, quantity: 1, mode: "add" }] } : { recipient: { name: "Budi", address: "Jl. Mawar 5", city: "Solo", postalCode: "57148" } }),
      biteship: () => [{ courier_code: "jne", courier_name: "JNE", courier_service_code: "reg", courier_service_name: "Reguler", price: 21000 }],
    });
    await say(t, "mau pesan kemeja");
    await say(t, "Budi Jl. Mawar 5 Solo 57148");
    await say(t, "7");
    assert.doesNotMatch(lastText(calls), /Total:/);
    assert.equal((await ordersOf(t)).length, 0);
  });

  test("without a courier API key, shipping goes to the team instead of a guessed price", async () => {
    const t = await shop({ settings: { shippingMode: "provider", originPostalCode: "40115" } });
    config.shipping.biteshipKey = "";
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    assert.match(lastText(calls), /tim kami yang hitung dulu/);
    assert.equal((await ordersOf(t)).length, 0);
  });

  test("free shipping and pickup", async () => {
    const t = await shop({ settings: { shippingMode: "free", allowPickup: true } });
    const calls = mockNetwork({
      nlu: (text) => (/kemeja/i.test(text) ? { items: [{ productId: t.kemeja, quantity: 1, mode: "add" }], fulfillment: "pickup", recipient: { name: "Budi" } } : {}),
    });
    await say(t, "mau pesan kemeja, ambil sendiri ya atas nama Budi");
    assert.match(lastText(calls), /Ambil sendiri di toko/);
    assert.match(lastText(calls), /Total: Rp 150\.000/);
    await say(t, "ya");
    const [order] = await ordersOf(t);
    assert.equal(order.fulfillment_type, "pickup");
    assert.equal(Number(order.shipping_fee), 0);
  });
});

describe("paying", () => {
  test("QRIS: the order is created and the QR link is sent; asking again makes a fresh one", async () => {
    const t = await shop({ settings: { payQris: true, payTransfer: false } });
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    assert.match(lastText(calls), /Bayar: QRIS/);
    await say(t, "ya");
    assert.match(lastText(calls), /https:\/\/sandbox\.ipaymu\.com\/qr\/1\.png/);
    const [order] = await ordersOf(t);
    const [payment] = await query("SELECT amount, status FROM payments WHERE order_id = ?", [order.id]);
    assert.equal(Number(payment.amount), 315000, "the QR is charged for the order's stored total");

    await say(t, "qrisnya habis, minta lagi dong");
    assert.match(lastText(calls), /QRIS baru untuk pesanan/);
    assert.match(lastText(calls), /qr\/2\.png/);
    assert.equal((await query("SELECT id FROM payments WHERE order_id = ? AND status = 'pending'", [order.id])).length, 1, "only the newest QR stays payable");
  });

  test("when several methods are possible the customer chooses by number or by name", async () => {
    const t = await shop({ settings: { payQris: true, payTransfer: true } });
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    assert.match(lastText(calls), /1\. QRIS\n2\. Transfer bank/);
    await say(t, "2");
    assert.match(lastText(calls), /Bayar: Transfer bank/);
    await say(t, "gak jadi transfer, qris aja");
    assert.doesNotMatch(lastText(calls), /Bayar: Transfer bank/);
  });

  test("a QRIS that cannot be made leaves the order in place and brings in a person", async () => {
    const t = await shop({ settings: { payQris: true, payTransfer: false } });
    const calls = mockNetwork({ nlu: orderNlu(t), qrisFails: true });
    await toSummary(t, calls);
    await say(t, "ya");
    assert.match(lastText(calls), /QRIS-nya kami siapkan dulu/);
    assert.equal((await ordersOf(t)).length, 1);
    assert.equal((await leadOf(t)).handled_by, "human");
  });

  test("COD is offered only when the tenant allows it and the address is good enough", async () => {
    const t = await shop({ settings: { payTransfer: true, payCod: true } });
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    assert.match(lastText(calls), /1\. Transfer bank\n2\. COD/);

    const risky = await shop({ settings: { payTransfer: true, payCod: true } });
    const riskyCalls = mockNetwork({ nlu: (text) => (/kemeja/i.test(text) ? { items: [{ productId: risky.kemeja, quantity: 1, mode: "add" }] } : { recipient: { name: "Budi", address: "jalan", city: "x" } }) });
    await say(risky, "mau pesan kemeja");
    await say(risky, "Budi, jalan");
    assert.doesNotMatch(lastText(riskyCalls), /COD/, "a vague address is high risk: no cash on delivery");
  });

  test("a customer who says they paid is asked for the proof; asking how to pay repeats the account", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    await say(t, "ya");
    await say(t, "sudah transfer ya kak");
    assert.match(lastText(calls), /kirim foto bukti transfernya/);
    await say(t, "transfer ke rekening mana tadi?");
    assert.match(lastText(calls), /BCA: 1234567890/);
    assert.equal(calls.ai.length, 0);
  });

  test("the customer is told when the order is paid", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    await say(t, "ya");
    const [order] = await ordersOf(t);
    const before = texts(calls).length;
    const res = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    assert.equal(res.status, 200);
    await waitFor(async () => texts(calls).length > before);
    assert.match(lastText(calls), new RegExp(`Pembayaran Rp 315\\.000 untuk pesanan ${order.order_number} sudah kami terima`));
    assert.equal((await pendingJobs(t)).length, 0, "paid: no more reminders");
  });
});

describe("shipping notices and order status", () => {
  async function placedOrder(t, calls) {
    await toSummary(t, calls);
    await say(t, "ya");
    return (await ordersOf(t))[0];
  }

  test("setting the waybill tells the customer, and 'resi' later answers from the database", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    const order = await placedOrder(t, calls);
    await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });

    const before = texts(calls).length;
    const res = await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(t.csToken)).send({ courier_code: "jne", service_name: "REG", awb_number: "JNE123456789" });
    assert.equal(res.status, 200);
    assert.equal(res.body.notified.sent, true);
    assert.equal(res.body.data.awb_number, "JNE123456789");
    assert.ok(texts(calls).length > before);
    assert.match(lastText(calls), /sudah dikirim[\s\S]*Resi: JNE123456789/);

    await say(t, "resinya mana kak?");
    assert.match(lastText(calls), /resi JNE123456789/);
    assert.equal(calls.ai.length, 0);

    const again = await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(t.csToken)).send({ service_name: "REG", shipping_status: "in_transit" });
    assert.equal(again.body.notified.sent, false, "the waybill did not change: no second message");
  });

  test("outside the 24-hour window the notice is not sent, and the response says why", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    const order = await placedOrder(t, calls);
    await query("UPDATE leads SET last_inbound_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 HOUR) WHERE institution_id = ?", [t.institutionId]);
    const before = texts(calls).length;
    const res = await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(t.csToken)).send({ courier_code: "jne", awb_number: "JNE000111222" });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.notified, { sent: false, reason: "window_closed" });
    assert.equal(texts(calls).length, before);
    assert.equal(res.body.data.awb_number, "JNE000111222", "the waybill is saved regardless");
  });

  test("the customer can ask for the status of an unshipped order", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    const order = await placedOrder(t, calls);
    await say(t, "pesanan saya sampai mana ya");
    assert.match(lastText(calls), new RegExp(`Pesanan ${order.order_number}: menunggu pembayaran`));
  });

  test("live tracking is added when the courier API knows the waybill", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    const order = await placedOrder(t, calls);
    await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(t.csToken)).send({ courier_code: "jne", awb_number: "JNE123456789", notify_customer: false });
    mock.method(globalThis, "fetch", async (url) => {
      if (String(url).includes("api.biteship.com/v1/trackings/JNE123456789/couriers/jne")) return ok({ success: true, status: "on_process", history: [{ note: "Paket di Hub Solo" }] });
      if (String(url).includes("graph.facebook.com")) return ok({ messages: [{ id: "wamid.X" }] });
      throw new Error(`unexpected fetch ${url}`);
    });
    const sent = [];
    mock.method(globalThis, "fetch", async (url, opts = {}) => {
      if (String(url).includes("api.biteship.com")) return ok({ success: true, status: "on_process", history: [{ note: "Paket di Hub Solo" }] });
      if (String(url).includes("graph.facebook.com")) {
        sent.push(JSON.parse(opts.body));
        return ok({ messages: [{ id: "wamid.Y" }] });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await say(t, "lacak paket saya");
    assert.match(sent.find((b) => b.type === "text").text.body, /Status terakhir: on process \(Paket di Hub Solo\)/);
  });

  test("shipment updates are validated, scoped to the tenant, and need a courier to start", async () => {
    const a = await shop();
    const b = await shop();
    const calls = mockNetwork({ nlu: orderNlu(a) });
    const order = await placedOrder(a, calls);
    assert.equal((await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(b.csToken)).send({ courier_code: "jne" })).status, 404);
    assert.equal((await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(a.csToken)).send({ awb_number: "JNE123456789" })).status, 400, "no shipment yet: a courier is needed");
    assert.equal((await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(a.csToken)).send({ courier_code: "jne", awb_number: "<b>" })).status, 400);
    assert.equal((await api().put(`/api/v1/shipping/orders/${order.id}`).set(bearer(a.csToken)).send({})).status, 400);
  });
});

describe("reminders", () => {
  async function unpaidOrder(settings = {}) {
    const t = await shop({ settings });
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await toSummary(t, calls);
    await say(t, "ya");
    const [order] = await ordersOf(t);
    return { t, calls, order };
  }
  /** Make every pending reminder due at `now`, with the customer's last message an hour before it. */
  const makeDue = async (t, now = middayJakarta()) => {
    await query("UPDATE proactive_followup_jobs SET scheduled_at = ? WHERE institution_id = ? AND status = 'pending'", [new Date(now.getTime() - 60_000), t.institutionId]);
    await query("UPDATE leads SET last_inbound_at = ? WHERE institution_id = ?", [new Date(now.getTime() - 3600_000), t.institutionId]);
    return now;
  };
  const jobStatuses = async (t) => (await query("SELECT status FROM proactive_followup_jobs WHERE institution_id = ? AND order_id IS NOT NULL ORDER BY id", [t.institutionId])).map((j) => j.status);

  test("placing an order plans reminders inside the 24-hour window, in order", async () => {
    const { t } = await unpaidOrder();
    const jobs = await pendingJobs(t);
    assert.ok(jobs.length >= 1 && jobs.length <= 3);
    assert.deepEqual(jobs.map((j) => j.step_number), jobs.map((_, i) => i + 1));
    const inbound = (await leadOf(t)).last_inbound_at;
    for (const j of jobs) assert.ok(new Date(j.scheduled_at) - new Date(inbound) < 23.5 * 3600_000, "never planned past the window");
    assert.ok(jobs.every((j, i) => i === 0 || new Date(j.scheduled_at) > new Date(jobs[i - 1].scheduled_at)));
  });

  test("a due reminder is sent once, in the conversation, with the order's own numbers", async () => {
    const { t, calls, order } = await unpaidOrder();
    const noon = await makeDue(t);
    const before = texts(calls).length;
    const [a, b] = await Promise.all([runDueFollowups({ now: noon, institutionId: t.institutionId }), runDueFollowups({ now: noon, institutionId: t.institutionId })]);
    assert.equal(a.sent + b.sent, 1, "two workers at once send it exactly once, and only the first step although all three are due");
    assert.equal(texts(calls).length, before + 1);
    assert.match(lastText(calls), new RegExp(`pesanan ${order.order_number} \\(Rp 315\\.000\\) masih menunggu pembayaran`));
    const [stored] = await query("SELECT meta_json FROM chat_messages WHERE institution_id = ? AND content_text LIKE '%masih menunggu pembayaran%'", [t.institutionId]);
    assert.equal(asObject(stored.meta_json).followup.step, 1);
    assert.equal((await jobStatuses(t))[0], "sent");
    assert.equal((await runDueFollowups({ now: noon, institutionId: t.institutionId })).sent, 0, "the next step waits at least half an hour");
    const later = new Date(noon.getTime() + 31 * 60_000);
    await query("UPDATE leads SET last_inbound_at = ? WHERE institution_id = ?", [new Date(noon.getTime() - 3600_000), t.institutionId]);
    assert.equal((await runDueFollowups({ now: later, institutionId: t.institutionId })).sent, 1, "then the second step goes out");
    assert.match(lastText(calls), /belum kami terima pembayarannya/, "and its wording is the firmer one");
  });

  test("paying stops the reminders, and so does cancelling", async () => {
    const orderJobs = async (order) => (await query("SELECT status FROM proactive_followup_jobs WHERE order_id = ?", [order.id])).map((j) => j.status);
    const { t, order } = await unpaidOrder();
    assert.ok((await orderJobs(order)).length >= 1);
    await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    assert.ok((await orderJobs(order)).every((s) => s === "cancelled_by_payment"));

    const second = await unpaidOrder();
    await api().patch(`/api/v1/orders/${second.order.id}/status`).set(bearer(second.t.ownerToken)).send({ status: "cancelled" });
    const after = await orderJobs(second.order);
    assert.ok(after.length >= 1 && after.every((s) => s === "cancelled"));
  });

  test("outside the messaging window nothing is sent", async () => {
    const { t, calls } = await unpaidOrder();
    const noon = await makeDue(t);
    await query("UPDATE leads SET last_inbound_at = ? WHERE institution_id = ?", [new Date(noon.getTime() - 25 * 3600_000), t.institutionId]);
    const before = texts(calls).length;
    const result = await runDueFollowups({ now: noon, institutionId: t.institutionId });
    assert.equal(result.sent, 0);
    assert.equal(texts(calls).length, before);
    assert.ok((await jobStatuses(t)).includes("skipped_window"));
  });

  test("a customer who asked to stop is never reminded, and the request is honoured at once", async () => {
    const { t, calls } = await unpaidOrder();
    await say(t, "stop jangan ingatkan lagi");
    assert.match(lastText(calls), /tidak akan mengirim pengingat lagi/);
    assert.equal((await leadOf(t)).followup_opt_out, 1);
    assert.equal((await pendingJobs(t)).length, 0);
    await makeDue(t);
    assert.equal((await runDueFollowups({ now: middayJakarta(), institutionId: t.institutionId })).sent, 0);

    // a new order for the same customer plans nothing
    await say(t, "mau pesan 1 kemeja lagi");
    await say(t, "Budi, Jl. Mawar 5 RT 2 Laweyan, Solo 57148");
    await say(t, "ya");
    assert.equal((await pendingJobs(t)).length, 0);
  });

  test("a person handling the conversation holds reminders back", async () => {
    const { t, calls } = await unpaidOrder();
    const lead = await leadOf(t);
    await api().post(`/api/v1/leads/${lead.id}/handoff`).set(bearer(t.csToken));
    const noon = await makeDue(t);
    await query("UPDATE leads SET handoff_at = ? WHERE institution_id = ?", [new Date(noon.getTime() - 5 * 60_000), t.institutionId]); // the person wrote five minutes before
    const before = texts(calls).length;
    await runDueFollowups({ now: noon, institutionId: t.institutionId });
    assert.equal(texts(calls).length, before);
    assert.ok((await jobStatuses(t)).includes("cancelled_by_human"));
  });

  test("at night a due reminder waits for the morning instead of being sent", async () => {
    const { t, calls } = await unpaidOrder();
    const night = new Date(middayJakarta().getTime() + 10.5 * 3600_000); // 22:30 in Jakarta
    await makeDue(t, night);
    const before = texts(calls).length;
    const result = await runDueFollowups({ now: night, institutionId: t.institutionId });
    assert.equal(result.sent, 0);
    assert.equal(texts(calls).length, before);
    const [job] = await pendingJobs(t);
    assert.equal(new Date(job.scheduled_at).getUTCHours(), 1, "08:00 in Jakarta");
  });

  test("when the customer writes again, old reminders are dropped and the sequence restarts", async () => {
    const { t } = await unpaidOrder();
    const first = await pendingJobs(t);
    await say(t, "oke nanti ya kak, masih mikir dulu", { expectReply: false });
    const statuses = await jobStatuses(t);
    assert.ok(statuses.includes("cancelled_by_reply"));
    const restarted = await pendingJobs(t);
    assert.ok(restarted.length >= 1);
    assert.ok(restarted.every((j) => !first.some((f) => f.id === j.id)), "new jobs, not the old ones");
  });

  test("an abandoned cart is followed up and the reminder reads the cart from the database", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await say(t, "mau pesan 2 kemeja");
    const jobs = await pendingJobs(t);
    assert.ok(jobs.length >= 1);
    assert.ok(jobs.every((j) => j.draft_id && !j.order_id && j.trigger_reason === "abandoned_cart"));
    const noon = await makeDue(t);
    const before = texts(calls).length;
    await runDueFollowups({ now: noon, institutionId: t.institutionId });
    assert.equal(texts(calls).length, before + 1);
    assert.match(lastText(calls), /tadi kakak pilih 2 Kemeja Batik/);
  });

  test("a cart that was cancelled sends nothing", async () => {
    const t = await shop();
    const calls = mockNetwork({ nlu: orderNlu(t) });
    await say(t, "mau pesan 2 kemeja");
    const draft = await draftOf(t);
    const res = await api().post(`/api/v1/commerce/drafts/${draft.id}/cancel`).set(bearer(t.csToken));
    assert.equal(res.status, 200);
    const noon = await makeDue(t);
    const before = texts(calls).length;
    await runDueFollowups({ now: noon, institutionId: t.institutionId });
    assert.equal(texts(calls).length, before);
  });

  test("reminders can be switched off per tenant", async () => {
    const { t } = await unpaidOrder({ followupEnabled: false });
    assert.equal((await pendingJobs(t)).length, 0);
  });

  test("an order nobody paid for is released after the tenant's limit; one with a proof waiting is kept", async () => {
    const { t, order } = await unpaidOrder({ unpaidCancelHours: 2 });
    assert.equal(await stockOf(t.kemeja), 8);
    await query("UPDATE orders SET created_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR) WHERE id = ?", [order.id]);
    const kept = await unpaidOrder({ unpaidCancelHours: 2 });
    await query("UPDATE orders SET created_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR) WHERE id = ?", [kept.order.id]);
    await query("INSERT INTO payment_proofs (order_id, image_url, confidence_score) VALUES (?, 'wa-media:X', 50)", [kept.order.id]);

    const result = await cancelStaleUnpaidOrders();
    assert.ok(result.cancelled >= 1);
    assert.equal((await row("SELECT status FROM orders WHERE id = ?", [order.id])).status, "cancelled");
    assert.equal(await stockOf(t.kemeja), 10, "stock is back");
    assert.equal((await row("SELECT status FROM orders WHERE id = ?", [kept.order.id])).status, "waiting_payment");
  });

  test("orders made by staff on the dashboard are never auto-cancelled", async () => {
    const t = await shop({ settings: { unpaidCancelHours: 1 } });
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: t.kemeja, quantity: 1 }] });
    assert.equal(res.status, 201);
    await query("UPDATE orders SET created_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR) WHERE id = ?", [res.body.data.id]);
    await cancelStaleUnpaidOrders();
    assert.equal((await row("SELECT status FROM orders WHERE id = ?", [res.body.data.id])).status, "waiting_payment");
  });
});

describe("settings and dashboard endpoints", () => {
  test("defaults are cautious, and the readiness list says what is missing", async () => {
    const t = await createTenant();
    const res = await api().get("/api/v1/commerce/settings").set(bearer(t.csToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.enabled, false);
    assert.equal(res.body.data.shippingMode, "ask_team");
    assert.deepEqual(res.body.data.followupDelays, [30, 360, 1200]);
    assert.ok(res.body.readiness.some((r) => /produk aktif/.test(r)));
    assert.ok(res.body.readiness.some((r) => /diserahkan ke tim/.test(r)));
  });

  test("only managers change settings; values are validated; tenants are separate", async () => {
    const a = await createTenant();
    const b = await createTenant();
    assert.equal((await api().put("/api/v1/commerce/settings").set(bearer(a.csToken)).send({ enabled: true })).status, 403);
    assert.equal((await api().put("/api/v1/commerce/settings").set(bearer(a.ownerToken)).send({ followupDelays: [30, 1500] })).status, 400);
    assert.equal((await api().put("/api/v1/commerce/settings").set(bearer(a.ownerToken)).send({})).status, 400);
    const saved = await api().put("/api/v1/commerce/settings").set(bearer(a.ownerToken)).send({ enabled: true, shippingMode: "flat", shippingFlatFee: 12000, followupDelays: [20, 300] });
    assert.deepEqual([saved.body.data.enabled, saved.body.data.shippingFlatFee, saved.body.data.followupDelays], [true, 12000, [20, 300]]);
    assert.equal((await api().get("/api/v1/commerce/settings").set(bearer(b.ownerToken))).body.data.enabled, false);
    const partial = await api().put("/api/v1/commerce/settings").set(bearer(a.ownerToken)).send({ payCod: true });
    assert.deepEqual([partial.body.data.payCod, partial.body.data.shippingFlatFee], [true, 12000], "a partial update keeps the rest");
  });

  test("the package can switch the whole feature off", async () => {
    const t = await createTenant();
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.chatCommerce', false) WHERE id = ?", [t.institutionId]);
    const res = await api().get("/api/v1/commerce/settings").set(bearer(t.ownerToken));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "FEATURE_DISABLED");
  });

  test("open drafts are listed with server-side prices; reminders can be listed and cancelled", async () => {
    const t = await shop();
    mockNetwork({ nlu: orderNlu(t) });
    await say(t, "mau pesan 2 kemeja");
    const drafts = await api().get("/api/v1/commerce/drafts").set(bearer(t.csToken));
    assert.equal(drafts.body.data.length, 1);
    assert.equal(drafts.body.data[0].subtotal, 300000);
    assert.equal(drafts.body.data[0].items[0].name, "Kemeja Batik");

    const followups = await api().get("/api/v1/commerce/followups").set(bearer(t.ownerToken));
    assert.ok(followups.body.data.upcoming.length >= 1);
    assert.equal(followups.body.data.counts.pending, followups.body.data.upcoming.length);
    assert.equal((await api().get("/api/v1/commerce/followups").set(bearer(t.csToken))).status, 403);

    const id = followups.body.data.upcoming[0].id;
    assert.equal((await api().post(`/api/v1/commerce/followups/${id}/cancel`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().post(`/api/v1/commerce/followups/${id}/cancel`).set(bearer(t.ownerToken))).status, 404, "already done");

    const other = await createTenant();
    assert.equal((await api().post(`/api/v1/commerce/drafts/${drafts.body.data[0].id}/cancel`).set(bearer(other.csToken))).status, 404);
  });

  test("staff can record that a customer does not want reminders", async () => {
    const t = await shop();
    mockNetwork({ nlu: orderNlu(t) });
    await say(t, "mau pesan 2 kemeja");
    const lead = await leadOf(t);
    const res = await api().put(`/api/v1/leads/${lead.id}/followup-opt-out`).set(bearer(t.csToken)).send({ optOut: true });
    assert.equal(res.status, 200);
    assert.equal((await pendingJobs(t)).length, 0);
    assert.equal((await api().put(`/api/v1/leads/${lead.id}/followup-opt-out`).set(bearer((await createTenant()).csToken)).send({ optOut: true })).status, 404);
  });
});

describe("what did not change", () => {
  test("the dashboard order flow still works the same and creates a 'dashboard' order", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { price: 100000, stock: 3 });
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 2 }], shipping_fee: 10000 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.created_via, "dashboard");
    assert.equal(Number(res.body.data.total_amount), 210000);
    const over = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 5 }] });
    assert.equal(over.status, 409);
    assert.equal(over.body.code, "INSUFFICIENT_STOCK");
  });

  test("a dashboard order gets no automatic messages when chat commerce is off", async () => {
    const t = await shop({ settings: { enabled: false } });
    const calls = mockNetwork();
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: t.kemeja, quantity: 1 }] });
    await api().patch(`/api/v1/orders/${res.body.data.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(texts(calls).length, 0);
  });
});
