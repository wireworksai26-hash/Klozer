import "./setupBootstrap.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, createSuperadmin, createTenant, login, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { runMigrations } from "../src/database/migrate.js";
import { ensureSuperadmin } from "../src/database/bootstrap.js";
import { decryptSecret, encryptSecret, generateRandomPassword, safeEqual } from "../src/utils/crypto.js";
import { verifyHmacSignature, verifyMidtransSignature } from "../src/utils/hmacValidator.js";
import { escapeLike, normalizePhone } from "../src/utils/helpers.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import crypto from "crypto";

before(setupDatabase);
after(teardownDatabase);

describe("crypto utilities", () => {
  test("AES-GCM round trip, random IV, and tamper detection", () => {
    const a = encryptSecret("EAAG-secret-token");
    const b = encryptSecret("EAAG-secret-token");
    assert.notEqual(a, b, "IV must be random");
    assert.equal(decryptSecret(a), "EAAG-secret-token");
    const [iv, tag, data] = a.split(":");
    const flipped = `${iv}:${tag}:${data.slice(0, -2)}${data.endsWith("00") ? "11" : "00"}`;
    assert.throws(() => decryptSecret(flipped));
    assert.throws(() => decryptSecret("not-encrypted"));
    assert.throws(() => encryptSecret(""));
  });

  test("generated passwords contain every character class and are not repeated", () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const p = generateRandomPassword(12);
      assert.equal(p.length, 12);
      assert.match(p, /[A-Z]/);
      assert.match(p, /[a-z]/);
      assert.match(p, /[0-9]/);
      assert.match(p, /[!@#$%*?]/);
      seen.add(p);
    }
    assert.equal(seen.size, 200);
  });

  test("safeEqual is length-safe", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
    assert.equal(safeEqual("abc", "abcd"), false);
    assert.equal(safeEqual(undefined, "x"), false);
  });

  test("HMAC verification is exact over the raw bytes", () => {
    const raw = Buffer.from('{"a":1}');
    const good = crypto.createHmac("sha256", "k").update(raw).digest("hex");
    assert.equal(verifyHmacSignature(raw, `sha256=${good}`, "k"), true);
    assert.equal(verifyHmacSignature(raw, good, "k"), true);
    assert.equal(verifyHmacSignature(Buffer.from('{"a": 1}'), `sha256=${good}`, "k"), false);
    assert.equal(verifyHmacSignature(raw, `sha256=${good}`, "other"), false);
    assert.equal(verifyHmacSignature(raw, "", "k"), false);
    assert.equal(verifyHmacSignature(raw, `sha256=${good}`, ""), false);
    assert.equal(verifyHmacSignature(raw, "sha256=short", "k"), false);
  });

  test("Midtrans signature requires every field", () => {
    const n = { order_id: "X-1", status_code: "200", gross_amount: "1000.00" };
    const sig = crypto.createHash("sha512").update("X-1" + "200" + "1000.00" + "key").digest("hex");
    assert.equal(verifyMidtransSignature({ ...n, signature_key: sig }, "key"), true);
    assert.equal(verifyMidtransSignature({ ...n, signature_key: sig }, "wrong"), false);
    assert.equal(verifyMidtransSignature({ ...n, gross_amount: "1.00", signature_key: sig }, "key"), false);
    assert.equal(verifyMidtransSignature({ order_id: "X-1", signature_key: sig }, "key"), false);
  });

  test("helpers: phone normalisation and LIKE escaping", () => {
    assert.equal(normalizePhone("0812-3456-7890"), "6281234567890");
    assert.equal(normalizePhone("+62 812 3456 7890"), "6281234567890");
    assert.equal(normalizePhone("81234567890"), "6281234567890");
    assert.equal(normalizePhone("6281234567890"), "6281234567890");
    assert.equal(normalizePhone(""), "");
    assert.equal(escapeLike("50%_off\\"), "50\\%\\_off\\\\");
  });
});

