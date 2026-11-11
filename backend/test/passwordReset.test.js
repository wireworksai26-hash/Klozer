import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createSuperadmin, createTenant, login, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { setRealtimeForTests, resetRealtime } from "../src/realtime.js";

before(setupDatabase);
after(teardownDatabase);

const forgot = (email) => api().post("/api/v1/auth/forgot-password").send({ email });
const pending = (email) => query("SELECT * FROM password_reset_requests WHERE email = ? AND status = 'pending'", [email]);

describe("forgot password", () => {
  test("the reply is the same for a real and an unknown email, and only the real one reaches the team", async () => {
    const t = await createTenant();
    const real = await forgot(t.cs.email);
    const unknown = await forgot("tidak-ada@contoh.test");
    assert.equal(real.status, 200);
    assert.equal(unknown.status, 200);
    assert.deepEqual(real.body, unknown.body, "nothing tells the two apart");
    assert.equal((await pending(t.cs.email)).length, 1);
    assert.equal((await pending("tidak-ada@contoh.test")).length, 0);
  });

  test("asking twice while one is waiting keeps a single request", async () => {
    const t = await createTenant();
    await forgot(t.cs.email);
    await forgot(t.cs.email);
    assert.equal((await pending(t.cs.email)).length, 1);
  });

  test("a deactivated account makes no request", async () => {
    const t = await createTenant();
    await query("UPDATE users SET is_active = 0 WHERE id = ?", [t.cs.id]);
    await forgot(t.cs.email);
    assert.equal((await pending(t.cs.email)).length, 0);
  });

  test("the team is told at once, through the socket", async () => {
    const t = await createTenant();
    const sent = [];
    setRealtimeForTests({ to: (room) => ({ emit: (event, payload) => sent.push({ room, event, payload }) }) });
    try {
      await forgot(t.cs.email);
    } finally {
      resetRealtime();
    }
    const note = sent.find((s) => s.event === "password:requested");
    assert.ok(note, "an event was sent");
    assert.equal(note.room, "superadmins");
    assert.equal(note.payload.email, t.cs.email);
  });
});

describe("handling a request", () => {
  test("only the Klozer team sees the queue", async () => {
    const t = await createTenant();
    assert.equal((await api().get("/api/v1/platform/password-requests").set(bearer(t.ownerToken))).status, 403);
    assert.equal((await api().get("/api/v1/platform/password-requests")).status, 401);
  });

  test("the team lists it, resets the password once, and the old password and sessions stop working", async () => {
    const t = await createTenant();
    const admin = await createSuperadmin();
    await forgot(t.cs.email);

    const list = await api().get("/api/v1/platform/password-requests").set(bearer(admin.token));
    assert.equal(list.status, 200);
    const item = list.body.items.find((r) => r.email === t.cs.email);
    assert.ok(item, "the request is listed");
    assert.ok(list.body.pending >= 1);
    assert.ok(item.institution_name);

    const done = await api().post(`/api/v1/platform/password-requests/${item.id}/reset`).set(bearer(admin.token));
    assert.equal(done.status, 200, JSON.stringify(done.body));
    const fresh = done.body.credentials.password;
    assert.ok(fresh && fresh.length >= 12);

    const ok = await api().post("/api/v1/auth/login").send({ email: t.cs.email, password: fresh });
    assert.equal(ok.status, 200, "the new password works");
    assert.notEqual((await api().get("/api/v1/auth/me").set(bearer(t.csToken))).status, 200, "the old session ended");

    const again = await api().post(`/api/v1/platform/password-requests/${item.id}/reset`).set(bearer(admin.token));
    assert.equal(again.status, 409, "a second reset of the same request is refused");
    assert.equal((await pending(t.cs.email)).length, 0);

    const handled = await api().get("/api/v1/platform/password-requests?status=handled").set(bearer(admin.token));
    assert.ok(handled.body.items.some((r) => r.id === item.id && r.handled_by_name));
  });

  test("a lock from failed attempts is cleared by the reset", async () => {
    const t = await createTenant();
    const admin = await createSuperadmin();
    await query("UPDATE users SET locked_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), failed_login_count = 4 WHERE id = ?", [t.cs.id]);
    await forgot(t.cs.email);
    const [row] = await pending(t.cs.email);
    const done = await api().post(`/api/v1/platform/password-requests/${row.id}/reset`).set(bearer(admin.token));
    assert.equal((await login(t.cs.email, done.body.credentials.password).catch(() => null)) !== null, true);
  });

  test("dismissing closes the request and leaves the password alone", async () => {
    const t = await createTenant();
    const admin = await createSuperadmin();
    await forgot(t.cs.email);
    const [row] = await pending(t.cs.email);
    assert.equal((await api().post(`/api/v1/platform/password-requests/${row.id}/dismiss`).set(bearer(admin.token))).status, 200);
    assert.equal((await pending(t.cs.email)).length, 0);
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(t.csToken))).status, 200, "the session still works");
    assert.equal((await api().post(`/api/v1/platform/password-requests/${row.id}/reset`).set(bearer(admin.token))).status, 409);
  });

  test("an unknown request is not found", async () => {
    const admin = await createSuperadmin();
    assert.equal((await api().post("/api/v1/platform/password-requests/99999999/reset").set(bearer(admin.token))).status, 404);
  });
});
