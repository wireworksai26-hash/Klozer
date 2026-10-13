import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);

describe("authentication is required everywhere it matters", () => {
  const protectedRoutes = [
    ["get", "/api/v1/products"],
    ["post", "/api/v1/products"],
    ["get", "/api/v1/leads"],
    ["get", "/api/v1/orders"],
    ["post", "/api/v1/orders"],
    ["get", "/api/v1/institutions"],
    ["get", "/api/v1/users"],
    ["get", "/api/v1/reports/summary"],
    ["post", "/api/v1/payments/qris"],
    ["post", "/api/v1/shipping/rates"],
    ["post", "/api/v1/fraud/verify-receipt"],
    ["post", "/api/v1/ai/chat"],
    ["get", "/api/v1/ai/token-balance"],
    // formerly public:
    ["get", "/api/v1/system/metrics"],
    ["get", "/api/v1/ai/token-usage"],
    ["get", "/api/v1/whatsapp/status"],
    ["post", "/api/v1/webhooks/whatsapp/simulate"],
  ];
  for (const [method, path] of protectedRoutes) {
    test(`${method.toUpperCase()} ${path} -> 401 without a token`, async () => {
      const res = await api()[method](path).send({});
      assert.equal(res.status, 401);
    });
  }

  test("removed routes are gone (heartbeat and token-usage log injection)", async () => {
    assert.equal((await api().post("/api/v1/whatsapp/heartbeat").send({})).status, 404);
    assert.equal((await api().post("/api/v1/ai/token-usage/log").send({})).status, 404);
  });
});

describe("tenant isolation", () => {
  test("a tenant only ever lists its own products", async () => {
    const a = await createTenant();
    const b = await createTenant();
    await createProduct(a.institutionId, { name: "Milik A" });
    await createProduct(b.institutionId, { name: "Milik B" });

    const res = await api().get("/api/v1/products").set(bearer(a.ownerToken));
    assert.equal(res.status, 200);
    const names = res.body.items.map((p) => p.name);
    assert.deepEqual(names, ["Milik A"]);
  });

  test("x-institution-id and ?institutionId cannot be used to read another tenant", async () => {
    const a = await createTenant();
    const b = await createTenant();
    await createProduct(b.institutionId, { name: "Rahasia B" });

    const viaHeader = await api().get("/api/v1/products").set(bearer(a.ownerToken)).set("x-institution-id", String(b.institutionId));
    assert.deepEqual(viaHeader.body.items, []);
    const viaQuery = await api().get(`/api/v1/products?institution_id=${b.institutionId}&institutionId=${b.institutionId}`).set(bearer(a.ownerToken));
    assert.deepEqual(viaQuery.body.items, []);
  });

  test("update and delete across tenants behave as 'not found' and change nothing", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const productB = await createProduct(b.institutionId, { name: "Produk B", price: 5000 });

    const put = await api().put(`/api/v1/products/${productB}`).set(bearer(a.ownerToken)).send({ name: "Dibajak", selling_price: 1 });
    assert.equal(put.status, 404);
    const del = await api().delete(`/api/v1/products/${productB}`).set(bearer(a.ownerToken));
    assert.equal(del.status, 404);

    const [row] = await query("SELECT name, selling_price FROM products WHERE id = ?", [productB]);
    assert.equal(row.name, "Produk B");
    assert.equal(Number(row.selling_price), 5000);
  });

  test("leads, chats and orders are isolated and ids from another tenant are rejected", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const leadB = (await api().post("/api/v1/leads").set(bearer(b.ownerToken)).send({ name: "Pelanggan B", phone_number: "081200000001" })).body.data;

    assert.equal((await api().get(`/api/v1/chats/${leadB.id}`).set(bearer(a.ownerToken))).status, 404);
    assert.equal((await api().put(`/api/v1/leads/${leadB.id}`).set(bearer(a.ownerToken)).send({ name: "x" })).status, 404);
    assert.equal((await api().get("/api/v1/leads").set(bearer(a.ownerToken))).body.items.length, 0);

    const productA = await createProduct(a.institutionId);
    const order = await api().post("/api/v1/orders").set(bearer(a.ownerToken)).send({ lead_id: leadB.id, items: [{ product_id: productA, quantity: 1 }] });
    assert.equal(order.status, 400);
  });

  test("a cs cannot be assigned from another tenant", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const res = await api().post("/api/v1/leads").set(bearer(a.ownerToken)).send({ phone_number: "081200000002", assigned_cs_id: b.cs.id });
    assert.equal(res.status, 400);
  });

  test("mass assignment: institution_id and other protected columns in the body are ignored", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const res = await api()
      .post("/api/v1/products")
      .set(bearer(a.ownerToken))
      .send({ sku: "MA-1", name: "Mass", selling_price: 1000, institution_id: b.institutionId, id: 99999, created_at: "2000-01-01" });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.institution_id, a.institutionId);
    assert.notEqual(res.body.data.id, 99999);
  });
});

