import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TOPICS, MAX_LISTED_PRODUCTS, MAX_WORDS, ambiguousText, catalogText, detectTopic, greetingText, infoText, matchProducts, paymentText, productText, thanksText } from "../src/services/fastpath/fastPathModel.js";

const products = [
  { id: 1, name: "Kemeja Batik", price: 150000, stock: 10 },
  { id: 2, name: "Kemeja Batik Anak", price: 120000, stock: 0 },
  { id: 3, name: "Sarung Tenun", price: 90000, stock: 4 },
  { id: 4, name: "Kain Batik Tulis Lasem 2 Meter", price: 520000, stock: 24 },
];
const topicOf = (text, ctx = {}) => detectTopic(text, { products, ...ctx })?.topic ?? null;

describe("which messages are fast questions", () => {
  test("a greeting on its own", () => {
    for (const text of ["halo", "Halo kak", "assalamualaikum", "selamat pagi kak", "p", "hai min", "Permisi"]) assert.equal(topicOf(text), "greeting", text);
  });

  test("a greeting with a question is not only a greeting", () => {
    assert.notEqual(topicOf("halo kak mau tanya harga sarung tenun"), "greeting");
    assert.equal(topicOf("halo kak bisa kirim ke luar kota?"), null);
  });

  test("a thank you on its own, not one with a complaint attached", () => {
    for (const text of ["makasih kak", "terima kasih banyak ya", "oke makasih", "thanks min", "siap makasih"]) assert.equal(topicOf(text), "thanks", text);
    assert.equal(topicOf("makasih tapi barangnya rusak"), null);
    assert.equal(topicOf("terima kasih, tapi kapan sampai?"), null);
  });

  test("where to pay", () => {
    for (const text of ["rekeningnya berapa ya", "no rek nya apa kak", "bisa bayar pakai apa?", "transfer kemana ya", "ada qris?", "cara bayar gimana"]) assert.equal(topicOf(text), "payment", text);
  });

  test("a payment already made belongs to the order flow", () => {
    assert.equal(topicOf("sudah transfer ya kak"), null);
    assert.equal(topicOf("udah bayar barusan"), null);
  });

  test("the product list", () => {
    for (const text of ["list produk dong", "ada produk apa aja", "katalognya mana", "daftar harga", "jual apa aja kak"]) assert.equal(topicOf(text), "catalog", text);
  });

  test("the price or stock of one product, named by its whole name or by one clear word", () => {
    assert.deepEqual(detectTopic("harga kemeja batik berapa?", { products }).products.map((p) => p.id), [1]);
    assert.deepEqual(detectTopic("harga kemeja batik anak", { products }).products.map((p) => p.id), [2]);
    assert.deepEqual(detectTopic("sarung tenun ready?", { products }).products.map((p) => p.id), [3]);
    assert.deepEqual(detectTopic("berapa harga sarung", { products }).products.map((p) => p.id), [3]);
    assert.deepEqual(detectTopic("kain lasem stok ada?", { products }).products.map((p) => p.id), [4]);
  });

  test("an unclear product name lists the candidates, and an unknown product is not a fast question", () => {
    assert.deepEqual(detectTopic("harga kemeja?", { products }).products.map((p) => p.id).sort(), [1, 2]);
    assert.equal(topicOf("harga jaket berapa"), null);
    assert.equal(topicOf("berapa ya"), null);
    assert.equal(topicOf("harga ongkir ke bandung"), null);
  });

  test("address and opening hours", () => {
    assert.deepEqual(detectTopic("alamat tokonya dimana kak?", { products }), { topic: "info", info: "address" });
    assert.deepEqual(detectTopic("jam buka berapa?", { products }), { topic: "info", info: "hours" });
    assert.deepEqual(detectTopic("alamat dan jam buka", { products }), { topic: "info", info: "both" });
  });

  test("a message that asks two different things is a conversation", () => {
    assert.equal(topicOf("rekening sama alamat dong"), null);
    assert.equal(topicOf("list produk dan rekeningnya"), null);
  });

  test("orders, order status, long messages and empty ones are never fast", () => {
    assert.equal(topicOf("mau beli kemeja batik 2 pcs"), null);
    assert.equal(topicOf("pesan sarung tenun"), null);
    assert.equal(topicOf("resi saya mana ya"), null);
    assert.equal(topicOf("pesanan saya sampai mana"), null);
    assert.equal(topicOf(""), null);
    assert.equal(topicOf("   "), null);
    const long = `rekening ${"kata ".repeat(MAX_WORDS)}`;
    assert.equal(topicOf(long), null);
  });

  test("a topic the shop switched off is left to the normal flow", () => {
    assert.equal(topicOf("rekeningnya berapa", { topics: { ...DEFAULT_TOPICS, payment: false } }), null);
    assert.equal(topicOf("halo", { topics: { ...DEFAULT_TOPICS, greeting: false } }), null);
    assert.equal(topicOf("list produk", { topics: { ...DEFAULT_TOPICS, catalog: false } }), null);
  });

  test("matching ignores case, punctuation and extra spaces", () => {
    assert.equal(topicOf("  REKENING,  nya!!  berapa?? "), "payment");
    assert.deepEqual(matchProducts("HARGA   Kemeja-Batik!", products).map((p) => p.id), [1]);
  });
});

