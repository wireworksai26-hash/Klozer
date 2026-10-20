import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";
import { addAgent, aiMessages, leadOf, logs, mockNetwork, row, say, shop, write } from "./agentTestKit.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const call = (name, args = {}) => `@tool ${JSON.stringify({ name, args })}`;
const toolRows = (t, tool = null) => query(`SELECT * FROM agent_tool_calls WHERE institution_id = ?${tool ? " AND tool = ?" : ""} ORDER BY id`, tool ? [t.institutionId, tool] : [t.institutionId]);
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);

/** A shop whose only agent (the default one) has the given tools; it does not take orders, so the order flow stays out of the way. */
async function toolShop(tools, over = {}) {
  const t = await shop();
  const agent = await addAgent(t, { name: "Penjualan", description: "Melayani pelanggan toko", instructions: "Bantu pelanggan dengan ramah dan jujur.", isDefault: true, capabilities: { commerce: "off", tools }, ...over });
  return { ...t, agent };
}

describe("an agent that may look things up", () => {
  test("it asks for stock, gets the answer, and the customer reads only the final reply", async () => {
    const t = await toolShop(["check_stock"]);
    await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, stock: 10 });
    await createProduct(t.institutionId, { name: "Celana Chino", price: 200000, stock: 0 });
    const net = mockNetwork({ replies: [call("check_stock", { query: "kemeja" }), "Kemeja Batik ready kak, stok 10 pcs, harga Rp 150.000."] });

    await say(t, "ada kemeja batik ga?");

    assert.equal(net.calls.replies.length, 2, "one ask, one answer");
    assert.match(net.calls.replies[0].system, /\[ALAT YANG BOLEH KAMU PAKAI\]/);
    assert.match(net.calls.replies[0].system, /check_stock/);
    assert.doesNotMatch(net.calls.replies[0].system, /create_task|handoff_to_human|lookup_order/, "only the tools this agent was given");
    assert.match(net.calls.replies[1].user, /\[HASIL ALAT/);
    assert.match(net.calls.replies[1].user, /"name":"Kemeja Batik"/);
    assert.match(net.calls.replies[1].user, /"stock":10/);
    assert.doesNotMatch(net.calls.replies[1].user, /Celana Chino/);

    const [reply] = await aiMessages(t);
    assert.equal(reply.content_text, "Kemeja Batik ready kak, stok 10 pcs, harga Rp 150.000.");
    assert.equal(parse(reply.meta_json).tools.length, 1);
    assert.deepEqual(parse(reply.meta_json).tools[0], { name: "check_stock", ok: true });
    assert.equal(net.calls.graph.at(-1).body.text.body, reply.content_text, "what was sent is the final reply");

    const [logged] = await toolRows(t);
    assert.deepEqual([logged.tool, logged.ok, logged.agent_id, parse(logged.args_json)], ["check_stock", 1, t.agent.id, { query: "kemeja" }]);
    assert.equal(parse(logged.result_json).products[0].sku.length > 0, true);
    assert.equal(logged.lead_id, (await leadOf(t)).id);
  });

  test("tokens of every round are counted", async () => {
    const t = await toolShop(["check_stock"]);
    mockNetwork({ replies: [call("check_stock", { query: "apa saja" }), "Belum ada produk dengan nama itu kak."] });
    await say(t, "ada apa saja?");
    const usage = await row("SELECT prompt_tokens, completion_tokens, usage_type FROM ai_token_usage_logs WHERE institution_id = ? AND usage_type <> 'agent_router'", [t.institutionId]);
    assert.deepEqual([usage.prompt_tokens, usage.completion_tokens], [400, 40]);
  });

  test("an empty search says so, and the model is told not to invent a product", async () => {
    const t = await toolShop(["check_stock"]);
    const net = mockNetwork({ replies: [call("check_stock", { query: "jaket" }), "Maaf kak, jaket belum ada."] });
    await say(t, "ada jaket?");
    assert.match(net.calls.replies[1].user, /Jangan mengarang produk/);
  });

  test("it can see its customer's orders and nobody else's", async () => {
    const t = await toolShop(["lookup_order"]);
    const product = await createProduct(t.institutionId, { name: "Kemeja", price: 100000, stock: 20 });
    const mine = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ phone_number: t.from, customer_name: "Pembeli", customer_phone: t.from, items: [{ product_id: product, quantity: 1 }] });
    const theirs = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ phone_number: "6281599999999", customer_name: "Orang Lain", customer_phone: "6281599999999", items: [{ product_id: product, quantity: 1 }] });
    assert.equal(mine.status, 201);
    assert.equal(theirs.status, 201);
    const myNumber = mine.body.data.order_number ?? mine.body.data.orderNumber;
    const theirNumber = theirs.body.data.order_number ?? theirs.body.data.orderNumber;
    assert.ok(myNumber && theirNumber);

    const net = mockNetwork({ replies: [call("lookup_order"), "Pesananmu menunggu pembayaran ya kak."] });
    await say(t, "pesanan saya gimana?");
    assert.match(net.calls.replies[1].user, new RegExp(myNumber));
    assert.doesNotMatch(net.calls.replies[1].user, new RegExp(theirNumber));

    const net2 = mockNetwork({ replies: [call("lookup_order", { orderNumber: theirNumber }), "Maaf kak, nomor itu tidak ketemu."] });
    await say(t, "cek pesanan nomor lain");
    assert.match(net2.calls.replies[1].user, /tidak punya pesanan dengan nomor itu/);
    assert.doesNotMatch(net2.calls.replies[1].user, new RegExp(theirNumber.replace(/[-]/g, "\\-") + ".*Total"));
  });
});

