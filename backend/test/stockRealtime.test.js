import "./setupWhatsapp.js";
import { test, before, after, afterEach, beforeEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createProduct, setupDatabase, teardownDatabase, waitFor } from "./helpers.js";
import { query } from "../src/config/db.js";
import { resetRealtime, setRealtimeForTests } from "../src/realtime.js";
import { cancelOrderSystem } from "../src/services/orderCancellation.js";
import { mockNetwork, row, say, shop } from "./agentTestKit.js";

before(setupDatabase);
after(async () => {
  resetRealtime();
  await teardownDatabase();
});

/** A stand-in for the socket server that keeps what was announced to each shop. */
let announced = [];
beforeEach(() => {
  announced = [];
  setRealtimeForTests({ to: (room) => ({ emit: (event, payload) => announced.push({ room, event, payload }) }) });
});
afterEach(() => mock.restoreAll());

const room = (t) => `tenant-${t.institutionId}`;
const eventsOf = (t, name) => announced.filter((e) => e.room === room(t) && e.event === name);
const lastStock = (t, productId) => eventsOf(t, "stock:changed").flatMap((e) => e.payload.products).filter((p) => p.id === productId).at(-1);

async function seller({ stock = 10 } = {}) {
  const t = await shop();
  const kemeja = await createProduct(t.institutionId, { name: "Kemeja Batik", price: 150000, hpp: 90000, stock });
  await api().post("/api/v1/bank-accounts").set(bearer(t.ownerToken)).send({ bank_code: "BCA", account_number: "1234567890", account_holder: "Toko Batik" });
  await api().put("/api/v1/commerce/settings").set(bearer(t.ownerToken)).send({ enabled: true, shippingMode: "flat", shippingFlatFee: 15000, payQris: false, payTransfer: true });
  return { ...t, kemeja };
}

const order = (t, productId, quantity, token = t.csToken) =>
  api().post("/api/v1/orders").set(bearer(token)).send({ phone_number: "6281500000777", customer_name: "Budi", customer_phone: "6281500000777", items: [{ product_id: productId, quantity }] });