describe("error handler", () => {
  const run = (err) => {
    let status;
    let body;
    const res = { headersSent: false, status(s) { status = s; return this; }, json(b) { body = b; } };
    errorHandler(err, { id: "req-1", method: "GET", originalUrl: "/x", log: { error() {} } }, res, () => {});
    return { status, body };
  };

  test("unexpected errors never leak their message, SQL or stack", () => {
    const { status, body } = run(new Error("SELECT * FROM users WHERE password_hash = 'x' failed"));
    assert.equal(status, 500);
    assert.equal(body.message, "Terjadi kesalahan internal server.");
    assert.equal(body.stack, undefined);
    assert.equal(body.requestId, "req-1");
  });

  test("database constraint errors map to 409 without exposing the index name", () => {
    const err = Object.assign(new Error("Duplicate entry 'x' for key 'users.email'"), { code: "ER_DUP_ENTRY" });
    const { status, body } = run(err);
    assert.equal(status, 409);
    assert.ok(!body.message.includes("users.email"));
  });
});

describe("migrations", () => {
  test("running again applies nothing", async () => {
    assert.equal(await runMigrations(), 0);
  });

  test("an edited, already-applied migration is refused", async () => {
    const [{ checksum }] = await query("SELECT checksum FROM schema_migrations WHERE version = '001_init.sql'");
    await query("UPDATE schema_migrations SET checksum = 'tampered' WHERE version = '001_init.sql'");
    await assert.rejects(() => runMigrations(), /isinya berubah/);
    await query("UPDATE schema_migrations SET checksum = ? WHERE version = '001_init.sql'", [checksum]);
  });
});

describe("superadmin bootstrap", () => {
  test("is created from the environment, idempotent, and the password cannot be re-set by restarting", async () => {
    await query("DELETE FROM users WHERE role = 'superadmin'");
    assert.deepEqual(await ensureSuperadmin(), { created: true });
    assert.deepEqual(await ensureSuperadmin(), { created: false });

    const token = await login("root@klozer.test", "Sup3r-Secure-Root-Pass");
    const metrics = await api().get("/api/v1/system/metrics").set(bearer(token));
    assert.equal(metrics.status, 200);
    const platform = await query("SELECT slug FROM institutions WHERE slug = 'klozer-platform'");
    assert.equal(platform.length, 1);
  });

  test("no hardcoded superadmin exists anywhere", async () => {
    const seeded = await query("SELECT email FROM users WHERE email IN ('superadmin@klozer.id')");
    assert.equal(seeded.length, 0);
  });
});

describe("tenant provisioning by superadmin", () => {
  test("creates an institution with a working owner and refuses duplicate emails", async () => {
    const sa = await createSuperadmin();
    const res = await api().post("/api/v1/institutions").set(bearer(sa.token)).send({ name: "Toko Baru", email: "owner@tokobaru.test", mode: "business" });
    assert.equal(res.status, 201);
    const token = await login("owner@tokobaru.test", res.body.credentialsBundle.temporaryPassword);
    const me = await api().get("/api/v1/auth/me").set(bearer(token));
    assert.equal(me.body.user.institutionId, res.body.data.id);

    const dup = await api().post("/api/v1/institutions").set(bearer(sa.token)).send({ name: "Toko Lain", email: "owner@tokobaru.test" });
    assert.equal(dup.status, 409);
  });

  test("reset-password rotates the owner password and revokes old sessions", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const res = await api().post(`/api/v1/institutions/${t.institutionId}/reset-password`).set(bearer(sa.token)).send({});
    assert.equal(res.status, 200);
    assert.equal((await api().get("/api/v1/products").set(bearer(t.ownerToken))).status, 401);
    assert.ok(await login(t.owner.email, res.body.credentials.newPassword));
  });

  test("an owner cannot reset another tenant's password", async () => {
    const a = await createTenant();
    const b = await createTenant();
    assert.equal((await api().post(`/api/v1/institutions/${b.institutionId}/reset-password`).set(bearer(a.ownerToken)).send({})).status, 403);
  });
});

