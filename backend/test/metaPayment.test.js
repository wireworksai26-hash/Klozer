import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { createChannel } from "../src/services/channels/channelRepository.js";
import { sendText } from "../src/services/channels/channelService.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

let seq = 0;
async function shopWithNumber() {
  const t = await createTenant();
  const channel = await createChannel({ institutionId: t.institutionId, type: "whatsapp", name: "Toko", externalId: `7${Date.now() % 100000}${++seq}`, accessToken: "EAAG-token" });
  return { t, channel };
}

const answer = (status, json) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => json });
const metaReplies = (...outcomes) => {
  let i = 0;
  mock.method(globalThis, "fetch", async () => outcomes[Math.min(i++, outcomes.length - 1)]);
};
const listed = async (t) => (await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data[0];
const PAYMENT_ERROR = answer(400, { error: { code: 131042, message: "Business eligibility payment issue" } });
const SENT = answer(200, { messages: [{ id: "wamid.1" }] });

describe("a WhatsApp number Meta will not send from because of payment", () => {
  test("the dashboard is told, and told no more once messages go through again", async () => {
    const { t, channel } = await shopWithNumber();
    assert.equal((await listed(t)).config.paymentIssueAt, undefined);

    metaReplies(PAYMENT_ERROR);
    const refused = await sendText({ institutionId: t.institutionId, channelId: channel.id, to: "6281234567890", text: "Halo" });
    assert.equal(refused.success, false);
    assert.equal(refused.errorCode, 131042);
    assert.ok((await listed(t)).config.paymentIssueAt, "the owner can see Meta is refusing messages");

    metaReplies(SENT);
    assert.equal((await sendText({ institutionId: t.institutionId, channelId: channel.id, to: "6281234567890", text: "Halo" })).success, true);
    assert.equal((await listed(t)).config.paymentIssueAt, undefined, "the warning goes away once a message is delivered");
  });

  test("an ordinary failure does not raise the payment warning", async () => {
    const { t, channel } = await shopWithNumber();
    metaReplies(answer(400, { error: { code: 131026, message: "Message undeliverable" } }));
    await sendText({ institutionId: t.institutionId, channelId: channel.id, to: "6281234567890", text: "Halo" });
    assert.equal((await listed(t)).config.paymentIssueAt, undefined);
  });
});

describe("free replies left on a WhatsApp number", () => {
  test("only replies from this month count, and broadcast templates are left out", async () => {
    const { t, channel } = await shopWithNumber();
    const lead = (await query("INSERT INTO leads (institution_id, phone_number, name) VALUES (?, ?, 'Budi')", [t.institutionId, `62811${Date.now() % 1000000}`])).insertId;
    const add = (sender, created, meta = null) =>
      query("INSERT INTO chat_messages (institution_id, lead_id, channel_id, sender_type, content_text, is_delivered, created_at, meta_json) VALUES (?, ?, ?, ?, 'x', 1, ?, ?)", [t.institutionId, lead, channel.id, sender, created, meta]);
    await add("ai_agent", new Date());
    await add("cs", new Date());
    await add("customer", new Date()); // customers write for free
    await add("cs", new Date(), JSON.stringify({ broadcast: { campaignId: 1 } })); // billed as a template instead
    await add("ai_agent", new Date("2020-01-15T00:00:00Z")); // an old month

    const usage = (await listed(t)).metaUsage;
    assert.equal(usage.used, 2);
    assert.equal(usage.freeTier, 1000);
    assert.equal(usage.remainingFree, 998);
    assert.equal(usage.estimatedCost, 0);
  });
});
