import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);

const stockOf = async (id) => Number((await query("SELECT stock_quantity AS s FROM products WHERE id = ?", [id]))[0].s);
const orderCount = async (institutionId) => Number((await query("SELECT COUNT(*) AS n FROM orders WHERE institution_id = ?", [institutionId]))[0].n);

describe("order creation", () => {
  test("prices and HPP come from the database; client-supplied prices are ignored", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { price: 100000, hpp: 60000, stock: 10 });

    const res = await api()
      .post("/api/v1/orders")
      .set(bearer(t.csToken))
      .send({
        customer_name: "Ani",
        customer_phone: "081234567890",
        items: [{ product_id: product, quantity: 2, unit_price: 1, unit_cost_hpp: 0 }],
        shipping_fee: 15000,
        payment_method: "qris",
      });
    assert.equal(res.status, 201);
    const order = res.body.data;
    assert.equal(order.subtotal_amount, 200000);
    assert.equal(order.total_amount, 215000);
    assert.equal(order.total_cost_hpp, 120000);
    assert.equal(order.items[0].unit_price, 100000);
    assert.equal(order.status, "waiting_payment");
    assert.equal(order.customer_name, "Ani");
    assert.equal(await stockOf(product), 8);
  });

  test("a discount larger than the subtotal is rejected (no negative totals)", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { price: 10000 });
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }], discount_amount: 999999 });
    assert.equal(res.status, 400);
  });

  test("insufficient stock is a 409 and leaves no order and no stock change behind", async () => {
    const t = await createTenant();
    const enough = await createProduct(t.institutionId, { stock: 10 });
    const scarce = await createProduct(t.institutionId, { stock: 1 });

    const res = await api()
      .post("/api/v1/orders")
      .set(bearer(t.csToken))
      .send({ items: [{ product_id: enough, quantity: 3 }, { product_id: scarce, quantity: 2 }] });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "INSUFFICIENT_STOCK");
    assert.equal(await orderCount(t.institutionId), 0);
    assert.equal(await stockOf(enough), 10);
    assert.equal(await stockOf(scarce), 1);
  });

  test("duplicate lines for one product are summed against stock", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 3 });
    const res = await api()
      .post("/api/v1/orders")
      .set(bearer(t.csToken))
      .send({ items: [{ product_id: product, quantity: 2 }, { product_id: product, quantity: 2 }] });
    assert.equal(res.status, 409);
    assert.equal(await stockOf(product), 3);
  });

  test("concurrent orders can never oversell: 5 in stock, 12 simultaneous buyers -> exactly 5 succeed", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 5 });

    const results = await Promise.all(
      Array.from({ length: 12 }, () => api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] }))
    );
    const ok = results.filter((r) => r.status === 201).length;
    const conflict = results.filter((r) => r.status === 409).length;
    assert.equal(ok, 5);
    assert.equal(conflict, 7);
    assert.equal(await stockOf(product), 0);
    assert.equal(await orderCount(t.institutionId), 5);
  });

  test("another tenant's product or an inactive product cannot be ordered", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const foreign = await createProduct(b.institutionId);
    const inactive = await createProduct(a.institutionId);
    await query("UPDATE products SET is_active = 0 WHERE id = ?", [inactive]);

    for (const product_id of [foreign, inactive]) {
      const res = await api().post("/api/v1/orders").set(bearer(a.csToken)).send({ items: [{ product_id, quantity: 1 }] });
      assert.equal(res.status, 400);
    }
  });

  test("quantities must be positive integers within bounds", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId);
    for (const quantity of [0, -1, 1.5, 10000000]) {
      const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity }] });
      assert.equal(res.status, 400, `quantity ${quantity}`);
    }
  });

  test("order numbers are unique across a burst", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 100 });
    const results = await Promise.all(
      Array.from({ length: 15 }, () => api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] }))
    );
    const numbers = results.map((r) => r.body.data.order_number);
    assert.equal(new Set(numbers).size, 15);
  });
});

describe("commission", () => {
  test("a cash order is paid immediately and earns the CS commission exactly once", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { price: 200000 });
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }], payment_method: "cash" });
    assert.equal(res.body.data.status, "paid");

    const ledger = await query("SELECT * FROM cs_commission_ledgers WHERE order_id = ?", [res.body.data.id]);
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].cs_user_id, t.cs.id);
    assert.equal(Number(ledger[0].commission_amount), 10000); // 5% of 200.000
  });

  test("an unpaid order earns no commission yet", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId);
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    const ledger = await query("SELECT id FROM cs_commission_ledgers WHERE order_id = ?", [res.body.data.id]);
    assert.equal(ledger.length, 0);
  });
});