describe("shipping and fraud do not pretend", () => {
  test("rates are labelled as estimates", async () => {
    const t = await createTenant();
    const res = await api().post("/api/v1/shipping/rates").set(bearer(t.ownerToken)).send({ weightGrams: 1500 });
    assert.equal(res.status, 200);
    assert.equal(res.body.isEstimate, true);
  });

  async function paidOrder(t) {
    const product = await createProduct(t.institutionId, { stock: 10 });
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }], payment_method: "cash" });
    return res.body.data;
  }

  test("booking never fabricates an AWB; it records a draft or the number staff supplied", async () => {
    const t = await createTenant();
    const order = await paidOrder(t);
    const draft = await api().post("/api/v1/shipping/book").set(bearer(t.ownerToken)).send({ order_id: order.id, courier_code: "jne" });
    assert.equal(draft.status, 201);
    assert.equal(draft.body.awbNumber, null);
    assert.equal(draft.body.status, "draft");

    const again = await api().post("/api/v1/shipping/book").set(bearer(t.ownerToken)).send({ order_id: order.id });
    assert.equal(again.status, 409);

    const second = await paidOrder(t);
    const withAwb = await api().post("/api/v1/shipping/book").set(bearer(t.ownerToken)).send({ order_id: second.id, courier_code: "jnt", awb_number: "JT1234567890" });
    assert.equal(withAwb.body.awbNumber, "JT1234567890");
    assert.equal(withAwb.body.status, "pickup_requested");
  });

  test("cannot book shipment for another tenant's order, or for an unpaid non-COD order", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const order = await paidOrder(a);
    assert.equal((await api().post("/api/v1/shipping/book").set(bearer(b.ownerToken)).send({ order_id: order.id })).status, 404);

    const product = await createProduct(a.institutionId, { stock: 5 });
    const unpaid = (await api().post("/api/v1/orders").set(bearer(a.csToken)).send({ items: [{ product_id: product, quantity: 1 }] })).body.data;
    assert.equal((await api().post("/api/v1/shipping/book").set(bearer(a.ownerToken)).send({ order_id: unpaid.id })).status, 409);
  });

  test("receipt verification never claims a receipt is genuine without OCR", async () => {
    const t = await createTenant();
    const order = await paidOrder(t);
    const res = await api().post("/api/v1/fraud/verify-receipt").set(bearer(t.ownerToken)).send({ order_id: order.id, imageUrl: "https://example.com/proof.jpg" });
    assert.equal(res.status, 200);
    assert.equal(res.body.verificationStatus, "MANUAL_REVIEW_REQUIRED");
    assert.equal(res.body.ocrAvailable, false);
    assert.doesNotMatch(JSON.stringify(res.body), /GENUINE|VERIFIED/);

    const bad = await api().post("/api/v1/fraud/verify-receipt").set(bearer(t.ownerToken)).send({ order_id: order.id, imageUrl: "javascript:alert(1)" });
    assert.equal(bad.status, 400);
    const foreign = await createTenant();
    assert.equal((await api().post("/api/v1/fraud/verify-receipt").set(bearer(foreign.ownerToken)).send({ order_id: order.id, imageUrl: "https://example.com/p.jpg" })).status, 404);
  });

  test("a bank mutation can be reconciled only once, even under concurrency", async () => {
    const t = await createTenant();
    const bank = await query("INSERT INTO bank_accounts (institution_id, bank_code, account_number, account_holder) VALUES (?, 'BCA', '123', 'Toko')", [t.institutionId]);
    await query("INSERT INTO bank_mutations (institution_id, bank_account_id, amount, type, description_raw, transaction_date) VALUES (?, ?, 250000, 'CR', 'TRF', UTC_TIMESTAMP())", [t.institutionId, bank.insertId]);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => api().post("/api/v1/fraud/reconcile-mutation").set(bearer(t.financeToken)).send({ amount: 250000 }))
    );
    assert.equal(results.filter((r) => r.body.matched).length, 1);
  });
});

describe("CORS", () => {
  test("the configured frontend origin is allowed, other origins get no CORS headers", async () => {
    const ok = await api().get("/health").set("Origin", "http://localhost:3000");
    assert.equal(ok.headers["access-control-allow-origin"], "http://localhost:3000");
    const evil = await api().get("/health").set("Origin", "https://evil.example");
    assert.equal(evil.headers["access-control-allow-origin"], undefined);
  });
});