describe("superadmin", () => {
  test("can act on another tenant through x-institution-id", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    await createProduct(t.institutionId, { name: "Produk Tenant" });
    const res = await api().get("/api/v1/products").set(bearer(sa.token)).set("x-institution-id", String(t.institutionId));
    assert.deepEqual(res.body.items.map((p) => p.name), ["Produk Tenant"]);
  });

  test("owners cannot reach platform endpoints", async () => {
    const t = await createTenant();
    for (const path of ["/api/v1/system/metrics", "/api/v1/ai/token-usage"]) {
      assert.equal((await api().get(path).set(bearer(t.ownerToken))).status, 403);
    }
    assert.equal((await api().post("/api/v1/institutions").set(bearer(t.ownerToken)).send({ name: "Hack", email: "h@x.test" })).status, 403);
    assert.equal((await api().delete(`/api/v1/institutions/${t.institutionId}`).set(bearer(t.ownerToken))).status, 403);
  });

  test("platform endpoints serve real data to the superadmin", async () => {
    const sa = await createSuperadmin();
    const metrics = await api().get("/api/v1/system/metrics").set(bearer(sa.token));
    assert.equal(metrics.status, 200);
    assert.equal(metrics.body.database.status, "connected");
    assert.equal(typeof metrics.body.database.latencyMs, "number");
    const usage = await api().get("/api/v1/ai/token-usage?range=7d").set(bearer(sa.token));
    assert.equal(usage.status, 200);
    assert.ok(Array.isArray(usage.body.tenantBreakdown));
  });

  test("institution listing: superadmin sees all, an owner sees only their own", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const all = await api().get("/api/v1/institutions?limit=100").set(bearer(sa.token));
    assert.ok(all.body.items.length >= 2);
    const own = await api().get("/api/v1/institutions").set(bearer(t.ownerToken));
    assert.equal(own.body.items.length, 1);
    assert.equal(own.body.items[0].id, t.institutionId);
  });

  test("owners can edit their profile but not platform-controlled fields or other tenants", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const ok = await api().put(`/api/v1/institutions/${a.institutionId}`).set(bearer(a.ownerToken)).send({ name: "Nama Baru", address: "Jl. Baru 1" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.name, "Nama Baru");

    const quota = await api().put(`/api/v1/institutions/${a.institutionId}`).set(bearer(a.ownerToken)).send({ ai_token_quota: 999999999 });
    assert.equal(quota.status, 403);
    const features = await api().put(`/api/v1/institutions/${a.institutionId}`).set(bearer(a.ownerToken)).send({ features: { fraudOcr: false } });
    assert.equal(features.status, 403);
    const other = await api().put(`/api/v1/institutions/${b.institutionId}`).set(bearer(a.ownerToken)).send({ name: "Dibajak" });
    assert.equal(other.status, 403);
  });

  test("superadmin can toggle features and deactivating a tenant revokes its sessions", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const toggled = await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ features: { fraudOcr: false } });
    assert.equal(toggled.body.data.features_json.fraudOcr, false);
    assert.equal(toggled.body.data.features_json.personaAi, true);

    assert.equal((await api().get("/api/v1/products").set(bearer(t.ownerToken))).status, 200);
    const del = await api().delete(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token));
    assert.equal(del.status, 200);
    assert.equal((await api().get("/api/v1/products").set(bearer(t.ownerToken))).status, 401);
  });
});

