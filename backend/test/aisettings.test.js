import "./setupEnv.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { invalidateAiSettingsCache } from "../src/services/platformSettings.js";
import { callWithFallback } from "../src/services/aiBrainService.js";

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

  test("fallback model: the provider's second model answers when the first one fails", async () => {
    const sa = await createSuperadmin();
    await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ provider: "nvidia", nvidiaKey: KEY, nvidiaModel: "m-primary", nvidiaFallbackModel: "m-fallback" });

    const seen = [];
    mock.method(globalThis, "fetch", async (url, init) => {
      const model = JSON.parse(init.body).model;
      seen.push(model);
      if (model === "m-primary") return { ok: false, status: 429, json: async () => ({ error: { message: "quota" } }) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Halo kak" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } }) };
    });

    const result = await callWithFallback({ systemPrompt: "s", userMessage: "u" });
    assert.deepEqual(seen, ["m-primary", "m-fallback"]);
    assert.equal(result.model, "m-fallback");
    assert.equal(result.fallbackUsed, true);
  });

  test("a healthy primary model is used alone, and the other provider is the last resort", async () => {
    const sa = await createSuperadmin();
    await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ provider: "nvidia", nvidiaKey: KEY, nvidiaModel: "n-1", nvidiaFallbackModel: "n-2", geminiApiKey: "AIzaSy-demo-key-0987654321", geminiModel: "g-1", geminiFallbackModel: "g-2" });

    const calls = [];
    mock.method(globalThis, "fetch", async (url, init) => {
      const u = String(url);
      const model = u.includes("generativelanguage") ? decodeURIComponent(u.split("/models/")[1].split(":")[0]) : JSON.parse(init.body).model;
      calls.push(model);
      if (model === "n-1") return { ok: true, json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
      return { ok: false, status: 500, json: async () => ({}) };
    });
    const first = await callWithFallback({ systemPrompt: "s", userMessage: "u" });
    assert.deepEqual(calls, ["n-1"]);
    assert.equal(first.fallbackUsed, false);

    calls.length = 0;
    mock.restoreAll();
    mock.method(globalThis, "fetch", async (url, init) => {
      const u = String(url);
      const model = u.includes("generativelanguage") ? decodeURIComponent(u.split("/models/")[1].split(":")[0]) : JSON.parse(init.body).model;
      calls.push(model);
      if (model === "g-2") return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "dari gemini" }] } }] }) };
      return { ok: false, status: 500, json: async () => ({}) };
    });
    const last = await callWithFallback({ systemPrompt: "s", userMessage: "u" });
    assert.deepEqual(calls, ["n-1", "n-2", "g-1", "g-2"]);
    assert.equal(last.provider, "gemini");
    assert.equal(last.model, "g-2");
  });

  test("the connection test reports the primary and the fallback model separately", async () => {
    const sa = await createSuperadmin();
    await api().put("/api/v1/system/ai-settings").set(bearer(sa.token)).send({ provider: "nvidia", nvidiaKey: KEY, nvidiaModel: "m-primary", nvidiaFallbackModel: "m-fallback" });
    mock.method(globalThis, "fetch", async (url, init) => {
      const model = JSON.parse(init.body).model;
      if (model === "m-primary") return { ok: false, status: 404, json: async () => ({ detail: "model not found" }) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: "OK" } }] }) };
    });
    const res = await api().post("/api/v1/system/ai-settings/test").set(bearer(sa.token)).send({ provider: "nvidia" });
    assert.equal(res.body.ok, true, "one working model is enough for the provider to count as reachable");
    assert.deepEqual(res.body.results.map((r) => [r.model, r.role, r.ok]), [["m-primary", "utama", false], ["m-fallback", "cadangan", true]]);
    assert.match(res.body.results[0].message, /HTTP 404/);
  });
});
