import "./setupEnv.js";
import http from "http";
import { test, describe, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { config } from "../src/config/env.js";
import { isBlockedAddress, validateWebhookUrl } from "../src/services/integrations/urlGuard.js";
import { generateWebhookSecret, signPayload, verifySignature } from "../src/services/integrations/signing.js";
import { EVENTS, EVENT_TYPES, matchesSubscription } from "../src/services/integrations/eventCatalog.js";
import { BACKOFF_SECONDS, MAX_ATTEMPTS, nextAttemptAt } from "../src/services/integrations/webhookDispatcher.js";
import { guardedLookup, postJson } from "../src/services/integrations/safeHttp.js";
import { buildEnvelope } from "../src/services/integrations/eventBus.js";
import { SCOPE_NAMES } from "../src/services/integrations/apiKeys.js";
import { integrationLimitsFor } from "../src/services/integrations/integrationPlans.js";
import { createApiKeyBody, createWebhookBody, openCreateOrderBody, openSendMessageBody, openSendTemplateBody, openUpsertContactBody } from "../src/validation/integrationSchemas.js";

// Rules for webhooks and the public API that need no database: where a webhook may go, how it is signed, when it is retried.

describe("which addresses a webhook may reach", () => {
  test("private, loopback, link-local and reserved addresses are refused", () => {
    for (const ip of ["127.0.0.1", "127.255.0.9", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "100.127.255.255", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "192.0.2.1"]) {
      assert.equal(isBlockedAddress(ip), true, ip);
    }
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.1.2.3", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "2001:db8::1"]) {
      assert.equal(isBlockedAddress(ip), true, ip);
    }
  });

  test("public addresses are allowed", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.255.255", "172.32.0.1", "100.63.255.255", "100.128.0.1", "203.0.113.9".replace("203.0.113.9", "52.1.2.3"), "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
      assert.equal(isBlockedAddress(ip), false, ip);
    }
  });

  test("something that is not an address is refused rather than guessed", () => {
    for (const bad of ["", "abc", "999.1.1.1", null, undefined]) assert.equal(isBlockedAddress(bad), true, String(bad));
  });

  test("a URL must be https and public when saved", () => {
    const ok = (u, o) => validateWebhookUrl(u, o).ok;
    assert.equal(ok("https://n8n.example.com/webhook/abc"), true);
    assert.equal(ok("https://hooks.zapier.com/hooks/catch/1/2/"), true);
    assert.equal(ok("http://n8n.example.com/webhook"), false, "plain http");
    assert.equal(ok("https://localhost/hook"), false);
    assert.equal(ok("https://printer.local/hook"), false);
    assert.equal(ok("https://db.internal/hook"), false);
    assert.equal(ok("https://intranet/hook"), false, "a name with no dot is internal");
    assert.equal(ok("https://127.0.0.1/hook"), false);
    assert.equal(ok("https://169.254.169.254/latest/meta-data"), false);
    assert.equal(ok("https://[::1]/hook"), false);
    assert.equal(ok("https://user:pass@example.com/hook"), false);
    assert.equal(ok("ftp://example.com/hook"), false);
    assert.equal(ok("not a url"), false);
    assert.equal(ok(`https://example.com/${"a".repeat(500)}`), false);
    assert.match(validateWebhookUrl("http://x.test").reason, /https/);
  });

  test("development may use plain http and localhost, production never", () => {
    assert.equal(validateWebhookUrl("http://localhost:5678/webhook/x", { allowPrivate: true, isProduction: false }).ok, true);
    assert.equal(validateWebhookUrl("http://localhost:5678/webhook/x", { allowPrivate: true, isProduction: true }).ok, false);
    assert.equal(validateWebhookUrl("http://localhost:5678/webhook/x", { allowPrivate: false, isProduction: false }).ok, false);
  });
});

