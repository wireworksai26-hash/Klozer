import "./setupEnv.js";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";

before(setupDatabase);
after(teardownDatabase);

const importRows = (token, rows) => api().post("/api/v1/leads/import").set(bearer(token)).send({ rows });
const leadsOf = (institutionId) => query("SELECT * FROM leads WHERE institution_id = ? ORDER BY id", [institutionId]);
let seq = 0;
const phone = () => `08123${String(Date.now() % 100000).padStart(5, "0")}${String(++seq).padStart(2, "0")}`;

describe("importing contacts in one go", () => {
  test("many contacts are created at once, with their status and VIP mark taken from the label", async () => {
    const t = await createTenant();
    const [a, b, c, d] = [phone(), phone(), phone(), phone()];
    const res = await importRows(t.ownerToken, [
      { name: "Budi", phone: a, city: "Solo", label: "Lead" },
      { name: "Siti", phone: b, city: "Jakarta", label: "Closing" },
      { name: "Andi", phone: c, label: "Pelanggan VIP" },
      { name: "Dewi", phone: d, label: "Reseller Jabar" },
    ]);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.created, 4);
    const rows = await leadsOf(t.institutionId);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    assert.equal(byName.Budi.status, "new");
    assert.equal(byName.Siti.status, "closing");
    assert.equal(byName.Andi.is_vip, 1);
    assert.equal(byName.Dewi.status, "new");
    assert.match(byName.Dewi.notes, /Label: Reseller Jabar/, "a label Klozer does not know is kept as a note");
    assert.equal(byName.Budi.phone_number, `62${a.slice(1)}`, "numbers are stored in international form");
    assert.equal(byName.Budi.marketing_consent, "unknown", "importing a contact is not consent to promotions");
    assert.equal(byName.Budi.source, "Impor Excel");
  });

  test("a number that already exists is skipped and its contact is not changed", async () => {
    const t = await createTenant();
    const n = phone();
    await importRows(t.ownerToken, [{ name: "Nama Lama", phone: n, city: "Solo", label: "Closing" }]);
    const again = await importRows(t.ownerToken, [{ name: "Nama Baru", phone: n, label: "Lead" }, { name: "Orang Lain", phone: phone() }]);
    assert.equal(again.body.data.created, 1);
    assert.equal(again.body.data.existing, 1);
    const [kept] = (await leadsOf(t.institutionId)).filter((r) => r.name.startsWith("Nama"));
    assert.equal(kept.name, "Nama Lama");
    assert.equal(kept.status, "closing");
  });

  test("duplicates inside the file, bad numbers and an empty name are handled and reported", async () => {
    const t = await createTenant();
    const n = phone();
    const res = await importRows(t.ownerToken, [
      { name: "A", phone: n },
      { name: "A lagi", phone: n },
      { name: "Salah", phone: "123" },
      { name: "Huruf", phone: "abcdefghij" },
      { phone: phone() },
    ]);
    assert.equal(res.body.data.created, 2);
    assert.equal(res.body.data.duplicates, 1);
    assert.equal(res.body.data.invalidCount, 2);
    assert.deepEqual(res.body.data.invalid.map((i) => i.row), [3, 4]);
    assert.ok((await leadsOf(t.institutionId)).some((r) => r.name === "Pelanggan"), "a contact without a name is still saved");
  });

  test("markup in a name is stored as text, never as an element", async () => {
    const t = await createTenant();
    await importRows(t.ownerToken, [{ name: '<img src=x onerror="alert(1)">Rudi', phone: phone() }]);
    const [row] = await leadsOf(t.institutionId);
    assert.ok(!row.name.includes("<img"), row.name);
    assert.ok(!/onerror/i.test(row.name), row.name);
  });

  test("the same number in two shops is two contacts, and one shop never sees the other's", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const n = phone();
    assert.equal((await importRows(a.ownerToken, [{ name: "Di A", phone: n }])).body.data.created, 1);
    assert.equal((await importRows(b.ownerToken, [{ name: "Di B", phone: n }])).body.data.created, 1);
    assert.equal((await leadsOf(a.institutionId)).length, 1);
    assert.equal((await leadsOf(b.institutionId))[0].name, "Di B");
  });

  test("a CS can import; finance cannot; too many rows or none are refused", async () => {
    const t = await createTenant();
    assert.equal((await importRows(t.csToken, [{ name: "Dari CS", phone: phone() }])).status, 201);
    assert.equal((await importRows(t.financeToken, [{ name: "X", phone: phone() }])).status, 403);
    assert.equal((await importRows(t.ownerToken, [])).status, 400);
    const many = Array.from({ length: 1001 }, (_, i) => ({ name: `N${i}`, phone: `0812000${String(i).padStart(5, "0")}` }));
    assert.equal((await importRows(t.ownerToken, many)).status, 400);
    assert.equal((await api().post("/api/v1/leads/import").send({ rows: [{ phone: phone() }] })).status, 401);
  });

  test("a thousand contacts import in one request", async () => {
    const t = await createTenant();
    const base = Date.now() % 10000;
    const rows = Array.from({ length: 1000 }, (_, i) => ({ name: `Massal ${i}`, phone: `0813${String(base).padStart(4, "0")}${String(i).padStart(4, "0")}`, label: i % 10 === 0 ? "VIP" : "Lead" }));
    const res = await importRows(t.ownerToken, rows);
    assert.equal(res.body.data.created, 1000);
    const [{ vip }] = await query("SELECT SUM(is_vip) AS vip FROM leads WHERE institution_id = ?", [t.institutionId]);
    assert.equal(Number(vip), 100);
  });
});

describe("marking a contact VIP by hand", () => {
  test("it is saved, can be lifted, and works only inside the shop", async () => {
    const t = await createTenant();
    const other = await createTenant();
    await importRows(t.ownerToken, [{ name: "Calon VIP", phone: phone() }]);
    const [lead] = await leadsOf(t.institutionId);
    assert.equal(lead.is_vip, 0);

    const on = await api().put(`/api/v1/leads/${lead.id}/vip`).set(bearer(t.csToken)).send({ is_vip: true });
    assert.equal(on.status, 200);
    assert.equal((await leadsOf(t.institutionId))[0].is_vip, 1);
    assert.equal((await api().get("/api/v1/leads").set(bearer(t.csToken))).body.items[0].is_vip, 1, "the list carries the mark");

    assert.equal((await api().put(`/api/v1/leads/${lead.id}/vip`).set(bearer(other.ownerToken)).send({ is_vip: false })).status, 404);
    assert.equal((await leadsOf(t.institutionId))[0].is_vip, 1, "another shop cannot change it");
    assert.equal((await api().put(`/api/v1/leads/${lead.id}/vip`).set(bearer(t.ownerToken)).send({ is_vip: "ya" })).status, 400);

    await api().put(`/api/v1/leads/${lead.id}/vip`).set(bearer(t.ownerToken)).send({ is_vip: false });
    assert.equal((await leadsOf(t.institutionId))[0].is_vip, 0);
  });
});