describe("what an agent is held to", () => {
  test("a tool it was not given is refused and nothing happens", async () => {
    const t = await toolShop(["check_stock"]);
    const net = mockNetwork({ replies: [call("create_task", { title: "Telepon pelanggan besok", type: "follow_up" }), "Baik kak."] });
    await say(t, "tolong hubungi saya besok");
    assert.match(net.calls.replies[1].user, /Alat ini tidak tersedia/);
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM tasks WHERE institution_id = ?", [t.institutionId])).n), 0);
    const [logged] = await toolRows(t);
    assert.deepEqual([logged.tool, logged.ok], ["create_task", 0]);
  });

  test("an unknown tool and malformed requests are told what was wrong, and never run", async () => {
    const t = await toolShop(["check_stock"]);
    const net = mockNetwork({ replies: ["@tool {rusak\n" + call("hapus_semua"), "Baik kak."] });
    await say(t, "halo");
    assert.match(net.calls.replies[1].user, /hapus_semua \(gagal\)/);
    assert.match(net.calls.replies[1].user, /JSON yang valid/);
  });

  test("arguments are checked; a request with bad arguments does not run", async () => {
    const t = await toolShop(["create_task"]);
    const net = mockNetwork({ replies: [call("create_task", { title: "ok", type: "terbang", dueInMinutes: 1 }), "Baik kak."] });
    await say(t, "kabari saya ya");
    assert.match(net.calls.replies[1].user, /Argumen tidak valid/);
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM tasks WHERE institution_id = ?", [t.institutionId])).n), 0);
  });

  test("a model that never stops asking is cut off after a few rounds, and the chat goes to a person", async () => {
    const t = await toolShop(["check_stock"]);
    const net = mockNetwork({ replies: Array.from({ length: 10 }, () => call("check_stock", { query: "kemeja" })) });
    await write(t, "ada kemeja?");
    await waitFor(() => net.calls.replies.length >= 4);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(net.calls.replies.length, 4, "the first answer and three rounds, no more");
    assert.equal((await aiMessages(t)).length, 0, "nothing half-finished was sent to the customer");
    assert.equal((await toolRows(t)).length, 3);
  });

  test("one reply can use only so many tools in all", async () => {
    const t = await toolShop(["check_stock"]);
    const three = [call("check_stock", { query: "a1" }), call("check_stock", { query: "b2" }), call("check_stock", { query: "c3" })].join("\n");
    const net = mockNetwork({ replies: [three, three, three, "Selesai kak."] });
    await say(t, "cek banyak");
    const rows = await toolRows(t);
    assert.deepEqual(rows.map((r) => r.ok), [1, 1, 1, 1, 1, 1, 0, 0, 0]);
    assert.match(rows[6].error, /Batas pemakaian alat/);
    assert.equal(net.calls.replies.length, 4);
    assert.equal((await aiMessages(t))[0].content_text, "Selesai kak.");
  });

  test("an agent without tools is not offered any, and a stray request line never reaches the customer", async () => {
    const t = await toolShop([]);
    const net = mockNetwork({ replies: ["Halo kak!\n" + call("check_stock", { query: "x" })] });
    await say(t, "halo");
    assert.doesNotMatch(net.calls.replies[0].system, /ALAT YANG BOLEH/);
    const [reply] = await aiMessages(t);
    assert.equal(reply.content_text, "Halo kak!");
    assert.equal((await toolRows(t)).length, 0);
  });

  test("the package can switch the tools off for the whole shop", async () => {
    const t = await toolShop(["check_stock"]);
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.agentTools', false) WHERE id = ?", [t.institutionId]);
    const net = mockNetwork({ replies: [call("check_stock", { query: "kemeja" })] });
    await write(t, "ada kemeja?");
    await waitFor(() => net.calls.replies.length >= 1);
    await new Promise((r) => setTimeout(r, 200));
    assert.doesNotMatch(net.calls.replies[0].system, /ALAT YANG BOLEH/);
    assert.equal((await toolRows(t)).length, 0);
  });

  test("a tool that needs the task area is not offered when the package has no tasks", async () => {
    const t = await toolShop(["create_task", "check_stock"]);
    await query("UPDATE institutions SET features_json = JSON_SET(features_json, '$.tasks', false) WHERE id = ?", [t.institutionId]);
    const net = mockNetwork();
    await say(t, "halo");
    assert.match(net.calls.replies[0].system, /check_stock/);
    assert.doesNotMatch(net.calls.replies[0].system, /create_task/);
  });
});