describe("status machine", () => {
  async function waitingOrder(t, stock = 10) {
    const product = await createProduct(t.institutionId, { price: 50000, stock });
    const res = await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 2 }] });
    return { product, order: res.body.data };
  }

  test("manual payment confirmation pays the order, records commission once, and is idempotent", async () => {
    const t = await createTenant();
    const { order } = await waitingOrder(t);

    const paid = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.financeToken)).send({ status: "paid" });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.data.status, "paid");
    const again = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.financeToken)).send({ status: "paid" });
    assert.equal(again.status, 409);

    const ledger = await query("SELECT id FROM cs_commission_ledgers WHERE order_id = ?", [order.id]);
    assert.equal(ledger.length, 1);
  });

  test("cs cannot confirm payment", async () => {
    const t = await createTenant();
    const { order } = await waitingOrder(t);
    const res = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.csToken)).send({ status: "paid" });
    assert.equal(res.status, 403);
  });

  test("illegal jumps are rejected", async () => {
    const t = await createTenant();
    const { order } = await waitingOrder(t);
    for (const status of ["shipped", "delivered", "completed", "processing"]) {
      const res = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status });
      assert.equal(res.status, 409, status);
    }
  });

  test("cancelling returns stock and removes the unsettled commission; cancelled orders are final", async () => {
    const t = await createTenant();
    const { product, order } = await waitingOrder(t, 10);
    assert.equal(await stockOf(product), 8);
    await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });

    const cancelled = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "cancelled" });
    assert.equal(cancelled.status, 200);
    assert.equal(await stockOf(product), 10);
    assert.equal((await query("SELECT id FROM cs_commission_ledgers WHERE order_id = ?", [order.id])).length, 0);

    const revive = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    assert.equal(revive.status, 409);
  });

  test("full happy path through delivery", async () => {
    const t = await createTenant();
    const { order } = await waitingOrder(t);
    for (const status of ["paid", "processing", "shipped", "delivered", "completed"]) {
      const res = await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(t.ownerToken)).send({ status });
      assert.equal(res.status, 200, status);
    }
  });

  test("another tenant cannot change or invoice the order", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const { order } = await waitingOrder(a);
    assert.equal((await api().patch(`/api/v1/orders/${order.id}/status`).set(bearer(b.ownerToken)).send({ status: "cancelled" })).status, 404);
    assert.equal((await api().get(`/api/v1/orders/${order.id}/invoice`).set(bearer(b.ownerToken))).status, 404);
  });
});

describe("listing, invoice and reports", () => {
  test("orders list is paginated, searchable and tenant scoped; invoice renders real data", async () => {
    const t = await createTenant();
    const other = await createTenant();
    const product = await createProduct(t.institutionId, { name: "Kopi Susu", price: 25000, stock: 50 });
    const foreign = await createProduct(other.institutionId, { stock: 50 });
    await api().post("/api/v1/orders").set(bearer(other.csToken)).send({ items: [{ product_id: foreign, quantity: 1 }] });

    for (let i = 0; i < 3; i++) {
      await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ customer_name: `Pembeli ${i}`, customer_phone: `08120000010${i}`, items: [{ product_id: product, quantity: 1 }] });
    }

    const page = await api().get("/api/v1/orders?limit=2&page=1").set(bearer(t.ownerToken));
    assert.equal(page.body.items.length, 2);
    assert.equal(page.body.pagination.totalItems, 3);
    assert.equal(page.body.pagination.hasNextPage, true);

    const search = await api().get("/api/v1/orders?search=Pembeli%201").set(bearer(t.ownerToken));
    assert.equal(search.body.items.length, 1);

    const invoice = await api().get(`/api/v1/orders/${page.body.items[0].id}/invoice`).set(bearer(t.ownerToken));
    assert.equal(invoice.status, 200);
    assert.match(invoice.body.data.thermalReceiptText, /Kopi Susu/);
    assert.equal(invoice.body.data.pdfDownloadUrl, undefined);
  });

  test("the summary report aggregates only this tenant and CS figures are not inflated", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { price: 100000, hpp: 40000, stock: 50 });
    // 3 chat messages from cs and 2 paid orders: a join-based query would multiply revenue by the message count
    const lead = (await api().post("/api/v1/leads").set(bearer(t.csToken)).send({ phone_number: "081300000001" })).body.data;
    for (let i = 0; i < 3; i++) {
      await api().post("/api/v1/chats/send").set(bearer(t.csToken)).send({ lead_id: lead.id, content_text: `halo ${i}` });
    }
    for (let i = 0; i < 2; i++) {
      await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: lead.id, items: [{ product_id: product, quantity: 1 }], payment_method: "cash" });
    }
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ lead_id: lead.id, items: [{ product_id: product, quantity: 1 }] }); // unpaid

    const res = await api().get("/api/v1/reports/summary").set(bearer(t.ownerToken));
    assert.equal(res.status, 200);
    const d = res.body.data;
    assert.equal(d.totalOrders, 3);
    assert.equal(d.paidOrders, 2);
    assert.equal(d.totalRevenue, 200000);
    assert.equal(d.totalGrossProfit, 120000);
    assert.equal(d.closingRatePercent, 67);
    assert.equal(d.metaAdRoas, null);

    const cs = d.csPerformance.find((c) => c.id === t.cs.id);
    assert.equal(cs.closedOrders, 2);
    assert.equal(cs.revenueGenerated, 200000);
    assert.equal(cs.commissionEarned, 10000);
    assert.equal(cs.handledChats, 1);
  });
});

