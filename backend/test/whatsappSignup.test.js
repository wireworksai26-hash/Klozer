import "./setupWhatsapp.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { config } from "../src/config/env.js";
import { decryptSecret } from "../src/utils/crypto.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

const APP_ID = process.env.META_APP_ID;
const ok = (json = {}) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json });
const fail = (error) => ({ ok: false, status: 400, headers: { get: () => null }, json: async () => ({ error }) });
let seq = 0;
const ids = () => ({ wabaId: `1100${++seq}0001`, phoneNumberId: `2200${seq}0002` });

/**
 * Meta's side of Embedded Signup, faked: it trades the code for a token, says what that token may manage, lists the
 * account's numbers, registers the number, subscribes the account, and describes the number.
 */
function mockMeta({ wabaId, phoneNumberId, granted = [wabaId], numbers = [phoneNumberId], refuseCode = false, refuseRegister = false } = {}) {
  const calls = [];
  mock.method(globalThis, "fetch", async (url, opts = {}) => {
    const u = new URL(String(url));
    const path = u.pathname.replace(/^\/v[\d.]+\//, "");
    const body = typeof opts.body === "string" ? JSON.parse(opts.body) : null;
    calls.push({ path, method: opts.method || "GET", query: Object.fromEntries(u.searchParams), body, auth: opts.headers?.Authorization });
    if (u.hostname !== "graph.facebook.com") throw new Error(`unexpected fetch to ${u}`);
    if (path === "oauth/access_token") return refuseCode ? fail({ message: "This authorization code has been used.", code: 100 }) : ok({ access_token: "EAAB-business-token-" + calls.length });
    if (path === "debug_token") return ok({ data: { is_valid: true, app_id: APP_ID, granular_scopes: [{ scope: "whatsapp_business_management", target_ids: granted }, { scope: "whatsapp_business_messaging", target_ids: granted }] } });
    if (path === `${wabaId}/phone_numbers`) return ok({ data: numbers.map((id) => ({ id, display_phone_number: "+62 812-3456-7890" })) });
    if (path === `${phoneNumberId}/register`) return refuseRegister ? fail({ message: "Phone number registration failed.", code: 133005 }) : ok({ success: true });
    if (path === `${wabaId}/subscribed_apps`) return ok({ success: true });
    if (path === phoneNumberId) return ok({ display_phone_number: "+62 812-3456-7890", verified_name: "Toko Batik Solo" });
    throw new Error(`unexpected Meta call ${path}`);
  });
  return calls;
}

const signup = (t, body, token = t.ownerToken) => api().post("/api/v1/channels/whatsapp/signup").set(bearer(token)).send(body);
const channelsOf = async (t) => (await api().get("/api/v1/channels").set(bearer(t.ownerToken))).body.data;

describe("a client connects its own WhatsApp number", () => {
  test("the browser gets what it needs to open Meta's window, and no secret", async () => {
    const t = await createTenant();
    const res = await api().get("/api/v1/channels/whatsapp/signup-config").set(bearer(t.ownerToken));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, { enabled: true, appId: APP_ID, configId: process.env.META_ES_CONFIG_ID, graphVersion: config.meta.graphVersion });
    assert.doesNotMatch(JSON.stringify(res.body), new RegExp(config.meta.appSecret));
    assert.equal((await api().get("/api/v1/channels/whatsapp/signup-config").set(bearer(t.csToken))).status, 403);
  });

  test("the code is traded on the server, the ids are checked, the number is registered and the account subscribed, then the channel is stored", async () => {
    const t = await createTenant();
    const { wabaId, phoneNumberId } = ids();
    const calls = mockMeta({ wabaId, phoneNumberId });
    const res = await signup(t, { code: "AQB-one-time-code-from-meta", wabaId, phoneNumberId });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual([res.body.data.type, res.body.data.externalId, res.body.data.hasToken, res.body.data.name, res.body.verifiedName], ["whatsapp", phoneNumberId, true, "Toko Batik Solo", "Toko Batik Solo"]);
    assert.equal(res.body.data.displayHandle, "+62 812-3456-7890");

    assert.deepEqual(calls.map((c) => c.path), ["oauth/access_token", "debug_token", `${wabaId}/phone_numbers`, `${phoneNumberId}/register`, `${wabaId}/subscribed_apps`, phoneNumberId]);
    const exchange = calls[0];
    assert.deepEqual([exchange.query.client_id, exchange.query.client_secret, exchange.query.code], [APP_ID, config.meta.appSecret, "AQB-one-time-code-from-meta"], "the app secret is used on the server");
    const register = calls[3];
    assert.equal(register.body.messaging_product, "whatsapp");
    assert.match(register.body.pin, /^\d{6}$/);
    assert.match(calls[3].auth, /^Bearer EAAB-business-token/);

    const listed = (await channelsOf(t)).find((c) => c.externalId === phoneNumberId);
    assert.equal(listed.config.wabaId, wabaId);
    assert.ok(!("registrationPin" in listed.config), "the PIN never leaves the server");
    assert.doesNotMatch(JSON.stringify(listed), /EAAB/);

    const row = (await query("SELECT encrypted_access_token, config_json FROM channels WHERE external_id = ?", [phoneNumberId]))[0];
    assert.doesNotMatch(row.encrypted_access_token, /EAAB/, "the token is stored encrypted");
    assert.equal(decryptSecret(row.encrypted_access_token), "EAAB-business-token-1");
    const stored = typeof row.config_json === "string" ? JSON.parse(row.config_json) : row.config_json;
    assert.equal(decryptSecret(stored.registrationPin), register.body.pin, "the PIN sent to Meta is kept, encrypted, for later");
    const audit = (await query("SELECT action FROM audit_logs WHERE institution_id = ? AND action = 'channel.signup'", [t.institutionId]))[0];
    assert.ok(audit);
  });

  test("ids the browser only claims are checked with Meta: a number or account the token cannot manage is refused and nothing is stored", async () => {
    const t = await createTenant();
    const { wabaId, phoneNumberId } = ids();
    mockMeta({ wabaId, phoneNumberId, granted: ["99999999999"] });
    const notGranted = await signup(t, { code: "AQB-one-time-code-from-meta", wabaId, phoneNumberId });
    assert.deepEqual([notGranted.status, notGranted.body.code], [400, "WABA_NOT_GRANTED"]);

    mock.restoreAll();
    const calls = mockMeta({ wabaId, phoneNumberId, numbers: ["55555555555"] });
    const notInWaba = await signup(t, { code: "AQB-one-time-code-from-meta", wabaId, phoneNumberId });
    assert.deepEqual([notInWaba.status, notInWaba.body.code], [400, "PHONE_NOT_IN_WABA"]);
    assert.ok(!calls.some((c) => c.path.endsWith("/register") || c.path.endsWith("/subscribed_apps")), "nothing was changed at Meta");
    assert.equal((await channelsOf(t)).length, 0);
  });

  test("when Meta refuses the code or the registration, the client is told why and nothing is stored", async () => {
    const t = await createTenant();
    const { wabaId, phoneNumberId } = ids();
    mockMeta({ wabaId, phoneNumberId, refuseCode: true });
    const used = await signup(t, { code: "AQB-one-time-code-from-meta", wabaId, phoneNumberId });
    assert.deepEqual([used.status, used.body.code], [502, "META_REFUSED"]);
    assert.match(used.body.message, /authorization code has been used/);

    mock.restoreAll();
    mockMeta({ wabaId, phoneNumberId, refuseRegister: true });
    const refused = await signup(t, { code: "AQB-one-time-code-from-meta", wabaId, phoneNumberId });
    assert.equal(refused.status, 502);
    assert.match(refused.body.message, /registration failed/);
    assert.equal((await channelsOf(t)).length, 0);
  });

  test("the plan's channel limit and a number that is already connected are refused before anything is done at Meta", async () => {
    const t = await createTenant();
    await query("UPDATE institutions SET subscription_tier = 'starter' WHERE id = ?", [t.institutionId]);
    const first = ids();
    mockMeta(first);
    assert.equal((await signup(t, { code: "AQB-one-time-code-from-meta", ...first })).status, 201);

    mock.restoreAll();
    const second = ids();
    const calls = mockMeta(second);
    const full = await signup(t, { code: "AQB-one-time-code-from-meta", ...second });
    assert.deepEqual([full.status, full.body.code], [409, "CHANNEL_LIMIT"]);
    assert.equal(calls.length, 0, "no call to Meta was made");

    const other = await createTenant();
    mock.restoreAll();
    const taken = mockMeta(first);
    const again = await signup(other, { code: "AQB-one-time-code-from-meta", ...first });
    assert.deepEqual([again.status, again.body.code], [409, "CHANNEL_TAKEN"]);
    assert.equal(taken.length, 0);
  });

  test("only managers, only with a body that makes sense, and only when the team has set Embedded Signup up", async () => {
    const t = await createTenant();
    const { wabaId, phoneNumberId } = ids();
    assert.equal((await signup(t, { code: "AQB-one-time-code-from-meta", wabaId, phoneNumberId }, t.csToken)).status, 403);
    assert.equal((await api().post("/api/v1/channels/whatsapp/signup").send({})).status, 401);
    assert.equal((await signup(t, { wabaId, phoneNumberId })).status, 400, "no code");
    assert.equal((await signup(t, { code: "AQB-one-time-code-from-meta", wabaId: "abc", phoneNumberId })).status, 400);
    assert.equal((await signup(t, { code: "pendek", wabaId, phoneNumberId })).status, 400);

    const before = config.meta.embeddedSignupConfigId;
    config.meta.embeddedSignupConfigId = "";
    try {
      const off = await signup(t, { code: "AQB-one-time-code-from-meta", wabaId, phoneNumberId });
      assert.deepEqual([off.status, off.body.code], [503, "SIGNUP_DISABLED"]);
      assert.equal((await api().get("/api/v1/channels/whatsapp/signup-config").set(bearer(t.ownerToken))).body.data.enabled, false);
    } finally {
      config.meta.embeddedSignupConfigId = before;
    }
  });
});