describe("an agent that may write", () => {
  test("it makes a task for the team once, with its name on it", async () => {
    const t = await toolShop(["create_task"]);
    await query("INSERT INTO webhook_endpoints (institution_id, name, url, encrypted_secret, events_json) VALUES (?, 'n8n', 'https://example.test/hook', 'x', '[\"task.created\"]')", [t.institutionId]);
    const ask = call("create_task", { title: "Kabari pelanggan soal stok kemeja", type: "follow_up", note: "Pelanggan minta dikabari kalau ready", dueInMinutes: 1440, priority: "high" });
    const net = mockNetwork({ replies: [ask, "Siap kak, nanti tim kami kabari ya.", ask, "Sudah dicatat ya kak."] });

    await say(t, "kabari saya kalau kemeja ready");
    const lead = await leadOf(t);
    const task = await row("SELECT * FROM tasks WHERE institution_id = ?", [t.institutionId]);
    assert.deepEqual([task.source, task.agent_id, task.lead_id, task.type, task.priority, task.status, task.title], ["ai_agent", t.agent.id, lead.id, "follow_up", "high", "open", "Kabari pelanggan soal stok kemeja"]);
    const hours = (new Date(task.due_at) - Date.now()) / 3600_000;
    assert.ok(hours > 23.9 && hours <= 24, `due in ${hours} hours`);
    assert.equal(task.assigned_to, lead.assigned_cs_id);
    const events = await query("SELECT event, actor_type, actor_agent_id FROM task_events WHERE task_id = ?", [task.id]);
    assert.deepEqual(events.map((e) => [e.event, e.actor_type, e.actor_agent_id]), [["created", "ai_agent", t.agent.id]]);
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM webhook_deliveries WHERE institution_id = ? AND event_type = 'task.created'", [t.institutionId])).n), 1);

    await say(t, "kabari ya, jangan lupa");
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM tasks WHERE institution_id = ?", [t.institutionId])).n), 1, "asking again does not pile up tasks");
    assert.match(net.calls.replies[3].user, /Sudah ada tugas serupa/);
    assert.deepEqual((await toolRows(t)).map((r) => r.ok), [1, 1]);
  });

  test("it decides step by step: checks stock, sees it is out, asks the warehouse team, then tells the customer", async () => {
    const t = await toolShop(["check_stock", "create_task"]);
    await createProduct(t.institutionId, { name: "Celana Chino", price: 200000, stock: 0 });
    const net = mockNetwork({
      replies: [
        call("check_stock", { query: "chino" }),
        call("create_task", { title: "Cek restock Celana Chino ke gudang", type: "check_stock", dueInMinutes: 120 }),
        "Celana Chino lagi kosong kak. Aku sudah minta tim cek restock, nanti dikabari ya.",
      ],
    });

    await say(t, "ada celana chino? kalau habis tolong cek ke gudang");

    assert.equal(net.calls.replies.length, 3);
    assert.match(net.calls.replies[1].user, /"stock":0/);
    assert.match(net.calls.replies[2].user, /"stock":0/, "the second answer still has the first result");
    assert.match(net.calls.replies[2].user, /taskId/);
    assert.deepEqual((await toolRows(t)).map((r) => [r.tool, r.ok]), [["check_stock", 1], ["create_task", 1]]);
    const task = await row("SELECT type, source, title FROM tasks WHERE institution_id = ?", [t.institutionId]);
    assert.deepEqual([task.type, task.source], ["check_stock", "ai_agent"]);
    assert.equal((await aiMessages(t)).length, 1);
    assert.deepEqual(parse((await aiMessages(t))[0].meta_json).tools.map((x) => x.name), ["check_stock", "create_task"]);
  });

  test("it hands the chat to the team after answering, and the shop's task rule follows", async () => {
    const t = await toolShop(["handoff_to_human"]);
    await api().put("/api/v1/tasks/settings").set(bearer(t.ownerToken)).send({ autoOnHandoff: true });
    mockNetwork({ replies: [call("handoff_to_human", { reason: "pelanggan minta nego harga besar" }), "Untuk nego harga, tim kami yang lanjutkan ya kak."] });

    await say(t, "bisa nego harga untuk 100 pcs?");

    const lead = await leadOf(t);
    // the hand-off follows the reply, so give it a moment to finish
    const task = await waitFor(() => row("SELECT type, source, title FROM tasks WHERE lead_id = ?", [lead.id]));
    assert.deepEqual([task.type, task.source], ["handle_chat", "rule"]);
    const held = await leadOf(t);
    assert.equal(held.handled_by, "human");
    assert.equal(held.handoff_reason, "ai:pelanggan minta nego harga besar");
    const messages = await query("SELECT sender_type, content_text FROM chat_messages WHERE lead_id = ? ORDER BY id", [lead.id]);
    assert.deepEqual(messages.map((m) => m.sender_type), ["customer", "ai_agent", "system"], "the customer is answered first, then the note");
    assert.match(messages[2].content_text, /AI meminta bantuan tim: pelanggan minta nego harga besar/);

    await write(t, "halo?");
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await aiMessages(t)).length, 1, "the AI stays quiet while the team holds the chat");
  });
});

