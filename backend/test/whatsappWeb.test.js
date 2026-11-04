import "./setupWhatsapp.js";
import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { sendText } from "../src/services/channels/channelService.js";
import { setWhatsAppWebManager } from "../src/services/channels/whatsappWebManager.js";

before(setupDatabase);
after(teardownDatabase);

const QR = "data:image/png;base64,AAA";
const snapshot = (overrides = {}) => ({ status: "qr", qr: QR, phone: null, name: null, lastError: null, updatedAt: null, ...overrides });
let calls;

beforeEach(() => {
  calls = { started: 0, stopped: 0, loggedOut: 0, sent: [] };
  const manager = {
    start: async () => {
      calls.started++;
      return snapshot();
    },
    getStatus: () => snapshot(),
    hasAuth: async () => false,
    stop: async () => {
      calls.stopped++;
    },
    logout: async () => {
      calls.loggedOut++;
    },
    send: async ({ channel, to, text }) => {
      calls.sent.push({ channelId: channel.id, to, text });
      return { success: true, to, messageId: "bw:out" };
    },
    verify: async () => ({ ok: true, displayPhone: "628111", verifiedName: "Toko Batik" }),
    markRead: async () => ({ success: true }),
    downloadMedia: async () => null,
  };
  setWhatsAppWebManager(manager);
});

const start = (t, body = {}) => api().post("/api/v1/channels/whatsapp-web").set(bearer(t.ownerToken)).send(body);
const status = (t, id) => api().get(`/api/v1/channels/${id}/whatsapp-web`).set(bearer(t.ownerToken));

describe("WhatsApp QR channel", () => {
  test("starting creates one channel and returns the QR code", async () => {
    const t = await createTenant();
    const res = await start(t, { name: "WhatsApp CS", aiEnabled: false });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.channel.type, "whatsapp_web");
    assert.equal(res.body.data.channel.name, "WhatsApp CS");
    assert.equal(res.body.data.channel.aiEnabled, false);
    assert.equal(res.body.data.status, "qr");
    assert.equal(res.body.data.qr, QR);

    const [row] = await query("SELECT type, external_id, is_default FROM channels WHERE institution_id = ?", [t.institutionId]);
    assert.equal(row.type, "whatsapp_web");
    assert.match(row.external_id, /^web-[0-9a-f]{32}$/);
    assert.equal(row.is_default, 1);
  });

  test("asking again resumes the same channel instead of creating another", async () => {
    const t = await createTenant();
    const first = await start(t, { name: "WhatsApp" });
    const second = await start(t);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.channel.id, first.body.data.channel.id);
    const [count] = await query("SELECT COUNT(*) AS n FROM channels WHERE institution_id = ?", [t.institutionId]);
    assert.equal(count.n, 1);
    assert.equal(calls.started, 2);
  });

  test("status is tenant-scoped and the test endpoint asks the session", async () => {
    const t = await createTenant();
    const created = (await start(t)).body.data.channel;
    const found = await status(t, created.id);
    assert.equal(found.status, 200);
    assert.deepEqual(found.body.data.status, "qr");

    const other = await createTenant();
    assert.equal((await status(other, created.id)).status, 404);

    const checked = await api().post(`/api/v1/channels/${created.id}/test`).set(bearer(t.ownerToken));
    assert.equal(checked.status, 200);
    assert.equal(checked.body.success, true);
    assert.equal(checked.body.displayPhone, "628111");
  });

  test("CS staff cannot start or read the QR", async () => {
    const t = await createTenant();
    assert.equal((await api().post("/api/v1/channels/whatsapp-web").set(bearer(t.csToken)).send({})).status, 403);
    const created = (await start(t)).body.data.channel;
    assert.equal((await api().get(`/api/v1/channels/${created.id}/whatsapp-web`).set(bearer(t.csToken))).status, 403);
  });

  test("outgoing text leaves through the linked device", async () => {
    const t = await createTenant();
    const created = (await start(t)).body.data.channel;
    const result = await sendText({ institutionId: t.institutionId, channelId: created.id, type: "whatsapp_web", to: "081234567890", text: "Halo kak" });
    assert.deepEqual(result, { success: true, to: "6281234567890", messageId: "bw:out" });
    assert.deepEqual(calls.sent, [{ channelId: created.id, to: "6281234567890", text: "Halo kak" }]);
  });

  test("reconnect shows a new QR, and deleting the channel logs the device out", async () => {
    const t = await createTenant();
    const created = (await start(t)).body.data.channel;

    const again = await api().post(`/api/v1/channels/${created.id}/whatsapp-web/reconnect`).set(bearer(t.ownerToken));
    assert.equal(again.status, 200);
    assert.equal(again.body.data.status, "qr");
    assert.ok(calls.stopped >= 1);
    assert.ok(calls.started >= 2);

    const removed = await api().delete(`/api/v1/channels/${created.id}`).set(bearer(t.ownerToken));
    assert.equal(removed.status, 200);
    assert.equal(calls.loggedOut, 1);
    const [count] = await query("SELECT COUNT(*) AS n FROM channels WHERE institution_id = ?", [t.institutionId]);
    assert.equal(count.n, 0);
  });

  test("the generic add-channel endpoint refuses the QR type", async () => {
    const t = await createTenant();
    const res = await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "whatsapp_web", name: "WhatsApp" });
    assert.equal(res.status, 400);
  });

  test("the plan limit counts the QR channel", async () => {
    const t = await createTenant();
    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [t.institutionId]);
    assert.equal((await api().post("/api/v1/channels").set(bearer(t.ownerToken)).send({ type: "webchat", name: "Website" })).status, 201);
    const res = await start(t);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "CHANNEL_LIMIT");
  });
});