describe("what is said back", () => {
  test("the payment answer lists every account, and QRIS only when the shop has it", () => {
    const accounts = [{ bank: "BCA", accountNumber: "1234567890", holder: "Toko Batik" }, { bank: "Mandiri", accountNumber: "9876543210", holder: "Toko Batik" }];
    const text = paymentText({ accounts, qris: false });
    assert.match(text, /- BCA: 1234567890 a\.n\. Toko Batik/);
    assert.match(text, /- Mandiri: 9876543210/);
    assert.doesNotMatch(text, /QRIS/);
    assert.match(paymentText({ accounts, qris: true }), /QRIS/);
    assert.match(text, /bukti pembayaran/);
  });

  test("the list is cut at a sensible length and says how many more there are", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Produk ${i}`, price: 10000, stock: 1 }));
    const text = catalogText({ products: many, total: 30 });
    assert.equal(text.split("\n").filter((l) => /^\d+\./.test(l)).length, MAX_LISTED_PRODUCTS);
    assert.match(text, /Masih ada 18 produk lain/);
    assert.match(catalogText({ products: products.slice(0, 2), total: 2 }), /Mau pesan yang mana kak\?/);
    assert.match(catalogText({ products, total: 4 }), /Kemeja Batik Anak: Rp 120\.000 \(stok habis\)/);
  });

  test("a product answer gives price and stock, and says so when it is sold out", () => {
    assert.equal(productText({ product: products[0] }), "Kemeja Batik: Rp 150.000, stok tersedia 10. Mau pesan kak? Sebut jumlahnya ya.");
    assert.equal(productText({ product: products[1] }), "Kemeja Batik Anak: Rp 120.000, stoknya sedang habis.");
    assert.match(ambiguousText({ products: products.slice(0, 2) }), /Maksud kakak yang mana\?\n- Kemeja Batik: Rp 150\.000\n- Kemeja Batik Anak: Rp 120\.000 \(stok habis\)/);
  });

  test("address and hours are answered only when the shop has given them", () => {
    assert.equal(infoText({ kind: "address", address: "Jl. Mawar 5, Solo", hours: null }), "Alamat kami: Jl. Mawar 5, Solo");
    assert.equal(infoText({ kind: "hours", address: null, hours: "09.00-17.00" }), "Jam buka: 09.00-17.00");
    assert.equal(infoText({ kind: "hours", address: "Jl. Mawar 5", hours: null }), null);
    assert.equal(infoText({ kind: "both", address: "Jl. Mawar 5", hours: null }), null, "half an answer is not a fast answer");
    assert.equal(infoText({ kind: "both", address: "Jl. Mawar 5", hours: "09.00-17.00" }), "Alamat kami: Jl. Mawar 5\nJam buka: 09.00-17.00");
  });

  test("the greeting uses the shop's own words when it has them", () => {
    assert.match(greetingText({ botName: "Sari", shopName: "Toko Batik" }), /Toko Batik, aku Sari/);
    assert.equal(greetingText({ greeting: "Halo kak! Selamat datang." }), "Halo kak! Selamat datang.");
    assert.match(thanksText(), /Sama-sama kak/);
  });

  test("no emoji and no em dash in what customers read", () => {
    const texts = [greetingText({ shopName: "T" }), thanksText(), paymentText({ accounts: [], qris: true }), catalogText({ products, total: 4 }), productText({ product: products[0] }), ambiguousText({ products }), infoText({ kind: "address", address: "x" })];
    for (const text of texts) assert.doesNotMatch(text, /[—\u{1F300}-\u{1FAFF}]/u);
  });
});
