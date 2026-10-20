import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { aiMessages, leadOf, mockNetwork, row, say, shop, write } from "./agentTestKit.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const HARD = "garansi untuk produk custom ukuran besar itu bagaimana ya kak, apakah tetap berlaku?";
const sendAs = (token, body) => api().post("/api/v1/chats/send").set(bearer(token)).send(body);

async function seller() {
  const t = await shop({ fastPath: true });
  await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, stock: 10 });
  return t;
}

describe("when the assistant cannot answer", () => {
  test("it says so with [TIM]: the customer gets the rest, the marker is never shown, and a person takes over", async () => {
    const t = await seller();
    const net = mockNetwork({ replies: ["[TIM] Untuk produk custom aku sambungkan ke tim kami ya kak, nanti dibantu langsung."] });
    await say(t, HARD);

    assert.match(net.calls.replies[0].system, /awali balasanmu persis dengan \[TIM\]/);
    const [reply] = await aiMessages(t);
    assert.equal(reply.content_text, "Untuk produk custom aku sambungkan ke tim kami ya kak, nanti dibantu langsung.");
    assert.equal(net.calls.graph.at(-1).body.text.body, reply.content_text);

    const lead = await leadOf(t);
    await new Promise((r) => setTimeout(r, 300));
    const held = await leadOf(t);
    assert.deepEqual([held.handled_by, held.handoff_reason], ["human", "ai_unsure"]);
    const note = await row("SELECT content_text FROM chat_messages WHERE lead_id = ? AND sender_type = 'system' ORDER BY id DESC LIMIT 1", [lead.id]);
    assert.match(note.content_text, /AI tidak yakin dan meneruskan ke tim/);

    await write(t, "halo, ada kabar?");
    await new Promise((r) => setTimeout(r, 400));
    assert.equal((await aiMessages(t)).length, 1, "the assistant stays quiet while the team holds the chat");
  });

  test("only a reply that starts with the marker counts; a bare marker gets a plain hand-off sentence", async () => {
    const mid = await seller();
    mockNetwork({ replies: ["Garansi berlaku 30 hari kak. [TIM] itu singkatan tim kami ya."] });
    await say(mid, HARD);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await leadOf(mid)).handled_by, "ai", "a marker in the middle is just text");

    const bare = await seller();
    mockNetwork({ replies: ["[tim]"] });
    await say(bare, HARD);
    const [reply] = await aiMessages(bare);
    assert.match(reply.content_text, /sambungkan ke tim kami/);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await leadOf(bare)).handoff_reason, "ai_unsure");
  });

  test("an ordinary answer is unaffected", async () => {
    const t = await seller();
    mockNetwork({ replies: ["Berlaku kak, garansinya tetap 30 hari."] });
    await say(t, HARD);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await leadOf(t)).handled_by, "ai");
  });
});