describe("input hardening", () => {
  test("product image_url must be http(s); empty is allowed", async () => {
    const t = await createTenant();
    const base = { sku: "IMG-1", name: "Produk Gambar", selling_price: 1000 };
    assert.equal((await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ ...base, image_url: "javascript:alert(1)" })).status, 400);
    assert.equal((await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ ...base, image_url: "data:text/html,<script>1</script>" })).status, 400);
    assert.equal((await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ ...base, image_url: "https://cdn.example.com/a.jpg" })).status, 201);
    assert.equal((await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ ...base, sku: "IMG-2", image_url: "" })).status, 201);
    assert.equal((await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ ...base, sku: "IMG-3" })).status, 201);
  });

  test("prices and stock cannot be negative or absurd", async () => {
    const t = await createTenant();
    for (const bad of [{ selling_price: -1 }, { stock_quantity: -5 }, { selling_price: 1e15 }, { cost_price_hpp: "abc" }]) {
      const res = await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ sku: `BAD-${Math.random()}`, name: "Bad", selling_price: 1000, ...bad });
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
  });

  test("boolean fields are parsed literally: the string 'false' means false", async () => {
    const t = await createTenant();
    const created = await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ sku: "BOOL-1", name: "Bool", selling_price: 1000 });
    const res = await api().put(`/api/v1/products/${created.body.data.id}`).set(bearer(t.ownerToken)).send({ is_active: "false" });
    assert.equal(res.body.data.is_active, 0);
  });

  test("oversized bodies are refused", async () => {
    const t = await createTenant();
    const res = await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ sku: "BIG", name: "x".repeat(2 * 1024 * 1024), selling_price: 1 });
    assert.equal(res.status, 413);
  });
});

describe("dashboard data contract", () => {
  test("leads keep interest, estimated value, notes, source and COD score, and expose the CS name", async () => {
    const t = await createTenant();
    const created = await api()
      .post("/api/v1/leads")
      .set(bearer(t.csToken))
      .send({ name: "Dewi", phone_number: "081299900001", source: "Instagram Ads (Reels)", interest: "Kemeja Batik", est_value: 450000, notes: "Minta diskon", risk_cod_score: 72, assigned_cs_id: t.cs.id });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.interest, "Kemeja Batik");

    const updated = await api().put(`/api/v1/leads/${created.body.data.id}`).set(bearer(t.csToken)).send({ status: "in_progress", notes: "Sudah follow up" });
    assert.equal(updated.body.data.status, "in_progress");

    const list = await api().get("/api/v1/leads?search=Kemeja").set(bearer(t.csToken));
    assert.equal(list.body.items.length, 1);
    const lead = list.body.items[0];
    assert.equal(lead.est_value, 450000);
    assert.equal(lead.risk_cod_score, 72);
    assert.equal(lead.notes, "Sudah follow up");
    assert.equal(lead.source, "Instagram Ads (Reels)");
    assert.ok(lead.cs_name);
  });

  test("staff permissions are stored per user and returned", async () => {
    const t = await createTenant();
    const created = await api().post("/api/v1/users").set(bearer(t.ownerToken)).send({ name: "Staf Izin", email: "izin@test.local", role: "cs", permissions: { qrisGenerate: true, exportReports: false } });
    assert.deepEqual(created.body.data.permissions_json, { qrisGenerate: true, exportReports: false });
    const upd = await api().put(`/api/v1/users/${created.body.data.id}`).set(bearer(t.ownerToken)).send({ permissions: { qrisGenerate: false } });
    assert.deepEqual(upd.body.data.permissions_json, { qrisGenerate: false });
    const bad = await api().put(`/api/v1/users/${created.body.data.id}`).set(bearer(t.ownerToken)).send({ permissions: { x: "yes" } });
    assert.equal(bad.status, 400);
  });

  test("orders list carries customer city, courier and AWB once a shipment exists", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 5 });
    const order = (await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ customer_name: "Rina", customer_phone: "081288800001", items: [{ product_id: product, quantity: 1 }], payment_method: "cash" })).body.data;
    await api().put(`/api/v1/leads/${order.lead_id}`).set(bearer(t.csToken)).send({ city: "Bandung" });
    await api().post("/api/v1/shipping/book").set(bearer(t.ownerToken)).send({ order_id: order.id, courier_code: "jnt", awb_number: "JT555" });

    const res = await api().get("/api/v1/orders").set(bearer(t.ownerToken));
    const row = res.body.items.find((o) => o.id === order.id);
    assert.equal(row.customer_city, "Bandung");
    assert.equal(row.courier, "jnt");
    assert.equal(row.awb, "JT555");
  });

  test("superadmin institution list includes the owner's name; feature keys match the dashboard modules", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const res = await api().get("/api/v1/institutions?limit=100").set(bearer(sa.token));
    const inst = res.body.items.find((i) => i.id === t.institutionId);
    assert.ok(inst.owner_name);
    const reg = await api().post("/api/v1/auth/register").send({ institutionName: "Fitur Check" });
    const features = reg.body.institution.features_json;
    for (const key of ["personaAi", "autoLabel", "printReceipt", "qris", "voiceAi", "antiFraud", "metaCapi", "multiCs", "stockManagement"]) {
      assert.equal(typeof features[key], "boolean", key);
    }
  });
});

