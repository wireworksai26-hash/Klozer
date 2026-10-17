import "./setupPayments.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);

async function newOrder(t) {
  const product = await createProduct(t.institutionId, { price: 150000, stock: 10 });
  const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
  return res.body.data;
}

describe("package feature gate", () => {
  test("a feature switched off for the tenant is refused with FEATURE_DISABLED", async () => {
    const t = await createTenant();
    const order = await newOrder(t);
    await query("UPDATE institutions SET features_json = JSON_OBJECT('qris', false) WHERE id = ?", [t.institutionId]);

    const res = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "FEATURE_DISABLED");
  });

  test("only the switched-off feature is blocked; others stay available", async () => {
    const t = await createTenant();
    const order = await newOrder(t);
    await query("UPDATE institutions SET features_json = JSON_OBJECT('antiFraud', false) WHERE id = ?", [t.institutionId]);

    const res = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.notEqual(res.body.code, "FEATURE_DISABLED");

    // ...while the feature that is off is refused before the request body is even looked at.
    const fraud = await api().post("/api/v1/fraud/reconcile-mutation").set(bearer(t.ownerToken)).send({});
    assert.equal(fraud.status, 403);
    assert.equal(fraud.body.code, "FEATURE_DISABLED");
  });

  test("the superadmin switches a tenant's features; the tenant owner cannot", async () => {
    const t = await createTenant();
    const sa = await createSuperadmin();

    const own = await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(t.ownerToken)).send({ features: { qris: false } });
    assert.equal(own.status, 403);

    const set = await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ features: { qris: false, voiceAi: false } });
    assert.equal(set.status, 200);
    const [row] = await query("SELECT features_json FROM institutions WHERE id = ?", [t.institutionId]);
    assert.equal(row.features_json.qris, false);
    assert.equal(row.features_json.voiceAi, false);

    const order = await newOrder(t);
    const blocked = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.equal(blocked.body.code, "FEATURE_DISABLED");

    await api().put(`/api/v1/institutions/${t.institutionId}`).set(bearer(sa.token)).send({ features: { qris: true } });
    const allowed = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.notEqual(allowed.body.code, "FEATURE_DISABLED");
  });

  test("the superadmin is never blocked by a tenant's package", async () => {
    const t = await createTenant();
    const sa = await createSuperadmin();
    const order = await newOrder(t);
    await query("UPDATE institutions SET features_json = JSON_OBJECT('qris', false) WHERE id = ?", [t.institutionId]);
    const res = await api().post("/api/v1/payments/qris").set(bearer(sa.token)).set("x-institution-id", String(t.institutionId)).send({ order_id: order.id });
    assert.notEqual(res.body.code, "FEATURE_DISABLED");
  });
});
