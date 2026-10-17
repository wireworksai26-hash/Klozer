import "./setupPayments.js";
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { api, bearer, createProduct, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

const VA = process.env.IPAYMU_VA;
const API_KEY = process.env.IPAYMU_API_KEY;

before(setupDatabase);
after(teardownDatabase);
afterEach(() => mock.restoreAll());

function mockIpaymu(response) {
  return mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () =>
      response ?? {
        Status: 200,
        Success: true,
        Message: "success",
        Data: { TransactionId: 777, Via: "qris", Channel: "mpm", QrString: "00020101021226...", QrImage: "https://sandbox.ipaymu.com/qr/777.png", Fee: 1050 },
      },
  }));
}

// Callback signature as iPaymu documents it: HMAC-SHA256(VA) over the key-sorted JSON.
const sign = (body) => {
  const sorted = Object.fromEntries(Object.keys(body).sort().map((k) => [k, body[k]]));
  return crypto.createHmac("sha256", VA).update(JSON.stringify(sorted)).digest("hex");
};
const notification = (ref, amount, overrides = {}) => {
  const { signature, ...fields } = overrides;
  const body = {
    trx_id: 777,
    sid: "sid-1",
    reference_id: ref,
    status: "berhasil",
    status_code: 1,
    transaction_status_code: 1,
    amount: String(amount),
    sub_total: String(amount),
    total: String(amount),
    fee: "1050",
    via: "qris",
    channel: "mpm",
    additional_info: [],
    ...fields,
  };
  return { body, signature: signature ?? sign(body) };
};
const callback = (n) => api().post("/api/v1/payments/webhook").set("X-Signature", n.signature).send(n.body);

async function orderWithQris(t, { price = 150000, qty = 1 } = {}) {
  const product = await createProduct(t.institutionId, { price, stock: 100 });
  const created = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: qty }] });
  mockIpaymu();
  const qris = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: created.body.data.id });
  mock.restoreAll();
  return { order: created.body.data, qris: qris.body };
}

const orderStatus = async (id) => (await query("SELECT status FROM orders WHERE id = ?", [id]))[0].status;
const commissionCount = async (orderId) => Number((await query("SELECT COUNT(*) AS n FROM cs_commission_ledgers WHERE order_id = ?", [orderId]))[0].n);

describe("creating a QRIS payment", () => {
  test("charges the stored order total, ignoring any amount the client sends", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { price: 150000, stock: 10 });
    const order = (await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 2 }], shipping_fee: 10000 })).body.data;

    const fetchMock = mockIpaymu();
    const res = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id, amount: 1, gross_amount: 1 });

    assert.equal(res.status, 201);
    assert.equal(res.body.amount, 310000);
    assert.equal(res.body.mode, "ipaymu_sandbox");
    assert.equal(res.body.qrImageUrl, "https://sandbox.ipaymu.com/qr/777.png");

    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.ok(url.endsWith("/payment/direct"));
    const sent = JSON.parse(init.body);
    assert.equal(sent.amount, 310000);
    assert.equal(sent.paymentMethod, "qris");
    assert.equal(sent.paymentChannel, "mpm");
    assert.match(sent.referenceId, /^KLZ-[0-9]+-[0-9]+-[0-9A-F]{6}$/);
    assert.equal(init.headers.va, VA);
    const bodyHash = crypto.createHash("sha256").update(init.body).digest("hex");
    const expectedSignature = crypto.createHmac("sha256", API_KEY).update(`POST:${VA}:${bodyHash}:${API_KEY}`).digest("hex");
    assert.equal(init.headers.signature, expectedSignature);
    const [row] = await query("SELECT amount, status FROM payments WHERE payment_reference = ?", [res.body.paymentReference]);
    assert.equal(Number(row.amount), 310000);
    assert.equal(row.status, "pending");
  });

  test("works with the order_number as well, but never for another tenant's order", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const productA = await createProduct(a.institutionId, { stock: 10 });
    const orderA = (await api().post("/api/v1/orders").set(bearer(a.csToken)).send({ items: [{ product_id: productA, quantity: 1 }] })).body.data;

    mockIpaymu();
    const byNumber = await api().post("/api/v1/payments/qris").set(bearer(a.csToken)).send({ order_id: orderA.order_number });
    assert.equal(byNumber.status, 201);
    const foreign = await api().post("/api/v1/payments/qris").set(bearer(b.csToken)).send({ order_id: orderA.id });
    assert.equal(foreign.status, 404);
  });

  test("an order that is not waiting for payment cannot be charged", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 10 });
    const order = (await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }], payment_method: "cash" })).body.data;
    mockIpaymu();
    const res = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.equal(res.status, 409);
  });

  test("a gateway rejection is surfaced as 502 and nothing is stored (no silent simulator fallback)", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 10 });
    const order = (await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] })).body.data;

    mockIpaymu({ Status: 400, Success: false, Message: "Invalid merchant" });
    const res = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.equal(res.status, 502);
    assert.equal((await query("SELECT id FROM payments WHERE order_id = ?", [order.id])).length, 0);
  });

  test("an unreachable gateway is a 502, not a fake QR code", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 10 });
    const order = (await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] })).body.data;
    mock.method(globalThis, "fetch", async () => {
      throw new Error("ECONNREFUSED");
    });
    const res = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.equal(res.status, 502);
    assert.equal(res.body.code, "GATEWAY_UNREACHABLE");
  });

  test("issuing a new QR expires the previous pending one", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);
    mockIpaymu();
    const second = await api().post("/api/v1/payments/qris").set(bearer(t.csToken)).send({ order_id: order.id });
    assert.equal(second.status, 201);
    const rows = await query("SELECT payment_reference, status FROM payments WHERE order_id = ?", [order.id]);
    assert.equal(rows.find((r) => r.payment_reference === qris.paymentReference).status, "expired");
    assert.equal(rows.find((r) => r.payment_reference === second.body.paymentReference).status, "pending");
  });
});