describe("bulk catalogue import", () => {
  const row = (sku, extra = {}) => ({ sku, name: `Produk ${sku}`, selling_price: 10000, cost_price_hpp: 5000, stock_quantity: 10, ...extra });

  test("upsert creates new SKUs, updates existing ones, and is scoped to the tenant", async () => {
    const a = await createTenant();
    const b = await createTenant();
    await createProduct(b.institutionId, { sku: "SHARED-1", name: "Punya B", stock: 99 });

    const first = await api().post("/api/v1/products/bulk").set(bearer(a.ownerToken)).send({ items: [row("SHARED-1"), row("A-2")] });
    assert.equal(first.status, 201);
    assert.deepEqual([first.body.created, first.body.updated], [2, 0]);

    const second = await api().post("/api/v1/products/bulk").set(bearer(a.ownerToken)).send({ items: [row("SHARED-1", { selling_price: 25000 }), row("A-3")] });
    assert.deepEqual([second.body.created, second.body.updated], [1, 1]);

    const mine = await api().get("/api/v1/products?limit=100").set(bearer(a.ownerToken));
    assert.equal(mine.body.items.find((p) => p.sku === "SHARED-1").selling_price, 25000);
    const theirs = await api().get("/api/v1/products?limit=100").set(bearer(b.ownerToken));
    assert.equal(theirs.body.items.find((p) => p.sku === "SHARED-1").name, "Punya B");
    assert.equal(theirs.body.items.find((p) => p.sku === "SHARED-1").stock_quantity, 99);
  });

  test("replace deactivates missing products instead of deleting them", async () => {
    const t = await createTenant();
    await api().post("/api/v1/products/bulk").set(bearer(t.ownerToken)).send({ items: [row("K-1"), row("K-2"), row("K-3")] });
    const res = await api().post("/api/v1/products/bulk").set(bearer(t.ownerToken)).send({ mode: "replace", items: [row("K-1")] });
    assert.equal(res.body.deactivated, 2);
    const all = await api().get("/api/v1/products?limit=100").set(bearer(t.ownerToken));
    assert.equal(all.body.items.length, 3, "nothing deleted");
    assert.deepEqual(all.body.items.filter((p) => p.is_active).map((p) => p.sku), ["K-1"]);
    const reimport = await api().post("/api/v1/products/bulk").set(bearer(t.ownerToken)).send({ items: [row("K-2")] });
    assert.equal(reimport.body.updated, 1);
  });

  test("bad rows reject the whole import and change nothing", async () => {
    const t = await createTenant();
    assert.equal((await api().post("/api/v1/products/bulk").set(bearer(t.ownerToken)).send({ items: [row("OK-1"), row("BAD", { selling_price: -1 })] })).status, 400);
    assert.equal((await api().post("/api/v1/products/bulk").set(bearer(t.ownerToken)).send({ items: [row("DUP"), row("dup")] })).status, 400);
    assert.equal((await api().post("/api/v1/products/bulk").set(bearer(t.ownerToken)).send({ items: [] })).status, 400);
    assert.equal((await api().get("/api/v1/products").set(bearer(t.ownerToken))).body.items.length, 0);
  });

  test("cs cannot import; stock import sets absolute levels and reports unknown SKUs", async () => {
    const t = await createTenant();
    await api().post("/api/v1/products/bulk").set(bearer(t.ownerToken)).send({ items: [row("S-1", { stock_quantity: 5 })] });
    assert.equal((await api().post("/api/v1/products/bulk").set(bearer(t.csToken)).send({ items: [row("X")] })).status, 403);

    const res = await api().post("/api/v1/products/stock").set(bearer(t.ownerToken)).send({ items: [{ sku: "S-1", stock_quantity: 77 }, { sku: "NOPE", stock_quantity: 1 }] });
    assert.equal(res.body.updated, 1);
    assert.deepEqual(res.body.unknownSkus, ["NOPE"]);
    assert.equal((await api().get("/api/v1/products").set(bearer(t.ownerToken))).body.items[0].stock_quantity, 77);
  });
});

