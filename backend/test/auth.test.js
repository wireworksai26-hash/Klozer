import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { api, bearer, createTenant, createUser, createInstitution, login, PASSWORD, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { config } from "../src/config/env.js";

before(setupDatabase);
after(teardownDatabase);

describe("login", () => {
  test("valid credentials return a token and the user profile", async () => {
    const t = await createTenant();
    const res = await api().post("/api/v1/auth/login").send({ email: t.owner.email, password: PASSWORD });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, "owner");
    assert.equal(res.body.user.institutionId, t.institutionId);
    assert.equal(res.body.user.password_hash, undefined);
  });

  test("wrong password and unknown email return the same generic 401", async () => {
    const t = await createTenant();
    const wrong = await api().post("/api/v1/auth/login").send({ email: t.owner.email, password: "nope-nope-nope" });
    const unknown = await api().post("/api/v1/auth/login").send({ email: "ghost@nowhere.test", password: "nope-nope-nope" });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  test("the old hardcoded backdoor passwords no longer work", async () => {
    const t = await createTenant();
    for (const pwd of ["195098", "Klozer123!", "123456"]) {
      const res = await api().post("/api/v1/auth/login").send({ email: t.owner.email, password: pwd });
      assert.equal(res.status, 401, `password ${pwd} must be rejected`);
    }
  });

  test("unregistered spv@ emails are not auto-provisioned", async () => {
    for (const pwd of ["195098", "Klozer123!", "123456"]) {
      const res = await api().post("/api/v1/auth/login").send({ email: "spv@geprekjuara.id", password: pwd });
      assert.equal(res.status, 401);
    }
  });

  test("an account locks after repeated failures, even for the right password", async () => {
    const inst = await createInstitution();
    const user = await createUser(inst, "cs");
    for (let i = 0; i < 5; i++) {
      const res = await api().post("/api/v1/auth/login").send({ email: user.email, password: "wrong-wrong-1" });
      assert.equal(res.status, 401);
    }
    const locked = await api().post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD });
    assert.equal(locked.status, 429);
    assert.equal(locked.body.code, "ACCOUNT_LOCKED");
  });

  test("deactivated users and deactivated institutions cannot log in", async () => {
    const inst = await createInstitution();
    const inactive = await createUser(inst, "cs", { is_active: 0 });
    const res1 = await api().post("/api/v1/auth/login").send({ email: inactive.email, password: PASSWORD });
    assert.equal(res1.status, 403);

    const inst2 = await createInstitution();
    const owner = await createUser(inst2, "owner");
    await query("UPDATE institutions SET is_active = 0 WHERE id = ?", [inst2]);
    const res2 = await api().post("/api/v1/auth/login").send({ email: owner.email, password: PASSWORD });
    assert.equal(res2.status, 403);
  });

  test("malformed bodies are rejected with 400", async () => {
    const res = await api().post("/api/v1/auth/login").send({ email: "not-an-email", password: "" });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "VALIDATION_ERROR");
  });
});

describe("tokens", () => {
  test("requests without, with garbage, or with forged tokens are 401", async () => {
    assert.equal((await api().get("/api/v1/auth/me")).status, 401);
    assert.equal((await api().get("/api/v1/auth/me").set(bearer("garbage"))).status, 401);

    const t = await createTenant();
    const forged = jwt.sign({ sub: t.owner.id, role: "superadmin", inst: t.institutionId, tv: 0 }, "attacker-secret-attacker-secret-1234", {
      issuer: "klozer",
    });
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(forged))).status, 401);

    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(
      JSON.stringify({ sub: t.owner.id, role: "superadmin", inst: t.institutionId, tv: 0, iss: "klozer" })
    ).toString("base64url")}.`;
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(none))).status, 401);
  });

  test("a token whose claims claim a higher role cannot escalate (role comes from the database)", async () => {
    const t = await createTenant();
    const escalated = jwt.sign({ sub: t.cs.id, role: "superadmin", inst: t.institutionId, tv: 0 }, config.jwt.secret, { issuer: "klozer", algorithm: "HS256" });
    const res = await api().get("/api/v1/system/metrics").set(bearer(escalated));
    assert.equal(res.status, 403);
  });

  test("deactivating a user revokes their existing token immediately", async () => {
    const t = await createTenant();
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(t.csToken))).status, 200);
    await query("UPDATE users SET is_active = 0 WHERE id = ?", [t.cs.id]);
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(t.csToken))).status, 401);
  });

  test("changing the password invalidates old tokens and returns a working new one", async () => {
    const t = await createTenant();
    const res = await api()
      .post("/api/v1/auth/change-password")
      .set(bearer(t.ownerToken))
      .send({ currentPassword: PASSWORD, newPassword: "An0ther-Str0ng-Pass" });
    assert.equal(res.status, 200);

    assert.equal((await api().get("/api/v1/auth/me").set(bearer(t.ownerToken))).status, 401);
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(res.body.token))).status, 200);
    assert.ok(await login(t.owner.email, "An0ther-Str0ng-Pass"));
  });

  test("change-password rejects a wrong current password and weak new passwords", async () => {
    const t = await createTenant();
    const wrong = await api().post("/api/v1/auth/change-password").set(bearer(t.ownerToken)).send({ currentPassword: "bad-bad-bad1", newPassword: "An0ther-Str0ng-Pass" });
    assert.equal(wrong.status, 401);
    const weak = await api().post("/api/v1/auth/change-password").set(bearer(t.ownerToken)).send({ currentPassword: PASSWORD, newPassword: "short" });
    assert.equal(weak.status, 400);
  });
});

describe("register", () => {
  test("creates a tenant, an owner and two CS accounts that can actually log in", async () => {
    const res = await api().post("/api/v1/auth/register").send({ institutionName: "Toko Maju Jaya", mode: "business", ownerName: "Budi" });
    assert.equal(res.status, 201);
    const { spv, cs1, cs2 } = res.body.credentialsBundle;
    assert.match(spv.email, /^spv@/);
    assert.ok(spv.password.length >= 12);

    for (const acc of [spv, cs1, cs2]) {
      const token = await login(acc.email, acc.password);
      const me = await api().get("/api/v1/auth/me").set(bearer(token));
      assert.equal(me.body.user.institutionId, res.body.institution.id);
    }
    assert.equal((await api().get("/api/v1/auth/me").set(bearer(res.body.token))).status, 200);
  });

  test("two businesses with the same name get distinct accounts instead of colliding", async () => {
    const a = await api().post("/api/v1/auth/register").send({ institutionName: "Kopi Senja" });
    const b = await api().post("/api/v1/auth/register").send({ institutionName: "Kopi Senja" });
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.notEqual(a.body.credentialsBundle.spv.email, b.body.credentialsBundle.spv.email);
    assert.notEqual(a.body.institution.id, b.body.institution.id);
    // each owner only sees their own tenant
    const meA = await api().get("/api/v1/auth/me").set(bearer(a.body.token));
    assert.equal(meA.body.institution.id, a.body.institution.id);
  });

  test("passwords are stored hashed and the response does not leak hashes", async () => {
    const res = await api().post("/api/v1/auth/register").send({ institutionName: "Hash Check" });
    assert.ok(!JSON.stringify(res.body).includes("password_hash"));
    const [row] = await query("SELECT password_hash FROM users WHERE email = ?", [res.body.credentialsBundle.spv.email]);
    assert.match(row.password_hash, /^\$2[aby]\$12\$/);
  });

  test("rejects empty names", async () => {
    const res = await api().post("/api/v1/auth/register").send({ institutionName: "" });
    assert.equal(res.status, 400);
  });
});