describe("agents working together", () => {
  async function pair(tools) {
    const t = await shop();
    const seller = await addAgent(t, { name: "Penjualan", description: "Melayani calon pembeli", instructions: "Bantu pelanggan memilih produk.", isDefault: true, capabilities: { commerce: "off", tools } });
    const care = await addAgent(t, { name: "Layanan Pelanggan", description: "Garansi dan retur", instructions: "Jawab soal garansi dan retur dengan jelas.", capabilities: { commerce: "off" } });
    return { ...t, seller, care };
  }

  test("an agent asks another for facts and answers the customer itself", async () => {
    const t = await pair(["consult_agent"]);
    const net = mockNetwork({
      replies: [call("consult_agent", { agent: "layanan pelanggan", question: "Berapa lama garansi produk?" }), "Garansinya 30 hari ya kak."],
      consult: () => "Garansi produk 30 hari sejak barang diterima.",
    });

    await say(t, "garansinya berapa lama?");

    assert.equal(net.calls.consults.length, 1);
    assert.match(net.calls.consults[0].system, /PERAN KAMU SAAT INI: Layanan Pelanggan/, "the consulted agent answers in its own role");
    assert.match(net.calls.consults[0].system, /MODE KONSULTASI INTERNAL/);
    assert.doesNotMatch(net.calls.consults[0].system, /ALAT YANG BOLEH/, "it has no tools of its own: no chains of agents");
    assert.match(net.calls.consults[0].user, /Berapa lama garansi produk\?/);
    assert.match(net.calls.replies[0].system, /consult_agent/);
    assert.match(net.calls.replies[1].user, /Garansi produk 30 hari/);

    const [reply] = await aiMessages(t);
    assert.equal(reply.content_text, "Garansinya 30 hari ya kak.");
    assert.equal(reply.ai_agent_id, t.seller.id, "the customer's agent is still the one who answered");
    assert.equal((await leadOf(t)).ai_agent_id, t.seller.id);
    assert.equal(Number((await row("SELECT COUNT(*) AS n FROM ai_token_usage_logs WHERE institution_id = ? AND usage_type = 'agent_consult'", [t.institutionId])).n), 1);
  });

  test("an unknown agent, itself, a switched-off agent and a third question are all refused", async () => {
    const t = await pair(["consult_agent"]);
    const off = await addAgent(t, { name: "Cadangan", description: "Agen yang dimatikan", instructions: "Tidak dipakai lagi.", isActive: false });
    const net = mockNetwork({
      replies: [[call("consult_agent", { agent: "Tidak Ada", question: "Halo?" }), call("consult_agent", { agent: "Penjualan", question: "Tanya diri sendiri" }), call("consult_agent", { agent: off.name, question: "Apa kabar?" })].join("\n"), call("consult_agent", { agent: "Layanan Pelanggan", question: "Satu" }) + "\n" + call("consult_agent", { agent: "Layanan Pelanggan", question: "Dua" }) + "\n" + call("consult_agent", { agent: "Layanan Pelanggan", question: "Tiga" }), "Baik kak."],
    });
    await say(t, "halo");
    const rows = await toolRows(t, "consult_agent");
    assert.deepEqual(rows.map((r) => r.ok), [0, 0, 0, 1, 1, 0]);
    assert.match(rows[0].error, /Tidak ada agen bernama "Tidak Ada"\. Yang ada: Layanan Pelanggan\./);
    assert.match(rows[5].error, /terlalu sering/);
    assert.equal(net.calls.consults.length, 2);
  });

  test("a consult that gets no answer is reported, and the reply carries on without it", async () => {
    const t = await pair(["consult_agent"]);
    const net = mockNetwork({ replies: [call("consult_agent", { agent: "Layanan Pelanggan", question: "Berapa garansinya?" }), "Aku cek dulu ke tim ya kak."], consult: () => null });
    await say(t, "garansi?");
    assert.match(net.calls.replies[1].user, /tidak bisa menjawab pertanyaan itu/);
    assert.equal((await aiMessages(t)).length, 1);
  });

  test("the only agent has no one to ask: the tool is not offered", async () => {
    const t = await toolShop(["consult_agent", "transfer_to_agent", "check_stock"]);
    const net = mockNetwork();
    await say(t, "halo");
    assert.match(net.calls.replies[0].system, /check_stock/);
    assert.doesNotMatch(net.calls.replies[0].system, /consult_agent|transfer_to_agent/);
  });

  test("an agent passes the chat on; this reply is still its own, the next message goes to the other agent", async () => {
    const t = await pair(["transfer_to_agent"]);
    const net = mockNetwork({ replies: [call("transfer_to_agent", { agent: "Layanan Pelanggan", reason: "urusan retur" }), "Untuk retur, aku sambungkan ke rekan kami ya kak."] });

    await say(t, "barang saya mau diretur");
    const lead = await leadOf(t);
    assert.equal(lead.ai_agent_id, t.care.id);
    const [first] = await aiMessages(t);
    assert.equal(first.ai_agent_id, t.seller.id);
    const [log] = (await logs(t)).slice(-1);
    assert.deepEqual([log.method, log.from_name, log.to_name, log.reason], ["tool", "Penjualan", "Layanan Pelanggan", "dipindahkan oleh Penjualan: urusan retur"]);
    const note = await row("SELECT content_text FROM chat_messages WHERE lead_id = ? AND sender_type = 'system' ORDER BY id DESC LIMIT 1", [lead.id]);
    assert.match(note.content_text, /Agen AI: Penjualan → Layanan Pelanggan/);

    await say(t, "oke, prosesnya gimana?");
    assert.match(net.calls.replies.at(-1).system, /PERAN KAMU SAAT INI: Layanan Pelanggan/);
    assert.equal((await aiMessages(t)).at(-1).ai_agent_id, t.care.id);
  });

  test("staff's choice stands: a pinned chat cannot be moved by an agent", async () => {
    const t = await pair(["transfer_to_agent"]);
    const net = mockNetwork({ replies: ["Halo kak!", call("transfer_to_agent", { agent: "Layanan Pelanggan" }), "Baik kak, aku bantu sendiri ya."] });
    await say(t, "halo");
    const lead = await leadOf(t);
    await api().put(`/api/v1/leads/${lead.id}/agent`).set(bearer(t.csToken)).send({ agentId: t.seller.id, pinned: true });
    const before = (await logs(t)).length;

    await say(t, "barang saya mau diretur");
    assert.equal((await leadOf(t)).ai_agent_id, t.seller.id);
    assert.match(net.calls.replies.at(-1).user, /dikunci staf/);
    assert.equal((await logs(t)).length, before);
  });

  test("a chat is moved at most once per reply, and an unknown target is refused", async () => {
    const t = await pair(["transfer_to_agent"]);
    const extra = await addAgent(t, { name: "Teknis", description: "Masalah teknis", instructions: "Bantu soal teknis produk." });
    mockNetwork({ replies: [[call("transfer_to_agent", { agent: "Layanan Pelanggan" }), call("transfer_to_agent", { agent: "Teknis" }), call("transfer_to_agent", { agent: "Gaib" })].join("\n"), "Ya kak."] });
    await say(t, "halo");
    assert.equal((await leadOf(t)).ai_agent_id, t.care.id);
    assert.deepEqual((await toolRows(t, "transfer_to_agent")).map((r) => r.ok), [1, 0, 0]);
    assert.ok(extra.id);
  });
});