describe("stock shown to the team as it moves", () => {
  test("an order made on the dashboard announces the order and the new stock to that shop only", async () => {
    const t = await seller();
    const other = await seller();
    const res = await order(t, t.kemeja, 3);
    assert.equal(res.status, 201);

    assert.deepEqual(lastStock(t, t.kemeja), { id: t.kemeja, sku: lastStock(t, t.kemeja).sku, name: "Kemeja Batik", stock: 7, lowStockThreshold: 5 });
    const [created] = eventsOf(t, "order:created");
    assert.deepEqual([created.payload.orderId, created.payload.status, created.payload.createdVia], [res.body.data.id, "waiting_payment", "dashboard"]);
    assert.equal(announced.filter((e) => e.room === room(other)).length, 0, "another shop hears nothing");
  });

  test("an order the AI takes in chat reduces the stock and the dashboard is told at once", async () => {
    const t = await seller();
    mockNetwork({
      nlu: (text) => (/kemeja/i.test(text) ? { items: [{ productId: t.kemeja, quantity: 2, mode: "add" }] } : /mawar/i.test(text) ? { recipient: { name: "Budi", address: "Jl. Mawar 5 RT 2 Laweyan", city: "Solo" } } : {}),
    });
    await say(t, "Mau pesan 2 kemeja batik");
    await say(t, "Budi, Jl. Mawar 5 RT 2 Laweyan, Solo 57148");
    assert.equal(eventsOf(t, "stock:changed").length, 0, "nothing is reserved until the customer confirms");

    await say(t, "ya kak");
    const placed = await row("SELECT * FROM orders WHERE institution_id = ?", [t.institutionId]);
    assert.equal(placed.created_via, "chat");
    assert.equal(Number((await row("SELECT stock_quantity AS s FROM products WHERE id = ?", [t.kemeja])).s), 8);
    assert.equal(lastStock(t, t.kemeja).stock, 8);
    assert.equal(eventsOf(t, "order:created")[0].payload.createdVia, "chat");
  });

  test("an order that cannot be fulfilled changes nothing and announces nothing", async () => {
    const t = await seller({ stock: 2 });
    const res = await order(t, t.kemeja, 5);
    assert.equal(res.status, 409);
    assert.equal(announced.length, 0);
    assert.equal(Number((await row("SELECT stock_quantity AS s FROM products WHERE id = ?", [t.kemeja])).s), 2);
  });

  test("cancelling an order gives the stock back, and the dashboard sees both the order and the stock change", async () => {
    const t = await seller();
    const res = await order(t, t.kemeja, 4);
    announced = [];
    const cancelled = await api().patch(`/api/v1/orders/${res.body.data.id}/status`).set(bearer(t.ownerToken)).send({ status: "cancelled", rejection_reason: "Pelanggan batal" });
    assert.equal(cancelled.status, 200);
    assert.equal(lastStock(t, t.kemeja).stock, 10);
    assert.deepEqual(eventsOf(t, "order:updated").map((e) => [e.payload.orderId, e.payload.status]), [[res.body.data.id, "cancelled"]]);
  });

  test("an unpaid order released by the system gives the stock back and says so", async () => {
    const t = await seller();
    const res = await order(t, t.kemeja, 6);
    assert.equal(lastStock(t, t.kemeja).stock, 4);
    announced = [];
    assert.equal(await cancelOrderSystem(t.institutionId, res.body.data.id, "Belum dibayar"), true);
    assert.equal(lastStock(t, t.kemeja).stock, 10);
    assert.equal(eventsOf(t, "order:updated").length, 1);
  });

  test("a payment confirmed by staff updates the order list without touching stock", async () => {
    const t = await seller();
    const res = await order(t, t.kemeja, 1);
    announced = [];
    const paid = await api().patch(`/api/v1/orders/${res.body.data.id}/status`).set(bearer(t.ownerToken)).send({ status: "paid" });
    assert.equal(paid.status, 200);
    assert.deepEqual(eventsOf(t, "order:updated").map((e) => e.payload.status), ["paid"]);
    assert.equal(eventsOf(t, "stock:changed").length, 0);
  });

  test("stock edited by hand, imported, or set in bulk is announced with the numbers now in force", async () => {
    const t = await seller();
    const sku = (await row("SELECT sku FROM products WHERE id = ?", [t.kemeja])).sku;

    announced = [];
    await api().put(`/api/v1/products/${t.kemeja}`).set(bearer(t.ownerToken)).send({ stock_quantity: 3 });
    assert.equal(lastStock(t, t.kemeja).stock, 3);

    announced = [];
    await api().post("/api/v1/products/stock").set(bearer(t.ownerToken)).send({ items: [{ sku, stock_quantity: 25 }] });
    assert.equal(lastStock(t, t.kemeja).stock, 25);

    announced = [];
    await api().put(`/api/v1/products/${t.kemeja}`).set(bearer(t.ownerToken)).send({ description: "Hanya deskripsi" });
    assert.equal(eventsOf(t, "stock:changed").length, 0, "a change that does not touch stock, price or availability is not announced");

    announced = [];
    const fresh = await api().post("/api/v1/products").set(bearer(t.ownerToken)).send({ sku: `NEW-${Date.now()}`, name: "Produk Baru", selling_price: 50000, cost_price_hpp: 20000, stock_quantity: 9 });
    assert.equal(fresh.status, 201);
    assert.equal(lastStock(t, fresh.body.data.id).stock, 9);
  });

  test("the event carries the shop's own low-stock line, so the screen can warn", async () => {
    const t = await seller({ stock: 6 });
    await order(t, t.kemeja, 2);
    const product = lastStock(t, t.kemeja);
    assert.deepEqual([product.stock, product.lowStockThreshold, product.stock <= product.lowStockThreshold], [4, 5, true]);
  });

  test("without a socket server nothing breaks", async () => {
    resetRealtime();
    const t = await seller();
    const res = await order(t, t.kemeja, 1);
    assert.equal(res.status, 201);
    await waitFor(async () => Number((await query("SELECT stock_quantity AS s FROM products WHERE id = ?", [t.kemeja]))[0].s) === 9);
  });
});