describe("signing", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ id: "evt_1", type: "order.paid", data: { total: 150000 } });

  test("a signature verifies for the same body, secret and a fresh timestamp", () => {
    const { header } = signPayload(secret, body, 1_700_000_000);
    assert.match(header, /^t=1700000000,v1=[a-f0-9]{64}$/);
    assert.equal(verifySignature(secret, body, header, { now: 1_700_000_100_000 }), true);
  });

  test("an altered body, another secret, or a swapped timestamp is refused", () => {
    const { header } = signPayload(secret, body, 1_700_000_000);
    const now = 1_700_000_050_000;
    assert.equal(verifySignature(secret, body.replace("150000", "1"), header, { now }), false);
    assert.equal(verifySignature("whsec_other", body, header, { now }), false);
    assert.equal(verifySignature(secret, body, header.replace("t=1700000000", "t=1700000001"), { now }), false, "the timestamp is part of what is signed");
  });

  test("an old or future request is refused (replay protection)", () => {
    const { header } = signPayload(secret, body, 1_700_000_000);
    assert.equal(verifySignature(secret, body, header, { now: 1_700_000_000_000 + 301_000 }), false);
    assert.equal(verifySignature(secret, body, header, { now: 1_700_000_000_000 - 301_000 }), false);
    assert.equal(verifySignature(secret, body, header, { now: 1_700_000_000_000 + 299_000 }), true);
    assert.equal(verifySignature(secret, body, header, { now: 1_700_000_000_000 + 900_000, toleranceSeconds: 1000 }), true, "a receiver may be more lenient");
  });

  test("a malformed header never verifies", () => {
    for (const bad of ["", undefined, "garbage", "t=abc,v1=ff", "v1=ff", "t=1700000000", "t=1700000000,v1="]) assert.equal(verifySignature(secret, body, bad, { now: 1_700_000_000_000 }), false, String(bad));
  });

  test("secrets are long and different every time", () => {
    const a = generateWebhookSecret();
    assert.match(a, /^whsec_[a-f0-9]{48}$/);
    assert.notEqual(a, generateWebhookSecret());
  });
});

describe("events and retries", () => {
  test("subscriptions: exact names, or everything except the connection test", () => {
    assert.equal(matchesSubscription(["order.paid"], "order.paid"), true);
    assert.equal(matchesSubscription(["order.paid"], "order.created"), false);
    assert.equal(matchesSubscription(["*"], "message.received"), true);
    assert.equal(matchesSubscription(["*"], "ping"), false, "a wildcard does not receive tests meant for another endpoint");
    assert.equal(matchesSubscription([], "order.paid"), false);
  });

  test("the catalog names every event once, with a description", () => {
    assert.equal(new Set(EVENT_TYPES).size, EVENT_TYPES.length);
    for (const type of EVENT_TYPES) assert.match(type, /^[a-z]+(\.[a-z_]+)?$/);
    assert.ok(Object.values(EVENTS).every((d) => typeof d === "string" && d.length > 5));
    for (const needed of ["message.received", "order.created", "order.paid", "contact.created", "conversation.handoff", "ping"]) assert.ok(EVENT_TYPES.includes(needed), needed);
  });

  test("the envelope has a stable shape", () => {
    const e = buildEnvelope({ type: "order.paid", institutionId: 7, data: { id: 1 }, now: new Date("2026-03-01T00:00:00Z") });
    assert.match(e.id, /^evt_[a-f0-9]{24}$/);
    assert.deepEqual(Object.keys(e), ["id", "type", "created_at", "institution_id", "data"]);
    assert.equal(e.created_at, "2026-03-01T00:00:00.000Z");
  });

  test("retries wait longer each time and then stop", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    assert.deepEqual(BACKOFF_SECONDS, [60, 300, 1800, 7200, 21600, 86400]);
    assert.equal(nextAttemptAt(1, now).toISOString(), "2026-03-01T00:01:00.000Z");
    assert.equal(nextAttemptAt(3, now).toISOString(), "2026-03-01T00:30:00.000Z");
    assert.equal(nextAttemptAt(6, now).toISOString(), "2026-03-02T00:00:00.000Z");
    assert.equal(nextAttemptAt(7, now), null, "after the seventh attempt it is given up");
    assert.equal(MAX_ATTEMPTS, 7);
    assert.ok(BACKOFF_SECONDS.every((s, i) => i === 0 || s > BACKOFF_SECONDS[i - 1]));
  });

  test("limits grow with the package, and unknown packages get the smallest", () => {
    assert.ok(integrationLimitsFor("starter").webhooks < integrationLimitsFor("pro").webhooks);
    assert.ok(integrationLimitsFor("pro").apiKeys < integrationLimitsFor("enterprise").apiKeys);
    assert.deepEqual(integrationLimitsFor("???"), integrationLimitsFor("starter"));
  });
});