describe("iPaymu callback", () => {
  test("rejects a missing or forged signature and changes nothing", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);

    const forged = await callback(notification(qris.paymentReference, 150000, { signature: "f".repeat(64) }));
    assert.equal(forged.status, 401);
    const unsigned = await api().post("/api/v1/payments/webhook").send(notification(qris.paymentReference, 150000).body);
    assert.equal(unsigned.status, 401);
    const tampered = notification(qris.paymentReference, 150000);
    tampered.body.amount = "1";
    assert.equal((await callback(tampered)).status, 401);
    const empty = await api().post("/api/v1/payments/webhook").send({});
    assert.equal(empty.status, 401);
    assert.equal(await orderStatus(order.id), "waiting_payment");
  });

  test("a valid settlement pays the order and records commission", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);

    const res = await callback(notification(qris.paymentReference, 150000));
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "paid");
    assert.equal(await orderStatus(order.id), "paid");
    assert.equal(await commissionCount(order.id), 1);
    const [p] = await query("SELECT status, paid_at, provider_transaction_id FROM payments WHERE payment_reference = ?", [qris.paymentReference]);
    assert.equal(p.status, "paid");
    assert.ok(p.paid_at);
    assert.equal(p.provider_transaction_id, "777");
  });

  test("redelivery is ignored: still one commission, still paid", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);
    const body = notification(qris.paymentReference, 150000);
    await callback(body);
    const again = await callback(body);
    assert.equal(again.status, 200);
    assert.equal(again.body.duplicateIgnored, true);
    assert.equal(await commissionCount(order.id), 1);
  });

  test("simultaneous duplicate deliveries are processed exactly once", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);
    const body = notification(qris.paymentReference, 150000);
    const results = await Promise.all(Array.from({ length: 8 }, () => callback(body)));
    assert.ok(results.every((r) => r.status === 200));
    assert.equal(await commissionCount(order.id), 1);
    assert.equal(await orderStatus(order.id), "paid");
    const logs = await query("SELECT status FROM webhook_logs WHERE idempotency_key LIKE ?", [`IPAYMU:${qris.paymentReference}:%`]);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "PROCESSED");
  });

  test("a validly signed notification with a different amount does not pay the order", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t, { price: 150000 });
    const res = await callback(notification(qris.paymentReference, 1000));
    assert.equal(res.status, 200);
    assert.equal(res.body.reason, "amount_mismatch");
    assert.equal(await orderStatus(order.id), "waiting_payment");
    assert.equal(await commissionCount(order.id), 0);
  });

  test("expire and deny update the payment without paying the order", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);
    const expired = await callback(notification(qris.paymentReference, 150000, { status: "expired", status_code: -2, transaction_status_code: 0 }));
    assert.equal(expired.body.status, "expired");
    const [p] = await query("SELECT status FROM payments WHERE payment_reference = ?", [qris.paymentReference]);
    assert.equal(p.status, "expired");
    assert.equal(await orderStatus(order.id), "waiting_payment");
  });

  test("unknown references are acknowledged but ignored (no retry storm, no state change)", async () => {
    const res = await callback(notification("KLZ-0-0-NOPE", 1000));
    assert.equal(res.status, 200);
    assert.equal(res.body.ignored, true);
  });

  test("money for an order that was cancelled in the meantime never resurrects it", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);
    await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "cancelled" });
    await callback(notification(qris.paymentReference, 150000));
    assert.equal(await orderStatus(order.id), "cancelled");
    assert.equal(await commissionCount(order.id), 0);
  });

  test("a paid order cannot be cancelled by staff without a refund", async () => {
    const t = await createTenant();
    const { order, qris } = await orderWithQris(t);
    await callback(notification(qris.paymentReference, 150000));
    const res = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "cancelled" });
    assert.equal(res.status, 409);
    assert.equal(await orderStatus(order.id), "paid");
  });
});
