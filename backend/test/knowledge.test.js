import "./setupProof.js"; // env + an NVIDIA key (fetch is mocked below, nothing leaves the machine)
import { test, before, after, afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { api, bearer, createTenant, setupDatabase, teardownDatabase } from "./helpers.js";
import { query } from "../src/config/db.js";
import { invalidateAiSettingsCache } from "../src/services/platformSettings.js";
import { generateAiCsResponse } from "../src/services/aiBrainService.js";
import { KNOWLEDGE_LIMITS } from "../src/services/knowledge/knowledgeService.js";

before(setupDatabase);
after(teardownDatabase);
afterEach(() => {
  mock.restoreAll();
  invalidateAiSettingsCache();
});

const POLICY =
  "Kebijakan Retur\n\nBarang bisa diretur dalam 7 hari setelah diterima selama segel masih utuh. Ongkir retur ditanggung pembeli kecuali barang cacat produksi.\n\nGaransi\n\nSemua produk elektronik bergaransi toko 30 hari.";

const pdfOf = (line) => {
  const body = `BT /F1 14 Tf 20 100 Td (${line}) Tj ET`;
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 600 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${body.length}>>\nstream\n${body}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((o, i) => {
    const at = pdf.length;
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<</Root 1 0 R/Size ${objects.length + 1}>>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
};

const addText = (t, title, content) => api().post("/api/v1/knowledge/text").set(bearer(t.ownerToken)).send({ title, content });
const search = (t, q) => api().post("/api/v1/knowledge/search").set(bearer(t.ownerToken)).send({ query: q });

describe("documents", () => {
  test("a pasted document is stored, split, listed and found by a customer-style question", async () => {
    const t = await createTenant();
    const created = await addText(t, "SOP Retur dan Garansi", POLICY);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.sourceType, "text");
    assert.ok(created.body.data.chunkCount >= 1);

    const list = await api().get("/api/v1/knowledge").set(bearer(t.ownerToken));
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.usage.documents, 1);
    assert.equal(list.body.usage.maxDocuments, KNOWLEDGE_LIMITS.maxDocuments);

    const hit = await search(t, "bagaimana kalau mau retur barang?");
    assert.equal(hit.status, 200);
    assert.equal(hit.body.items[0].title, "SOP Retur dan Garansi");
    assert.match(hit.body.items[0].content, /diretur dalam 7 hari/);

    const miss = await search(t, "apakah ada bunga cicilan kartu kredit");
    assert.equal(miss.body.items.length, 0);
  });

  test("text is stored exactly as written (no HTML rewriting of '<', '>' or 'data:')", async () => {
    const t = await createTenant();
    const text = "Jam layanan: kalau jam < 17 dan > 09 kami buka. Kode data:abc123 dan ukuran <b>besar</b> tersedia.";
    const created = await addText(t, "Jam layanan", text);
    const doc = await api().get(`/api/v1/knowledge/${created.body.data.id}`).set(bearer(t.ownerToken));
    assert.equal(doc.body.data.text, text);
  });

  test("a PDF with a text layer is read; a text file is read; bad files are refused with a reason", async () => {
    const t = await createTenant();
    const send = (fileName, buffer, extra = {}) => api().post("/api/v1/knowledge/file").set(bearer(t.ownerToken)).send({ fileName, contentBase64: buffer.toString("base64"), ...extra });

    const pdf = await send("garansi.pdf", pdfOf("Garansi mesin 12 bulan"));
    assert.equal(pdf.status, 201);
    assert.equal(pdf.body.data.mimeType, "application/pdf");
    assert.equal(pdf.body.data.title, "garansi");
    assert.match((await search(t, "garansi mesin berapa bulan")).body.items[0].content, /Garansi mesin 12 bulan/);

    const txt = await send("sop.txt", Buffer.from("Pengiriman memakai JNE dan J&T. Estimasi 2 sampai 4 hari."), { title: "Pengiriman" });
    assert.equal(txt.status, 201);
    assert.equal(txt.body.data.title, "Pengiriman");

    const exe = await send("sop.txt", Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]));
    assert.equal(exe.status, 400);
    const word = await send("laporan.docx", Buffer.from("isi"));
    assert.equal(word.status, 400);
    const broken = await send("x.pdf", Buffer.from("%PDF-1.4 rusak"));
    assert.equal(broken.status, 400);
    const empty = await api().post("/api/v1/knowledge/file").set(bearer(t.ownerToken)).send({ fileName: "x.txt", contentBase64: "not base64 !!!" });
    assert.equal(empty.status, 400);
  });

  test("editing the text re-splits it; switching a document off hides it; deleting removes it", async () => {
    const t = await createTenant();
    const { body } = await addText(t, "Promo", "Promo gajian diskon 20 persen untuk semua produk fashion sampai akhir bulan.");
    const id = body.data.id;
    assert.ok((await search(t, "promo gajian diskon")).body.items.length > 0);

    const edited = await api().put(`/api/v1/knowledge/${id}`).set(bearer(t.ownerToken)).send({ content: "Gratis ongkir untuk pembelian di atas lima ratus ribu rupiah ke seluruh Jawa." });
    assert.equal(edited.status, 200);
    assert.equal((await search(t, "promo gajian diskon")).body.items.length, 0, "old text is gone");
    assert.ok((await search(t, "gratis ongkir pembelian")).body.items.length > 0, "new text is searchable");

    await api().put(`/api/v1/knowledge/${id}`).set(bearer(t.ownerToken)).send({ isActive: false });
    assert.equal((await search(t, "gratis ongkir pembelian")).body.items.length, 0);

    assert.equal((await api().delete(`/api/v1/knowledge/${id}`).set(bearer(t.ownerToken))).status, 200);
    assert.equal((await api().get(`/api/v1/knowledge/${id}`).set(bearer(t.ownerToken))).status, 404);
    const [{ n }] = await query("SELECT COUNT(*) AS n FROM knowledge_chunks WHERE document_id = ?", [id]);
    assert.equal(Number(n), 0, "chunks are removed with the document");
  });

  test("a tenant never sees, searches or changes another tenant's documents", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const { body } = await addText(a, "Rahasia A", "Margin keuntungan produk unggulan kami adalah empat puluh persen dari harga jual.");

    assert.equal((await search(b, "margin keuntungan produk unggulan")).body.items.length, 0);
    assert.equal((await api().get(`/api/v1/knowledge/${body.data.id}`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await api().put(`/api/v1/knowledge/${body.data.id}`).set(bearer(b.ownerToken)).send({ title: "x" })).status, 404);
    assert.equal((await api().delete(`/api/v1/knowledge/${body.data.id}`).set(bearer(b.ownerToken))).status, 404);
    assert.equal((await api().get("/api/v1/knowledge").set(bearer(b.ownerToken))).body.items.length, 0);
  });

  test("only owner and supervisor can manage documents, and the package can switch the feature off", async () => {
    const t = await createTenant();
    assert.equal((await api().get("/api/v1/knowledge").set(bearer(t.csToken))).status, 403);
    assert.equal((await api().get("/api/v1/knowledge")).status, 401);

    await query("UPDATE institutions SET features_json = JSON_OBJECT('knowledgeBase', false) WHERE id = ?", [t.institutionId]);
    const off = await api().get("/api/v1/knowledge").set(bearer(t.ownerToken));
    assert.equal(off.status, 403);
    assert.equal(off.body.code, "FEATURE_DISABLED");
  });

  test("the document ceiling is enforced", async () => {
    const t = await createTenant();
    const values = Array.from({ length: KNOWLEDGE_LIMITS.maxDocuments }, (_, i) => [t.institutionId, `Dokumen ${i}`, "isi dokumen contoh", 18, 1]);
    await query("INSERT INTO knowledge_documents (institution_id, title, source_text, char_count, chunk_count) VALUES ?", [values]);
    const res = await addText(t, "Satu lagi", "Dokumen tambahan yang melewati batas jumlah dokumen per toko.");
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "KNOWLEDGE_DOCUMENT_LIMIT");
  });

  test("validation: short content, missing title and empty updates are rejected", async () => {
    const t = await createTenant();
    assert.equal((await addText(t, "Judul", "pendek")).status, 400);
    assert.equal((await addText(t, "", POLICY)).status, 400);
    const { body } = await addText(t, "Ok", POLICY);
    assert.equal((await api().put(`/api/v1/knowledge/${body.data.id}`).set(bearer(t.ownerToken)).send({})).status, 400);
  });
});