describe("choosing and reviewing tools", () => {
  test("the owner picks tools per agent; unknown names are refused; the list is kept as given", async () => {
    const t = await shop();
    const bad = await api().post("/api/v1/ai/agents").set(bearer(t.ownerToken)).send({ name: "Agen", description: "Agen percobaan", instructions: "Bantu pelanggan.", capabilities: { tools: ["hapus_semua"] } });
    assert.equal(bad.status, 400);
    const agent = await addAgent(t, { name: "Agen", capabilities: { tools: ["check_stock", "create_task"] } });
    assert.deepEqual(agent.capabilities, { commerce: "full", tools: ["check_stock", "create_task"] });
    const changed = await api().put(`/api/v1/ai/agents/${agent.id}`).set(bearer(t.ownerToken)).send({ capabilities: { tools: [] } });
    assert.deepEqual(changed.body.data.capabilities, { commerce: "full", tools: [] });
    const onlyCommerce = await api().put(`/api/v1/ai/agents/${agent.id}`).set(bearer(t.ownerToken)).send({ capabilities: { commerce: "service" } });
    assert.deepEqual(onlyCommerce.body.data.capabilities, { commerce: "service", tools: [] });
  });

  test("the screen can list what tools exist; only managers see it", async () => {
    const t = await shop();
    const res = await api().get("/api/v1/ai/agents/tools").set(bearer(t.ownerToken));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.map((x) => x.name), ["check_stock", "lookup_order", "create_task", "handoff_to_human", "consult_agent", "transfer_to_agent"]);
    assert.equal((await api().get("/api/v1/ai/agents/tools").set(bearer(t.csToken))).status, 403);
  });

  test("what agents did is reviewable by tool, outcome and conversation, and only for the shop's own", async () => {
    const t = await toolShop(["check_stock", "create_task"]);
    const other = await toolShop(["check_stock"]);
    mockNetwork({ replies: [call("check_stock", { query: "kemeja" }) + "\n" + call("create_task", { title: "x" }), "Baik kak."] });
    await say(t, "halo");
    mockNetwork({ replies: [call("check_stock", { query: "kemeja" }), "Baik kak."] });
    await say(other, "halo");

    const all = await api().get("/api/v1/ai/agents/tool-calls").set(bearer(t.ownerToken));
    assert.deepEqual(all.body.data.map((c) => [c.tool, c.ok, c.agentName]).reverse(), [["check_stock", true, "Penjualan"], ["create_task", false, "Penjualan"]]);
    assert.equal(all.body.data[0].error, "Argumen tidak valid (title: terlalu pendek).");
    const failed = await api().get("/api/v1/ai/agents/tool-calls?ok=false").set(bearer(t.ownerToken));
    assert.deepEqual(failed.body.data.map((c) => c.tool), ["create_task"]);
    const byTool = await api().get("/api/v1/ai/agents/tool-calls?tool=check_stock").set(bearer(t.ownerToken));
    assert.equal(byTool.body.data.length, 1);
    const byLead = await api().get(`/api/v1/ai/agents/tool-calls?leadId=${(await leadOf(t)).id}`).set(bearer(t.ownerToken));
    assert.equal(byLead.body.data.length, 2);
    assert.equal((await api().get("/api/v1/ai/agents/tool-calls?tool=nope").set(bearer(t.ownerToken))).status, 400);
    assert.equal((await api().get("/api/v1/ai/agents/tool-calls").set(bearer(t.csToken))).status, 403);
  });
});
