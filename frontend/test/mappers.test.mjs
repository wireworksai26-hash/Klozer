import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PAID_STATUSES,
  institutionFromApi,
  institutionToApi,
  leadFromApi,
  leadToApi,
  orderFromApi,
  orderToApi,
  paymentMethodToApi,
  productFromApi,
  productToApi,
  relativeTimeId,
  roleToApi,
  teamMemberFromApi,
  toDbId,
  uiRoleFor,
} from "../src/utils/mappers.mjs";

describe("ids", () => {
  test("toDbId recovers numeric ids from every shape the UI uses", () => {
    assert.equal(toDbId("PRD-007"), 7);
    assert.equal(toDbId("LEAD-12"), 12);
    assert.equal(toDbId(5), 5);
    assert.equal(toDbId({ id: "PRD-003", dbId: 99 }), 99);
    assert.equal(toDbId({ id: "PRD-003" }), 3);
    assert.equal(toDbId(""), null);
    assert.equal(toDbId(undefined), null);
    assert.equal(toDbId("no-digits"), null);
  });
});

describe("roles", () => {
  test("server roles map onto the sidebar sets that exist", () => {
    assert.equal(uiRoleFor("supervisor"), "spv");
    assert.equal(uiRoleFor("finance"), "spv");
    assert.equal(uiRoleFor("pic_warehouse"), "cs");
    assert.equal(uiRoleFor("owner"), "owner");
    assert.equal(uiRoleFor("superadmin"), "superadmin");
    assert.equal(uiRoleFor("cs"), "cs");
  });

  test("free-text team roles map to server roles, defaulting to the least privileged", () => {
    assert.equal(roleToApi("Customer Service Senior"), "cs");
    assert.equal(roleToApi("Supervisor (SPV)"), "supervisor");
    assert.equal(roleToApi("Finance & Rekonsiliasi"), "finance");
    assert.equal(roleToApi("PIC Gudang"), "pic_warehouse");
    assert.equal(roleToApi("something odd"), "cs");
    assert.equal(roleToApi("Owner Toko"), "cs", "owner can never be granted through the add-member form");
  });
});

describe("products", () => {
  const api = { id: 7, sku: "A-1", name: "Kemeja", category: null, selling_price: 650000, cost_price_hpp: 380000, stock_quantity: 42, low_stock_threshold: 5, weight_in_grams: 350, is_active: 1, description: null, image_url: null };

  test("API -> UI", () => {
    const ui = productFromApi(api);
    assert.equal(ui.id, "PRD-007");
    assert.equal(ui.dbId, 7);
    assert.equal(ui.price, 650000);
    assert.equal(ui.hpp, 380000);
    assert.equal(ui.active, true);
    assert.equal(ui.category, "Umum");
    assert.deepEqual(ui.variants, ["Standard"]);
  });

  test("UI -> API sends only what changed and clamps nonsense", () => {
    assert.deepEqual(productToApi({ stock: 10 }), { stock_quantity: 10 });
    assert.deepEqual(productToApi({ active: false }), { is_active: false });
    assert.deepEqual(productToApi({ stock: -5.9 }), { stock_quantity: 0 });
    assert.deepEqual(productToApi({ price: "12500", hpp: "abc" }), { selling_price: 12500, cost_price_hpp: 0 });
    assert.equal("image_url" in productToApi({ name: "x" }), false);
  });
});

describe("orders", () => {
  const order = {
    id: 3, order_number: "ORD-20261009-AB12CD", lead_id: 9, customer_name: "Ani", customer_phone: "6281234567890", customer_city: "Bandung",
    subtotal_amount: 200000, discount_amount: 0, shipping_fee: 15000, total_amount: 215000, gross_profit: 80000, payment_method: "qris",
    status: "processing", cs_name: "Siti", courier: "jnt", awb: "JT1", created_at: "2026-10-09T03:00:00.000Z",
    items: [{ product_id: 7, item_name: "Kemeja", quantity: 2, unit_price: 100000 }],
  };

  test("API -> UI exposes the fields every page reads", () => {
    const ui = orderFromApi(order);
    assert.equal(ui.id, "ORD-20261009-AB12CD");
    assert.equal(ui.dbId, 3);
    assert.equal(ui.customer, "Ani");
    assert.equal(ui.total, 215000);
    assert.equal(ui.paymentMethod, "Dynamic QRIS");
    assert.equal(ui.items[0].productId, "PRD-007");
    assert.equal(ui.courier, "jnt");
    assert.match(ui.date, /WIB$/);
  });

  test("processing/shipped/delivered/completed orders still count as paid revenue", () => {
    for (const status of PAID_STATUSES) assert.equal(orderFromApi({ ...order, status }).paymentStatus, "paid", status);
    assert.equal(orderFromApi({ ...order, status: "waiting_payment" }).paymentStatus, "unpaid");
    assert.equal(orderFromApi({ ...order, status: "cancelled" }).paymentStatus, "cancelled");
  });

  test("UI -> API never sends prices or totals (the server prices the order)", () => {
    const body = orderToApi({
      customer: "Ani", phone: "+62 812-3456-7890", city: "Bandung", shippingFee: "12000", paymentMethod: "Transfer Bank",
      items: [{ productId: "PRD-007", name: "Kemeja", qty: "2", price: 1 }, { productId: null, name: "ghost", qty: 1, price: 1 }],
      subtotal: 1, total: 1,
    });
    assert.deepEqual(body.items, [{ product_id: 7, quantity: 2 }], "items without a product are dropped");
    assert.equal(body.shipping_fee, 12000);
    assert.equal(body.payment_method, "bank_transfer");
    assert.equal("total" in body, false);
    assert.equal("subtotal" in body, false);
    assert.equal(JSON.stringify(body).includes("price"), false);
  });

  test("payment labels", () => {
    assert.equal(paymentMethodToApi("Dynamic QRIS (1-Klik)"), "qris");
    assert.equal(paymentMethodToApi("COD"), "cod");
    assert.equal(paymentMethodToApi("Tunai"), "cash");
    assert.equal(paymentMethodToApi("???"), "qris");
  });

  test("a too-short customer phone is not sent (it would be rejected)", () => {
    assert.equal(orderToApi({ phone: "+62 8", items: [] }).customer_phone, undefined);
  });
});