describe("integration status", () => {
  test("superadmin sees which integrations are configured, never the secrets", async () => {
    const sa = await createSuperadmin();
    const res = await api().get("/api/v1/system/integrations").set(bearer(sa.token));
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.ai.nvidia, "boolean");
    assert.equal(typeof res.body.payments.midtrans, "boolean");
    assert.match(res.body.webhooks.whatsapp, /\/api\/v1\/webhooks\/whatsapp$/);
    assert.ok(!/key|secret|token/i.test(Object.keys(res.body.ai).join()));
    const owner = await createTenant();
    assert.equal((await api().get("/api/v1/system/integrations").set(bearer(owner.ownerToken))).status, 403);
  });
});

describe("bank accounts and audit log", () => {
  test("owner manages transfer accounts; cs cannot; tenants are isolated", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const created = await api().post("/api/v1/bank-accounts").set(bearer(a.ownerToken)).send({ bank_code: "BCA", account_number: "8809123847", account_holder: "PT Contoh" });
    assert.equal(created.status, 201);
    const id = created.body.data.id;

    assert.equal((await api().post("/api/v1/bank-accounts").set(bearer(a.csToken)).send({ bank_code: "BCA", account_number: "123456", account_holder: "X" })).status, 403);
    assert.equal((await api().get("/api/v1/bank-accounts").set(bearer(b.ownerToken))).body.items.length, 0);
    assert.equal((await api().put(`/api/v1/bank-accounts/${id}`).set(bearer(b.ownerToken)).send({ account_holder: "Dibajak" })).status, 404);
    assert.equal((await api().delete(`/api/v1/bank-accounts/${id}`).set(bearer(b.ownerToken))).status, 404);

    const upd = await api().put(`/api/v1/bank-accounts/${id}`).set(bearer(a.ownerToken)).send({ is_active: false });
    assert.equal(upd.body.data.is_active, 0);
    assert.equal((await api().post("/api/v1/bank-accounts").set(bearer(a.ownerToken)).send({ bank_code: "BCA", account_number: "<script>", account_holder: "X" })).status, 400);
    assert.equal((await api().delete(`/api/v1/bank-accounts/${id}`).set(bearer(a.ownerToken))).status, 200);
  });

  test("audit log lists this tenant's actions with the actor, and nobody else's", async () => {
    const a = await createTenant();
    const b = await createTenant();
    await api().post("/api/v1/bank-accounts").set(bearer(a.ownerToken)).send({ bank_code: "BNI", account_number: "555000111", account_holder: "A" });
    const res = await api().get("/api/v1/audit-logs?action=bank_account").set(bearer(a.ownerToken));
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 1);
    assert.equal(res.body.items[0].action, "bank_account.create");
    assert.equal(res.body.items[0].user_role, "owner");
    assert.equal((await api().get("/api/v1/audit-logs").set(bearer(b.ownerToken))).body.items.filter((i) => i.action.startsWith("bank_account")).length, 0);
    assert.equal((await api().get("/api/v1/audit-logs").set(bearer(a.csToken))).status, 403);
  });
});