describe("making the request", () => {
  let server;
  let port;
  const seen = [];
  const allowBefore = config.webhooks.allowPrivate;

  before(async () => {
    server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        seen.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
        if (req.url === "/ok") return res.writeHead(200).end("received");
        if (req.url === "/redirect") return res.writeHead(302, { Location: "http://169.254.169.254/latest" }).end();
        if (req.url === "/slow") return; // never answers
        if (req.url === "/big") return res.writeHead(200).end("x".repeat(1_000_000));
        return res.writeHead(500).end("boom");
      });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    port = server.address().port;
  });
  after(() => {
    server.closeAllConnections?.();
    server.close();
  });
  afterEach(() => {
    config.webhooks.allowPrivate = allowBefore;
  });

  test("the lookup refuses a name that resolves to a private address, unless private targets are allowed", async () => {
    const lookup = (allow) => new Promise((resolve) => guardedLookup(allow)("localhost", { all: false }, (err, address) => resolve({ err, address })));
    const refused = await lookup(false);
    assert.equal(refused.err?.code, "BLOCKED_ADDRESS");
    const allowed = await lookup(true);
    assert.equal(allowed.err, null);
    assert.match(allowed.address, /^(127\.0\.0\.1|::1)$/);
    const all = await new Promise((resolve) => guardedLookup(true)("localhost", { all: true }, (err, list) => resolve(list)));
    assert.ok(Array.isArray(all) && all.length >= 1, "with all: true every checked address is returned");
  });

  test("a request to a private address never leaves: nothing arrives, and the reason is plain", async () => {
    config.webhooks.allowPrivate = false;
    const before = seen.length;
    for (const url of [`http://127.0.0.1:${port}/ok`, `http://localhost:${port}/ok`, `http://[::1]:${port}/ok`, "http://169.254.169.254/latest/meta-data", "http://10.0.0.5/x"]) {
      const result = await postJson({ url, body: "{}", timeoutMs: 2000 });
      assert.equal(result.status, null, url);
      assert.match(result.error, /bukan alamat internet publik/, url);
    }
    assert.equal(seen.length, before, "an address written into the URL is refused as well as a name that resolves to one");
  });

  test("with private targets allowed (development), the body, headers and answer are exact", async () => {
    config.webhooks.allowPrivate = true;
    const result = await postJson({ url: `http://127.0.0.1:${port}/ok`, body: '{"a":1}', headers: { "X-Klozer-Event": "order.paid" }, timeoutMs: 2000 });
    assert.deepEqual([result.status, result.excerpt, result.error], [200, "received", null]);
    const last = seen.at(-1);
    assert.equal(last.body, '{"a":1}');
    assert.equal(last.headers["content-type"], "application/json");
    assert.equal(last.headers["x-klozer-event"], "order.paid");
    assert.match(last.headers["user-agent"], /Klozer/);
    assert.equal(last.headers["content-length"], "7");
  });

  test("a redirect is not followed", async () => {
    config.webhooks.allowPrivate = true;
    const result = await postJson({ url: `http://127.0.0.1:${port}/redirect`, body: "{}", timeoutMs: 2000 });
    assert.equal(result.status, 302);
    assert.equal(seen.filter((s) => s.url === "/redirect").length, 1);
  });

  test("a receiver that never answers is given up on", async () => {
    config.webhooks.allowPrivate = true;
    const started = Date.now();
    const result = await postJson({ url: `http://127.0.0.1:${port}/slow`, body: "{}", timeoutMs: 300 });
    assert.equal(result.status, null);
    assert.match(result.error, /Waktu habis/);
    assert.ok(Date.now() - started < 3000);
  });

  test("only a small part of a huge answer is kept", async () => {
    config.webhooks.allowPrivate = true;
    const result = await postJson({ url: `http://127.0.0.1:${port}/big`, body: "{}", timeoutMs: 3000 });
    assert.equal(result.status, 200);
    assert.ok(result.excerpt.length <= 500);
  });

  test("an error status is reported with its excerpt; a closed port is an error, not a crash", async () => {
    config.webhooks.allowPrivate = true;
    const failed = await postJson({ url: `http://127.0.0.1:${port}/nope`, body: "{}", timeoutMs: 2000 });
    assert.deepEqual([failed.status, failed.excerpt], [500, "boom"]);
    const closed = await postJson({ url: "http://localhost:1/x", body: "{}", timeoutMs: 2000 });
    assert.equal(closed.status, null);
    assert.ok(closed.error);
  });
});

