import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { io as connect } from "socket.io-client";
import { api, bearer, createTenant, createUser, createInstitution, PASSWORD, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";
import { attachRealtime, emitToTenant, resetRealtime } from "../src/realtime.js";
import { createApp } from "../src/app.js";

const ORIGIN = "http://localhost:3000";
const CSRF = { "X-Requested-With": "klozer-web", Origin: ORIGIN };

let server;
let port;

before(async () => {
  process.env.SOCKET_REVALIDATE_MS = "200";
  await setupDatabase();
  server = http.createServer(createApp());
  attachRealtime(server);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});

after(async () => {
  resetRealtime();
  await new Promise((r) => server.close(r));
  await teardownDatabase();
});

const sessionCookieFrom = (res) => {
  const raw = (res.headers["set-cookie"] || []).find((c) => c.startsWith("klozer_session="));
  return raw ? raw.split(";")[0] : null;
};

async function loginCookie(email) {
  const res = await api().post("/api/v1/auth/login").send({ email, password: PASSWORD });
  assert.equal(res.status, 200);
  return { cookie: sessionCookieFrom(res), raw: res.headers["set-cookie"].join("; ") };
}

describe("cookie session", () => {
  test("login sets an httpOnly, SameSite=Strict session cookie", async () => {
    const t = await createTenant();
    const { raw } = await loginCookie(t.owner.email);
    assert.match(raw, /klozer_session=/);
    assert.match(raw, /HttpOnly/i);
    assert.match(raw, /SameSite=Strict/i);
    assert.match(raw, /Path=\//);
  });

  test("the cookie authenticates reads without any Authorization header", async () => {
    const t = await createTenant();
    const { cookie } = await loginCookie(t.owner.email);
    const me = await api().get("/api/v1/auth/me").set("Cookie", cookie);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, t.owner.id);
  });

  test("cookie-authenticated writes need the anti-CSRF header and an allowed Origin", async () => {
    const t = await createTenant();
    const { cookie } = await loginCookie(t.owner.email);
    const body = { sku: "CSRF-1", name: "Produk", selling_price: 1000 };

    const noHeader = await api().post("/api/v1/products").set("Cookie", cookie).send(body);
    assert.equal(noHeader.status, 403);
    const evilOrigin = await api().post("/api/v1/products").set("Cookie", cookie).set("X-Requested-With", "klozer-web").set("Origin", "https://evil.example").send(body);
    assert.equal(evilOrigin.status, 403);
    const wrongValue = await api().post("/api/v1/products").set("Cookie", cookie).set("X-Requested-With", "XMLHttpRequest").set("Origin", ORIGIN).send(body);
    assert.equal(wrongValue.status, 403);

    const ok = await api().post("/api/v1/products").set("Cookie", cookie).set(CSRF).send(body);
    assert.equal(ok.status, 201);
    assert.equal((await query("SELECT COUNT(*) AS n FROM products WHERE institution_id = ?", [t.institutionId]))[0].n, 1);
  });

  test("bearer tokens keep working for API clients without the CSRF header", async () => {
    const t = await createTenant();
    const res = await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ sku: "B-1", name: "Produk", selling_price: 1000 });
    assert.equal(res.status, 201);
  });

  test("logout clears the cookie", async () => {
    const t = await createTenant();
    await loginCookie(t.owner.email);
    const res = await api().post("/api/v1/auth/logout");
    assert.equal(res.status, 200);
    assert.match(res.headers["set-cookie"].join(";"), /klozer_session=;.*Expires=Thu, 01 Jan 1970/i);
  });

  test("changing the password replaces the cookie and the old cookie stops working", async () => {
    const t = await createTenant();
    const { cookie: oldCookie } = await loginCookie(t.owner.email);
    const res = await api().post("/api/v1/auth/change-password").set("Cookie", oldCookie).set(CSRF).send({ currentPassword: PASSWORD, newPassword: "An0ther-Str0ng-Pass" });
    assert.equal(res.status, 200);
    const newCookie = sessionCookieFrom(res);
    assert.ok(newCookie && newCookie !== oldCookie);
    assert.equal((await api().get("/api/v1/auth/me").set("Cookie", oldCookie)).status, 401);
    assert.equal((await api().get("/api/v1/auth/me").set("Cookie", newCookie)).status, 200);
  });
});