describe("role based access", () => {
  test("cs cannot manage products, staff or integrations; finance cannot create orders", async () => {
    const t = await createTenant();
    const productId = await createProduct(t.institutionId);

    assert.equal((await api().post("/api/v1/products").set(bearer(t.csToken)).send({ sku: "X", name: "X", selling_price: 1 })).status, 403);
    assert.equal((await api().delete(`/api/v1/products/${productId}`).set(bearer(t.csToken))).status, 403);
    assert.equal((await api().get("/api/v1/users").set(bearer(t.csToken))).status, 403);
    assert.equal((await api().put("/api/v1/whatsapp/channel").set(bearer(t.csToken)).send({ phone_number_id: "1", access_token: "x".repeat(20) })).status, 403);
    assert.equal((await api().post("/api/v1/orders").set(bearer(t.financeToken)).send({ items: [{ product_id: productId }] })).status, 403);
    assert.equal((await api().get("/api/v1/reports/summary").set(bearer(t.csToken))).status, 403);
    assert.equal((await api().get("/api/v1/reports/summary").set(bearer(t.financeToken))).status, 200);
  });
});

describe("staff management", () => {
  test("owner creates staff in their own tenant; the new account works and the password is not retrievable later", async () => {
    const t = await createTenant();
    const created = await api().post("/api/v1/users").set(bearer(t.ownerToken)).send({ name: "Staf Baru", email: "staf.baru@test.local", role: "cs" });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.institution_id, t.institutionId);
    assert.equal(created.body.data.password_hash, undefined);

    const loginRes = await api().post("/api/v1/auth/login").send({ email: "staf.baru@test.local", password: created.body.credentials.password });
    assert.equal(loginRes.status, 200);
    const list = await api().get("/api/v1/users").set(bearer(t.ownerToken));
    assert.ok(list.body.items.every((u) => u.password_hash === undefined));
  });

  test("owner cannot create superadmin/owner accounts or duplicate emails", async () => {
    const t = await createTenant();
    assert.equal((await api().post("/api/v1/users").set(bearer(t.ownerToken)).send({ name: "Evil", email: "evil@test.local", role: "superadmin" })).status, 400);
    assert.equal((await api().post("/api/v1/users").set(bearer(t.ownerToken)).send({ name: "Evil", email: "evil@test.local", role: "owner" })).status, 400);
    assert.equal((await api().post("/api/v1/users").set(bearer(t.ownerToken)).send({ name: "Dup", email: t.cs.email, role: "cs" })).status, 409);
  });

  test("owner cannot touch users of another tenant, nor deactivate themselves", async () => {
    const a = await createTenant();
    const b = await createTenant();
    assert.equal((await api().put(`/api/v1/users/${b.cs.id}`).set(bearer(a.ownerToken)).send({ name: "Nama Baru" })).status, 404);
    assert.equal((await api().delete(`/api/v1/users/${b.cs.id}`).set(bearer(a.ownerToken))).status, 404);
    assert.equal((await api().delete(`/api/v1/users/${a.owner.id}`).set(bearer(a.ownerToken))).status, 403);
  });

  test("deactivating staff takes effect on their live session", async () => {
    const t = await createTenant();
    assert.equal((await api().get("/api/v1/leads").set(bearer(t.csToken))).status, 200);
    assert.equal((await api().delete(`/api/v1/users/${t.cs.id}`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().get("/api/v1/leads").set(bearer(t.csToken))).status, 401);
  });
});

describe("error handling", () => {
  test("invalid JSON gives a clean 400", async () => {
    const res = await api().post("/api/v1/auth/login").set("Content-Type", "application/json").send("{not json");
    assert.equal(res.status, 400);
  });

  test("unknown routes are a JSON 404", async () => {
    const res = await api().get("/api/v1/nothing-here");
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test("health is up and readiness reflects the database", async () => {
    assert.equal((await api().get("/health")).status, 200);
    const ready = await api().get("/ready");
    assert.equal(ready.status, 200);
  });

  test("security headers are present and the stack is not advertised", async () => {
    const res = await api().get("/health");
    assert.equal(res.headers["x-powered-by"], undefined);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  });

  test("SQL metacharacters in search are treated as data", async () => {
    const t = await createTenant();
    await createProduct(t.institutionId, { name: "Normal" });
    const res = await api().get(`/api/v1/products?search=${encodeURIComponent("' OR 1=1 --")}`).set(bearer(t.ownerToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 0);
    const wildcard = await api().get(`/api/v1/products?search=${encodeURIComponent("%")}`).set(bearer(t.ownerToken));
    assert.equal(wildcard.body.items.length, 0);
  });
});
