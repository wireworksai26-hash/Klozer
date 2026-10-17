import "./setupEnv.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { invalidateAiSettingsCache } from "../src/services/platformSettings.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => {
  mock.restoreAll();
  invalidateAiSettingsCache();
});

const KEY = "nvapi-demo-key-1234567890abcd";

describe("AI settings (superadmin)", () => {
  test("only a superadmin can read or change them", async () => {
    const tenant = await createTenant();
    assert.equal((await api().get("/api/v1/system/ai-settings").set(bearer(tenant.ownerToken))).status, 403);
    assert.equal((await api().put("/api/v1/system/ai-settings").set(bearer(tenant.ownerToken)).send({ provider: "gemini" })).status, 403);
    assert.equal((await api().get("/api/v1/system/ai-settings")).status, 401);
  });

  test("a saved key is stored encrypted and never returned", async () => {
    const sa = await createSuperadmin();
    const res = await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ provider: "nvidia", nvidiaKey: KEY, nvidiaModel: "meta/llama-3.3-70b-instruct" });
    assert.equal(res.status, 200);
    assert.equal(res.body.settings.nvidia.configured, true);
    assert.equal(res.body.settings.nvidia.source, "database");
    assert.equal(res.body.settings.nvidia.hint, `••••${KEY.slice(-4)}`);
    assert.ok(!JSON.stringify(res.body).includes(KEY));

    const read = await api().get("/api/v1/system/ai-settings").set(bearer(sa.token));
    assert.ok(!JSON.stringify(read.body).includes(KEY));

    const [row] = await query("SELECT encrypted_secrets FROM platform_settings WHERE setting_key = 'ai'");
    assert.ok(row.encrypted_secrets && !row.encrypted_secrets.includes(KEY), "secret must not be stored in plain text");
  });

  test("leaving a key field empty keeps the stored key; clear removes it", async () => {
    const sa = await createSuperadmin();
    await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ geminiApiKey: "AIzaSy-demo-key-0987654321" });
    const keep = await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ provider: "gemini", geminiApiKey: "", geminiModel: "gemini-2.5-flash-lite" });
    assert.equal(keep.body.settings.gemini.configured, true);
    assert.equal(keep.body.settings.provider, "gemini");

    const cleared = await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ clearGeminiKey: true });
    assert.notEqual(cleared.body.settings.gemini.source, "database");
  });

  test("rejects a malformed key and an unknown provider", async () => {
    const sa = await createSuperadmin();
    assert.equal((await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ nvidiaKey: "short" })).status, 400);
    assert.equal((await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ nvidiaKey: "has spaces in the key value" })).status, 400);
    assert.equal((await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ provider: "openai" })).status, 400);
  });

  test("the connection test uses the saved key and reports failure without leaking details", async () => {
    const sa = await createSuperadmin();
    await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ provider: "nvidia", nvidiaKey: KEY });

    const fetchMock = mock.method(globalThis, "fetch", async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "OK" } }], usage: { prompt_tokens: 5, completion_tokens: 1 } }),
    }));
    const ok = await api().post("/api/v1/system/ai-settings/test").set(bearer(sa.token)).send({ provider: "nvidia" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.ok, true);
    assert.equal(fetchMock.mock.calls[0].arguments[1].headers.Authorization, `Bearer ${KEY}`);

    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 401, json: async () => ({ error: `invalid ${KEY}` }) }));
    const bad = await api().post("/api/v1/system/ai-settings/test").set(bearer(sa.token)).send({ provider: "nvidia" });
    assert.equal(bad.body.ok, false);
    assert.ok(!JSON.stringify(bad.body).includes(KEY));
    assert.match(bad.body.message, /HTTP 401/);
  });
});
