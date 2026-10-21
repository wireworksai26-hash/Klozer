import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createSuperadmin, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);

// a real 1x1 PNG, a real JPEG header, and bytes that are not an image
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(200, 1)]);
const base64 = (buffer) => buffer.toString("base64");
const padded = (buffer) => Buffer.concat([buffer, Buffer.alloc(200, 0)]);

const admin = (sa, method, path, body) => api()[method](`/api/v1/platform/payment-methods${path}`).set(bearer(sa.token)).send(body);
const publicList = async () => (await api().get("/api/v1/public/payment-methods")).body.data;

describe("how Klozer is paid", () => {
  test("a bank account is added and shows publicly at once; a QRIS stays hidden until its picture is there", async () => {
    const sa = await createSuperadmin();
    const bank = await admin(sa, "post", "", { kind: "bank", label: "Transfer BCA", accountName: "PT Contoh Klozer", accountNumber: "1234567890", instructions: "Kirim bukti ke WhatsApp tim" });
    assert.equal(bank.status, 201, JSON.stringify(bank.body));
    assert.deepEqual([bank.body.data.kind, bank.body.data.isActive, bank.body.data.hasQris], ["bank", true, false]);

    const qris = await admin(sa, "post", "", { kind: "qris", label: "QRIS Merchant", accountName: "Klozer Merchant", isActive: true });
    assert.equal(qris.body.data.isActive, false, "a QRIS without its picture cannot be used, so it starts hidden");
    const early = await admin(sa, "put", `/${qris.body.data.id}`, { isActive: true });
    assert.deepEqual([early.status, early.body.code], [409, "QRIS_IMAGE_REQUIRED"]);

    const names = (await publicList()).map((m) => m.label);
    assert.ok(names.includes("Transfer BCA"));
    assert.ok(!names.includes("QRIS Merchant"));
  });

  test("upload the QRIS picture, switch it on, and the public page serves exactly that picture", async () => {
    const sa = await createSuperadmin();
    const { body } = await admin(sa, "post", "", { kind: "qris", label: "QRIS Merchant Uji" });
    const id = body.data.id;
    const uploaded = await admin(sa, "put", `/${id}/qris`, { fileBase64: `data:image/png;base64,${base64(PNG)}`, fileName: "qris.png" });
    assert.equal(uploaded.status, 200, JSON.stringify(uploaded.body));
    assert.deepEqual([uploaded.body.data.hasQris, uploaded.body.data.qrisUrl], [true, `/api/v1/platform/payment-methods/${id}/qris`], "while hidden, the picture is previewed from the platform route");

    assert.equal((await api().get(`/api/v1/public/payment-methods/${id}/qris`)).status, 404, "a hidden QRIS is not public");
    const preview = await admin(sa, "get", `/${id}/qris`);
    assert.equal(preview.status, 200, "the superadmin can still see it before switching it on");
    assert.equal(preview.headers["content-type"], "image/png");
    assert.match(preview.headers["cache-control"], /no-store/);
    const shop = await createTenant();
    assert.equal((await api().get(`/api/v1/platform/payment-methods/${id}/qris`).set(bearer(shop.ownerToken))).status, 403, "a shop cannot reach the preview");

    const shown = await admin(sa, "put", `/${id}`, { isActive: true });
    assert.equal(shown.body.data.isActive, true);
    assert.equal(shown.body.data.qrisUrl, `/api/v1/public/payment-methods/${id}/qris`, "once shown, the public route serves it");
    assert.ok((await publicList()).some((m) => m.id === id && m.qrisUrl));

    const image = await api().get(`/api/v1/public/payment-methods/${id}/qris`).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(image.status, 200);
    assert.equal(image.headers["content-type"], "image/png");
    assert.equal(image.headers["x-content-type-options"], "nosniff");
    assert.ok(Buffer.compare(image.body, PNG) === 0, "the bytes are the ones uploaded");

    const jpg = await admin(sa, "put", `/${id}/qris`, { fileBase64: base64(jpeg) });
    assert.equal(jpg.status, 200, "a JPEG is fine too");
  });

  test("only real pictures of a sensible size are accepted", async () => {
    const sa = await createSuperadmin();
    const qris = (await admin(sa, "post", "", { kind: "qris", label: "QRIS Uji Gambar" })).body.data;
    const html = Buffer.from("<html><script>alert(1)</script>".padEnd(300, " "));
    assert.ok([400, 415].includes((await admin(sa, "put", `/${qris.id}/qris`, { fileBase64: base64(html) })).status), "a page is refused");
    assert.equal((await admin(sa, "put", `/${qris.id}/qris`, { fileBase64: base64(padded(Buffer.from("%PDF-1.4"))) })).status, 415, "a PDF is not a QR picture");
    assert.equal((await admin(sa, "put", `/${qris.id}/qris`, { fileBase64: base64(Buffer.concat([PNG, Buffer.alloc(1_600_000)])) })).status, 413, "too large");
    assert.equal((await admin(sa, "put", `/${qris.id}/qris`, { fileBase64: "%%%bukan base64 sama sekali%%%".repeat(10) })).status, 400);
    assert.equal((await admin(sa, "put", `/${qris.id}/qris`, { fileBase64: "abc" })).status, 400);

    const bank = (await admin(sa, "post", "", { kind: "bank", label: "Bank Uji Gambar", accountName: "A", accountNumber: "1" })).body.data;
    assert.equal((await admin(sa, "put", `/${bank.id}/qris`, { fileBase64: base64(PNG) })).body.code, "NOT_QRIS");
    assert.equal((await api().get(`/api/v1/public/payment-methods/${qris.id}/qris`)).status, 404, "nothing to show yet");
  });

  test("removing the picture hides the QRIS; switching a method off, or deleting it, takes it off the public page", async () => {
    const sa = await createSuperadmin();
    const qris = (await admin(sa, "post", "", { kind: "qris", label: "QRIS Hapus Gambar" })).body.data;
    await admin(sa, "put", `/${qris.id}/qris`, { fileBase64: base64(PNG) });
    await admin(sa, "put", `/${qris.id}`, { isActive: true });
    const removed = await admin(sa, "delete", `/${qris.id}/qris`);
    assert.deepEqual([removed.body.data.hasQris, removed.body.data.isActive], [false, false]);
    assert.equal((await api().get(`/api/v1/public/payment-methods/${qris.id}/qris`)).status, 404);

    const bank = (await admin(sa, "post", "", { kind: "ewallet", label: "GoPay Uji", accountName: "Klozer", accountNumber: "0812" })).body.data;
    await admin(sa, "put", `/${bank.id}`, { isActive: false });
    assert.ok(!(await publicList()).some((m) => m.id === bank.id));
    assert.equal((await admin(sa, "get", "")).body.data.some((m) => m.id === bank.id), true, "the team still sees it");
    assert.equal((await admin(sa, "delete", `/${bank.id}`)).status, 200);
    assert.equal((await admin(sa, "delete", `/${bank.id}`)).status, 404);
  });

  test("input is validated: a bank account needs its owner and number, labels and lengths are limited", async () => {
    const sa = await createSuperadmin();
    assert.equal((await admin(sa, "post", "", { kind: "bank", label: "Tanpa nomor" })).body.code, "ACCOUNT_REQUIRED");
    assert.equal((await admin(sa, "post", "", { kind: "crypto", label: "Koin" })).status, 400);
    assert.equal((await admin(sa, "post", "", { kind: "bank", label: "x" })).status, 400);
    assert.equal((await admin(sa, "post", "", { kind: "qris", label: "Q".repeat(81) })).status, 400);
    const bank = (await admin(sa, "post", "", { kind: "bank", label: "Bank Valid", accountName: "A", accountNumber: "1" })).body.data;
    assert.equal((await admin(sa, "put", `/${bank.id}`, {})).status, 400);
    assert.equal((await admin(sa, "put", `/${bank.id}`, { accountNumber: "" })).body.code, "ACCOUNT_REQUIRED");
    assert.equal((await admin(sa, "put", `/${bank.id}`, { instructions: "i".repeat(301) })).status, 400);
    assert.equal((await admin(sa, "put", "/999999", { label: "Tidak ada" })).status, 404);
  });

  test("order on the public page follows the sort order, and shops cannot manage any of it", async () => {
    const sa = await createSuperadmin();
    const t = await createTenant();
    const a = (await admin(sa, "post", "", { kind: "bank", label: "Urutan B", accountName: "A", accountNumber: "1", sortOrder: 20 })).body.data;
    const b = (await admin(sa, "post", "", { kind: "bank", label: "Urutan A", accountName: "A", accountNumber: "2", sortOrder: 10 })).body.data;
    const order = (await publicList()).filter((m) => [a.id, b.id].includes(m.id)).map((m) => m.label);
    assert.deepEqual(order, ["Urutan A", "Urutan B"]);

    for (const [method, path, body] of [["get", "", undefined], ["post", "", { kind: "bank", label: "Palsu", accountName: "A", accountNumber: "1" }], ["put", `/${a.id}`, { label: "Diubah" }], ["delete", `/${a.id}`, undefined], ["put", `/${a.id}/qris`, { fileBase64: base64(PNG) }]]) {
      const res = await api()[method](`/api/v1/platform/payment-methods${path}`).set(bearer(t.ownerToken)).send(body);
      assert.equal(res.status, 403, `${method} ${path}`);
    }
    assert.equal((await api().get("/api/v1/platform/payment-methods")).status, 401);
    assert.equal((await query("SELECT label FROM platform_payment_methods WHERE id = ?", [a.id]))[0].label, "Urutan B");
  });

  test("the public list shows no internal fields and every change is recorded for the team", async () => {
    const sa = await createSuperadmin();
    const bank = (await admin(sa, "post", "", { kind: "bank", label: "Catat Audit", accountName: "A", accountNumber: "9" })).body.data;
    await admin(sa, "put", `/${bank.id}`, { label: "Catat Audit 2" });
    await admin(sa, "delete", `/${bank.id}`);
    const actions = (await query("SELECT action FROM audit_logs WHERE entity_type = 'platform_payment_method' AND entity_id = ? ORDER BY id", [String(bank.id)])).map((r) => r.action);
    assert.deepEqual(actions, ["platform_payment.create", "platform_payment.update", "platform_payment.delete"]);
    const sample = (await publicList())[0];
    if (sample) assert.deepEqual(Object.keys(sample).sort(), ["accountName", "accountNumber", "dynamicQris", "hasQris", "id", "instructions", "isActive", "kind", "label", "merchantName", "qrisUrl", "sortOrder", "updatedAt"]);
  });
});