describe("single order", () => {
  test("GET /orders/:id returns the order with items, and never another tenant's", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const product = await createProduct(a.institutionId, { name: "Satu Produk", stock: 3 });
    const order = (await api().post("/api/v1/orders").set(bearer(a.csToken)).send({ items: [{ product_id: product, quantity: 1 }] })).body.data;

    const ok = await api().get(`/api/v1/orders/${order.id}`).set(bearer(a.ownerToken));
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.items[0].item_name, "Satu Produk");
    assert.equal((await api().get(`/api/v1/orders/${order.id}`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await api().get(`/api/v1/orders/${order.id}`)).status, 401);
  });
});

describe("my performance", () => {
  test("a cs sees only their own commission, never the team report", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { price: 200000, stock: 5 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }], payment_method: "cash" });

    const mine = await api().get("/api/v1/reports/my-performance").set(bearer(t.csToken));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.closedOrders, 1);
    assert.equal(mine.body.data.commissionEarned, 10000);
    assert.equal((await api().get("/api/v1/reports/summary").set(bearer(t.csToken))).status, 403);

    const other = await api().get("/api/v1/reports/my-performance").set(bearer(t.financeToken));
    assert.equal(other.status, 403);
  });
});

describe("idempotent order creation", () => {
  test("retrying with the same Idempotency-Key returns the first order and reserves stock once", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 10 });
    const send = () => api().post("/api/v1/orders").set(bearer(t.csToken)).set("Idempotency-Key", "order-key-0001").send({ items: [{ product_id: product, quantity: 2 }] });

    const first = await send();
    assert.equal(first.status, 201);
    const again = await send();
    assert.equal(again.status, 200);
    assert.equal(again.body.replayed, true);
    assert.equal(again.body.data.id, first.body.data.id);
    assert.equal(await stockOf(product), 8);
    assert.equal(await orderCount(t.institutionId), 1);
  });

  test("ten simultaneous submissions with one key create exactly one order", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 50 });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => api().post("/api/v1/orders").set(bearer(t.csToken)).set("Idempotency-Key", "burst-key-0001").send({ items: [{ product_id: product, quantity: 3 }] }))
    );
    assert.ok(results.every((r) => r.status === 201 || r.status === 200), results.map((r) => r.status).join(","));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(new Set(results.map((r) => r.body.data.id)).size, 1);
    assert.equal(await orderCount(t.institutionId), 1);
    assert.equal(await stockOf(product), 47);
  });

  test("keys are scoped per tenant and validated", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const pa = await createProduct(a.institutionId, { stock: 5 });
    const pb = await createProduct(b.institutionId, { stock: 5 });
    const ra = await api().post("/api/v1/orders").set(bearer(a.csToken)).set("Idempotency-Key", "shared-key-0001").send({ items: [{ product_id: pa, quantity: 1 }] });
    const rb = await api().post("/api/v1/orders").set(bearer(b.csToken)).set("Idempotency-Key", "shared-key-0001").send({ items: [{ product_id: pb, quantity: 1 }] });
    assert.equal(ra.status, 201);
    assert.equal(rb.status, 201, "another tenant's key must not replay a foreign order");
    assert.notEqual(ra.body.data.id, rb.body.data.id);

    const bad = await api().post("/api/v1/orders").set(bearer(a.csToken)).set("Idempotency-Key", "x").send({ items: [{ product_id: pa, quantity: 1 }] });
    assert.equal(bad.status, 400);
  });

  test("without a key every submission is a new order (unchanged behaviour)", async () => {
    const t = await createTenant();
    const product = await createProduct(t.institutionId, { stock: 5 });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    await api().post("/api/v1/orders").set(bearer(t.csToken)).send({ items: [{ product_id: product, quantity: 1 }] });
    assert.equal(await orderCount(t.institutionId), 2);
  });
});
