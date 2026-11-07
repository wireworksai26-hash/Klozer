import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseLabel } from "../src/services/leads/leadLabels.js";
import { assignmentMessage, canAssignOrder, canMove, noticeOutcome, orderPathFor } from "../src/services/delivery/deliveryModel.js";

describe("what a label cell means", () => {
  const cases = [
    ["Lead", "new", false],
    ["lead baru", "new", false],
    ["Closing", "closing", false],
    ["Pelanggan VIP", "new", true],
    ["VIP closing", "closing", true],
    ["Repeat Order", "repeat", false],
    ["Belum Beli", "new", false],
    ["Belum closing", "new", false],
    ["Batal", "closed_lost", false],
    ["follow up", "in_progress", false],
    ["", "new", false],
    [null, "new", false],
    ["-", "new", false],
  ];
  for (const [text, status, isVip] of cases) {
    test(`${JSON.stringify(text)} -> ${status}${isVip ? " + VIP" : ""}`, () => {
      const parsed = parseLabel(text);
      assert.equal(parsed.status, status);
      assert.equal(parsed.isVip, isVip);
    });
  }

  test("text it does not know is reported, so the importer can keep it as a note", () => {
    assert.equal(parseLabel("Reseller Jabar").known, false);
    assert.equal(parseLabel("Reseller Jabar").status, "new");
  });
});

describe("which orders can go to a delivery PIC", () => {
  const base = { fulfillment_type: "delivery", payment_method: "qris" };
  test("a paid, processing or shipped order can", () => {
    for (const status of ["paid", "processing", "shipped"]) assert.equal(canAssignOrder({ ...base, status }).ok, true, status);
  });
  test("an unpaid order cannot, unless it is cash on delivery", () => {
    assert.equal(canAssignOrder({ ...base, status: "waiting_payment" }).ok, false);
    assert.equal(canAssignOrder({ ...base, status: "waiting_payment", payment_method: "cod" }).ok, true);
  });
  test("a finished, cancelled or pick-up order cannot", () => {
    for (const status of ["delivered", "completed", "cancelled"]) assert.equal(canAssignOrder({ ...base, status }).ok, false, status);
    assert.match(canAssignOrder({ ...base, status: "paid", fulfillment_type: "pickup" }).reason, /diambil sendiri/);
  });
});

describe("how a delivery moves", () => {
  test("it can be picked up, finished or taken back, and nothing moves after it ends", () => {
    assert.equal(canMove("assigned", "picked_up"), true);
    assert.equal(canMove("assigned", "delivered"), true);
    assert.equal(canMove("picked_up", "failed"), true);
    assert.equal(canMove("delivered", "failed"), false);
    assert.equal(canMove("cancelled", "picked_up"), false);
    assert.equal(canMove("picked_up", "picked_up"), false);
  });

  test("the order follows one status at a time", () => {
    assert.deepEqual(orderPathFor("paid", "shipped"), ["processing", "shipped"]);
    assert.deepEqual(orderPathFor("processing", "delivered"), ["shipped", "delivered"]);
    assert.deepEqual(orderPathFor("shipped", "shipped"), []);
    assert.deepEqual(orderPathFor("delivered", "shipped"), []);
    assert.deepEqual(orderPathFor("waiting_payment", "shipped"), []);
    assert.deepEqual(orderPathFor("cancelled", "delivered"), []);
  });
});

describe("the message the PIC gets", () => {
  const message = assignmentMessage({
    picName: "Andi Kurir", orderNumber: "ORD-100", recipientName: "Siti", recipientPhone: "628111", address: "Jl. Slamet Riyadi 1, Solo",
    items: [{ name: "Kemeja", quantity: 2 }], codAmount: 250000, note: "Titip satpam", shopName: "Batik Solo",
  });
  test("it has what the PIC needs at the door", () => {
    for (const part of ["Halo Andi", "dari Batik Solo", "ORD-100", "Siti (628111)", "Jl. Slamet Riyadi 1, Solo", "2x Kemeja", "Rp 250.000", "Titip satpam"]) assert.ok(message.includes(part), part);
  });
  test("a prepaid order has no cash line", () => {
    assert.doesNotMatch(assignmentMessage({ picName: "Andi", orderNumber: "ORD-1", codAmount: 0 }), /COD/);
  });
});

describe("what is recorded about the notice", () => {
  test("no phone, no channel, a failure and a success are told apart", () => {
    assert.equal(noticeOutcome({ hasPhone: false }).status, "skipped");
    assert.equal(noticeOutcome({ hasPhone: true, result: { success: true, mode: "sandbox_simulated" } }).status, "skipped");
    assert.equal(noticeOutcome({ hasPhone: true, result: { success: false, error: "Message undeliverable" } }).status, "failed");
    assert.equal(noticeOutcome({ hasPhone: true, result: { success: true } }).status, "sent");
  });
});