describe("leads", () => {
  const lead = { id: 4, name: "Dewi", phone_number: "6281299900001", source: "Instagram", interest: "Batik", status: "in_progress", cs_name: "Siti", assigned_cs_id: 2, risk_cod_score: 72, est_value: 450000, notes: "n", city: "Solo", last_contacted_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() };

  test("statuses translate both ways", () => {
    assert.equal(leadFromApi(lead).status, "follow_up");
    assert.equal(leadFromApi({ ...lead, status: "repeat" }).status, "repeat_order");
    assert.equal(leadToApi({ status: "follow_up" }).status, "in_progress");
    assert.equal(leadToApi({ status: "repeat_order" }).status, "repeat");
  });

  test("API -> UI", () => {
    const ui = leadFromApi(lead);
    assert.equal(ui.id, "LEAD-004");
    assert.equal(ui.phone, "+6281299900001");
    assert.equal(ui.cs, "Siti");
    assert.equal(ui.codScore, 72);
    assert.equal(ui.codRisk, "medium");
    assert.equal(ui.estValue, 450000);
    assert.equal(ui.lastInteraction, "3 jam lalu");
  });

  test("UI -> API resolves the CS name to an id and normalises the phone", () => {
    const team = [{ name: "Siti", dbId: 2 }, { name: "Budi", dbId: 3 }];
    const body = leadToApi({ name: "Dewi", phone: "+62 812-9990-0001", cs: "Budi", codScore: 150, estValue: "300000", status: "closing" }, team);
    assert.equal(body.phone_number, "6281299900001");
    assert.equal(body.assigned_cs_id, 3);
    assert.equal(body.risk_cod_score, 100);
    assert.equal(body.est_value, 300000);
    assert.equal(leadToApi({ cs: "Nobody" }, team).assigned_cs_id, undefined);
  });

  test("relative time", () => {
    const now = Date.parse("2026-10-09T12:00:00Z");
    assert.equal(relativeTimeId("2026-10-09T11:59:40Z", now), "Baru saja");
    assert.equal(relativeTimeId("2026-10-09T11:30:00Z", now), "30 menit lalu");
    assert.equal(relativeTimeId("2026-10-07T12:00:00Z", now), "2 hari lalu");
    assert.equal(relativeTimeId(null, now), "-");
  });
});

describe("team and institutions", () => {
  test("team member defaults permissions and fills performance when known", () => {
    const m = teamMemberFromApi({ id: 5, name: "Siti", email: "s@x.id", role: "cs", is_active: 1, permissions_json: { exportReports: true } }, { handledChats: 10, closedOrders: 4, revenueGenerated: 1500000 });
    assert.equal(m.id, "USR-005");
    assert.equal(m.role, "Customer Service");
    assert.equal(m.permissions.exportReports, true);
    assert.equal(m.permissions.qrisGenerate, true);
    assert.equal(m.csClosingRate, "40%");
    assert.match(m.revenueGen, /^Rp 1\.500\.000$/);
    assert.equal(teamMemberFromApi({ id: 6, name: "x", email: "x", role: "cs", is_active: 0 }).status, "inactive");
  });

  test("institution round trip keeps modules and quota", () => {
    const ui = institutionFromApi({ id: 2, name: "Toko", subscription_tier: "enterprise", ai_token_quota: 5000000, ai_tokens_used: 1200, is_active: 1, features_json: { baileys: true, qris: false }, owner_name: "Hendra" });
    assert.equal(ui.id, "INST-002");
    assert.equal(ui.tier, "Enterprise");
    assert.equal(ui.quotaMax, 5000000);
    assert.equal(ui.modules.baileys, true);
    assert.equal(ui.modules.qris, false);
    assert.equal(ui.modules.multiCs, true);
    assert.equal(ui.owner, "Hendra");

    const owner = institutionToApi({ name: "N", tier: "Enterprise", quotaMax: 9, modules: { qris: false }, status: "inactive", phone: "08" });
    assert.deepEqual(owner, { name: "N", phone_number: "08" }, "platform fields are never sent for non-superadmins");
    const sa = institutionToApi({ name: "N", tier: "Enterprise", quotaMax: 9, modules: { qris: false }, status: "inactive" }, { superadmin: true });
    assert.deepEqual(sa, { name: "N", features: { qris: false }, subscription_tier: "enterprise", ai_token_quota: 9, is_active: false });
  });
});