describe("the assistant uses the documents", () => {
  const capture = () => {
    const prompts = [];
    mock.method(globalThis, "fetch", async (url, init) => {
      prompts.push(JSON.parse(init.body).messages[0].content);
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Siap kak" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } }) };
    });
    return prompts;
  };

  test("a relevant passage is placed in the prompt and reported as a source", async () => {
    const t = await createTenant();
    await addText(t, "SOP Retur dan Garansi", POLICY);
    const prompts = capture();

    const out = await generateAiCsResponse({ institutionId: t.institutionId, customerName: "Budi", messageText: "kalau mau retur barang bagaimana ya?" });
    assert.equal(out.intent, "ai_generated");
    assert.match(prompts[0], /\[REFERENSI TOKO/);
    assert.match(prompts[0], /diretur dalam 7 hari/);
    assert.deepEqual(out.sources.map((s) => s.title), ["SOP Retur dan Garansi"]);
  });

  test("an unrelated question adds nothing, and the feature switch removes it entirely", async () => {
    const t = await createTenant();
    await addText(t, "SOP Retur dan Garansi", POLICY);
    const prompts = capture();

    await generateAiCsResponse({ institutionId: t.institutionId, customerName: "Budi", messageText: "ada warna merah muda untuk tas ini?" });
    assert.doesNotMatch(prompts[0], /\[REFERENSI TOKO/);

    await query("UPDATE institutions SET features_json = JSON_OBJECT('knowledgeBase', false) WHERE id = ?", [t.institutionId]);
    await generateAiCsResponse({ institutionId: t.institutionId, customerName: "Budi", messageText: "kalau mau retur barang bagaimana ya?" });
    assert.doesNotMatch(prompts[1], /\[REFERENSI TOKO/);
  });

  test("a failing lookup never stops a reply", async () => {
    const t = await createTenant();
    const prompts = capture();
    await query("DROP TABLE knowledge_chunks");
    const out = await generateAiCsResponse({ institutionId: t.institutionId, customerName: "Budi", messageText: "kalau mau retur barang bagaimana ya?" });
    assert.equal(out.intent, "ai_generated");
    assert.equal(prompts.length, 1);
  });
});