describe("request validation", () => {
  const ok = (schema, body) => schema.safeParse(body).success;

  test("api keys", () => {
    assert.ok(ok(createApiKeyBody, { name: "n8n produksi", scopes: ["contacts:read", "orders:write"] }));
    assert.ok(ok(createApiKeyBody, { name: "x", scopes: ["messages:send"], expiresAt: "2027-01-01T00:00:00Z" }));
    assert.ok(!ok(createApiKeyBody, { name: "x", scopes: [] }));
    assert.ok(!ok(createApiKeyBody, { name: "x", scopes: ["admin:everything"] }));
    assert.ok(!ok(createApiKeyBody, { name: "x", scopes: ["contacts:read"], expiresAt: "besok" }));
    assert.ok(SCOPE_NAMES.length >= 6);
  });

  test("webhooks", () => {
    assert.ok(ok(createWebhookBody, { name: "n8n", url: "https://n8n.example.com/webhook/x", events: ["order.paid"] }));
    assert.ok(!ok(createWebhookBody, { name: "n8n", url: "https://n8n.example.com/webhook/x", events: [] }));
  });

  test("the public API needs a way to say which contact", () => {
    assert.ok(ok(openSendMessageBody, { phone: "0812-3456-7890", text: "Halo" }));
    assert.ok(ok(openSendMessageBody, { contactId: 5, text: "Halo" }));
    assert.ok(!ok(openSendMessageBody, { text: "Halo" }));
    assert.ok(!ok(openSendMessageBody, { phone: "abc", text: "Halo" }));
    assert.ok(!ok(openSendMessageBody, { phone: "081234567890", text: " " }));
    assert.ok(ok(openSendTemplateBody, { phone: "081234567890", templateId: 3, variables: ["Budi"] }));
    assert.ok(!ok(openSendTemplateBody, { phone: "081234567890", templateId: 3, headerMediaUrl: "http://x.id/a.jpg" }));
    assert.ok(ok(openUpsertContactBody, { phone: "081234567890", name: "Budi" }));
    assert.ok(ok(openCreateOrderBody, { phone: "081234567890", items: [{ productId: 1, quantity: 2 }] }));
    assert.ok(!ok(openCreateOrderBody, { phone: "081234567890", items: [] }));
    assert.ok(!ok(openCreateOrderBody, { phone: "081234567890", items: [{ productId: 1, quantity: 0 }] }));
    assert.ok(!ok(openCreateOrderBody, { phone: "081234567890", items: [{ productId: 1, quantity: 1 }], shippingFee: -1 }));
  });
});