describe("a person asks for a draft, edits it, and sends it", () => {
  test("the draft appears for the person only: nothing reaches the customer and the tokens are counted as theirs", async () => {
    const t = await seller();
    const net = mockNetwork({ replies: ["Aku cek dulu ya kak.", "Garansi berlaku 30 hari sejak barang diterima ya kak."] });
    await say(t, HARD);
    const lead = await leadOf(t);
    const outgoing = net.calls.graph.length;
    const stored = Number((await row("SELECT COUNT(*) AS n FROM chat_messages WHERE lead_id = ?", [lead.id])).n);

    const res = await api().post(`/api/v1/chats/${lead.id}/suggest`).set(bearer(t.csToken)).send({});
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.data.draft, res.body.data.basedOn, res.body.data.needsPerson], ["Garansi berlaku 30 hari sejak barang diterima ya kak.", HARD, false]);

    assert.equal(net.calls.graph.length, outgoing, "nothing was sent");
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM chat_messages WHERE lead_id = ?", [lead.id])).n), stored, "nothing was stored");
    const used = await row("SELECT prompt_tokens, completion_tokens FROM ai_token_usage_logs WHERE institution_id = ? AND usage_type = 'staff_suggest'", [t.institutionId]);
    assert.deepEqual([used.prompt_tokens, used.completion_tokens], [200, 20]);
  });

  test("it needs a customer message, a shop with tokens, and the shop's own contact", async () => {
    const t = await seller();
    const other = await seller();
    mockNetwork({ replies: ["Aku cek dulu ya kak.", "Draf."] });
    const empty = (await query("INSERT INTO leads (institution_id, phone_number, name) VALUES (?, '6281700000001', 'Kosong')", [t.institutionId])).insertId;
    const none = await api().post(`/api/v1/chats/${empty}/suggest`).set(bearer(t.csToken)).send({});
    assert.deepEqual([none.status, none.body.code], [400, "NO_CUSTOMER_MESSAGE"]);

    await say(t, HARD);
    const lead = await leadOf(t);
    assert.equal((await api().post(`/api/v1/chats/${lead.id}/suggest`).set(bearer(other.csToken)).send({})).status, 404);
    assert.equal((await api().post(`/api/v1/chats/${lead.id}/suggest`).set(bearer(t.financeToken)).send({})).status, 403);

    await query("UPDATE institutions SET ai_tokens_used = ai_token_quota WHERE id = ?", [t.institutionId]);
    const out = await api().post(`/api/v1/chats/${lead.id}/suggest`).set(bearer(t.csToken)).send({});
    assert.deepEqual([out.status, out.body.code], [402, "TOKEN_QUOTA_EXHAUSTED"]);
  });

  test("when no model answers, the person is told to write it themselves", async () => {
    const t = await seller();
    mockNetwork({ replies: ["Aku cek dulu ya kak."] });
    await say(t, HARD);
    const lead = await leadOf(t);
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 503, headers: { get: () => null }, json: async () => ({}), text: async () => "" }));
    const res = await api().post(`/api/v1/chats/${lead.id}/suggest`).set(bearer(t.csToken)).send({});
    assert.deepEqual([res.status, res.body.code], [503, "AI_UNAVAILABLE"]);
  });

  test("an edited AI reply is sent as the person's own, and remembered as an edit of that reply", async () => {
    const t = await seller();
    const net = mockNetwork({ replies: ["Garansi 7 hari kak."] });
    await say(t, HARD);
    const lead = await leadOf(t);
    const [aiReply] = await aiMessages(t);

    const sent = await sendAs(t.csToken, { lead_id: lead.id, content_text: "Garansi 30 hari kak, berlaku juga untuk produk custom.", edited_from_message_id: aiReply.id });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.learned, false, "a CS edits and sends; teaching the assistant is for managers");
    assert.equal(net.calls.graph.at(-1).body.text.body, "Garansi 30 hari kak, berlaku juga untuk produk custom.");
    const message = await row("SELECT sender_type, sender_user_id, meta_json FROM chat_messages WHERE id = ?", [sent.body.data.id]);
    assert.deepEqual([message.sender_type, message.sender_user_id], ["cs", t.cs.id]);
    assert.deepEqual(typeof message.meta_json === "string" ? JSON.parse(message.meta_json) : message.meta_json, { editedFromMessageId: aiReply.id });
    assert.equal(await row("SELECT id FROM ai_corrections WHERE institution_id = ?", [t.institutionId]), undefined);
    assert.equal((await leadOf(t)).handled_by, "human", "the person now holds the chat");
  });

  test("a manager can have the assistant learn the corrected wording at the same time", async () => {
    const t = await seller();
    mockNetwork({ replies: ["Garansi 7 hari kak."] });
    await say(t, HARD);
    const lead = await leadOf(t);
    const [aiReply] = await aiMessages(t);

    const sent = await sendAs(t.ownerToken, { lead_id: lead.id, content_text: "Garansi 30 hari kak.", edited_from_message_id: aiReply.id, learn: true });
    assert.equal(sent.body.learned, true);
    const correction = await row("SELECT kind, corrected_reply, original_reply, customer_message FROM ai_corrections WHERE institution_id = ?", [t.institutionId]);
    assert.deepEqual([correction.kind, correction.corrected_reply, correction.original_reply, correction.customer_message], ["example", "Garansi 30 hari kak.", "Garansi 7 hari kak.", HARD]);
    assert.equal((await row("SELECT feedback FROM chat_messages WHERE id = ?", [aiReply.id])).feedback, "bad");
  });

  test("only a model's own reply can be learned from, and only one in this conversation", async () => {
    const t = await seller();
    mockNetwork({ replies: ["Aku cek dulu ya kak."] });
    await createProduct(t.institutionId, { name: "Sarung Tenun", price: 90000, stock: 3 });
    await api().post("/api/v1/bank-accounts").set(bearer(t.ownerToken)).send({ bank_code: "BCA", account_number: "123", account_holder: "Toko" });
    await say(t, "rekeningnya berapa ya");
    const lead = await leadOf(t);
    const [fast] = await aiMessages(t);
    assert.equal(fast.reply_path, "fast:payment");

    const fromFast = await sendAs(t.ownerToken, { lead_id: lead.id, content_text: "Transfer ke BCA 123 ya kak.", edited_from_message_id: fast.id, learn: true });
    assert.equal(fromFast.status, 201);
    assert.equal(fromFast.body.learned, false, "a reply made by code is not something to teach the model");
    assert.equal(await row("SELECT id FROM ai_corrections WHERE institution_id = ?", [t.institutionId]), undefined);

    const unknown = await sendAs(t.ownerToken, { lead_id: lead.id, content_text: "Halo", edited_from_message_id: 99999999 });
    assert.deepEqual([unknown.status, unknown.body.code], [400, "UNKNOWN_MESSAGE"]);

    const other = await seller();
    mockNetwork({ replies: ["Jawaban toko lain."] });
    await say(other, HARD);
    const [foreign] = await aiMessages(other);
    assert.equal((await sendAs(t.ownerToken, { lead_id: lead.id, content_text: "Halo", edited_from_message_id: foreign.id })).status, 400, "another shop's message cannot be named");
    assert.equal((await sendAs(t.ownerToken, { lead_id: lead.id, content_text: "Halo", edited_from_message_id: "bukan angka" })).status, 400);
  });
});