describe("login lockout under concurrency", () => {
  test("parallel wrong guesses all count, so a burst cannot bypass the lock", async () => {
    const inst = await createInstitution();
    const user = await createUser(inst, "cs");
    await Promise.all(Array.from({ length: 8 }, () => api().post("/api/v1/auth/login").send({ email: user.email, password: "wrong-wrong-1" })));
    const [row] = await query("SELECT failed_login_count, locked_until FROM users WHERE id = ?", [user.id]);
    assert.equal(row.failed_login_count, 8);
    assert.ok(row.locked_until, "account must be locked");
    const correct = await api().post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD });
    assert.equal(correct.status, 429);
  });

  test("a successful login resets the counter", async () => {
    const inst = await createInstitution();
    const user = await createUser(inst, "cs");
    await api().post("/api/v1/auth/login").send({ email: user.email, password: "wrong-wrong-1" });
    await api().post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD });
    const [row] = await query("SELECT failed_login_count FROM users WHERE id = ?", [user.id]);
    assert.equal(row.failed_login_count, 0);
  });
});

describe("realtime sockets", () => {
  const open = (opts) =>
    new Promise((resolve) => {
      const socket = connect(`http://127.0.0.1:${port}`, { transports: ["websocket"], reconnection: false, ...opts });
      socket.on("connect", () => resolve({ socket, connected: true }));
      socket.on("connect_error", (err) => resolve({ socket, connected: false, err }));
    });

  test("rejects a socket without credentials or from a foreign origin", async () => {
    const anon = await open({ extraHeaders: { Origin: ORIGIN } });
    assert.equal(anon.connected, false);
    anon.socket.close();

    const t = await createTenant();
    const { cookie } = await loginCookie(t.owner.email);
    const foreign = await open({ extraHeaders: { Cookie: cookie, Origin: "https://evil.example" } });
    assert.equal(foreign.connected, false);
    foreign.socket.close();
  });

  test("a cookie session connects and only receives its own tenant's events", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const { cookie } = await loginCookie(a.owner.email);
    const { socket, connected } = await open({ extraHeaders: { Cookie: cookie, Origin: ORIGIN } });
    assert.equal(connected, true);

    const received = [];
    socket.on("chat:message", (evt) => received.push(evt));
    // a non-superadmin asking to join another tenant must be ignored
    socket.emit("join-tenant", b.institutionId);
    await new Promise((r) => setTimeout(r, 100));
    emitToTenant(b.institutionId, "chat:message", { leadId: 1, text: "rahasia B" });
    emitToTenant(a.institutionId, "chat:message", { leadId: 2, text: "milik A" });
    await waitFor(() => received.length >= 1);
    await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(received.map((e) => e.text), ["milik A"]);
    socket.close();
  });

  test("deactivating a staff member disconnects their live socket immediately", async () => {
    const t = await createTenant();
    const { cookie } = await loginCookie(t.cs.email);
    const { socket, connected } = await open({ extraHeaders: { Cookie: cookie, Origin: ORIGIN } });
    assert.equal(connected, true);
    const dropped = new Promise((r) => socket.on("disconnect", r));

    const res = await api().delete(`/api/v1/users/${t.cs.id}`).set(bearer(t.ownerToken));
    assert.equal(res.status, 200);
    await dropped;
    assert.equal(socket.connected, false);
  });

  test("a revocation that bypasses the API is caught by periodic revalidation", async () => {
    const t = await createTenant();
    const { cookie } = await loginCookie(t.cs.email);
    const { socket } = await open({ extraHeaders: { Cookie: cookie, Origin: ORIGIN } });
    const dropped = new Promise((r) => socket.on("disconnect", r));
    await query("UPDATE users SET token_version = token_version + 1 WHERE id = ?", [t.cs.id]);
    await dropped;
    assert.equal(socket.connected, false);
  });

  test("deactivating a tenant disconnects its members", async () => {
    const t = await createTenant();
    const { cookie } = await loginCookie(t.owner.email);
    const { socket } = await open({ extraHeaders: { Cookie: cookie, Origin: ORIGIN } });
    const dropped = new Promise((r) => socket.on("disconnect", r));
    await query("UPDATE institutions SET is_active = 0 WHERE id = ?", [t.institutionId]);
    await dropped;
  });
});
