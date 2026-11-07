import "./setupEnv.js";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { detectCustomerStyle, styleBlock } from "../src/services/aiStyle.js";
import { buildCsSystemPrompt } from "../src/services/aiPrompt.js";

const prompt = (block) =>
  buildCsSystemPrompt({
    instName: "Toko Uji", instSector: "Bisnis", isInitialTurn: false, catalogList: "1. Kemeja | Rp 100.000", promoList: "Tidak ada promo.",
    bankList: "- BCA 123", bankTransferSummary: "BCA 123", instAddress: "Solo", instHours: "09.00-17.00", styleBlock: block,
  });

describe("reading how a customer writes", () => {
  test("a careful, polite customer is formal", () => {
    assert.equal(detectCustomerStyle(["Selamat siang, saya ingin menanyakan harga paket premium."]).formality, "formal");
    assert.equal(detectCustomerStyle(["Selamat pagi Bu, mohon informasi stok.", "Terima kasih atas informasinya."]).formality, "formal");
  });

  test("slang, laughter and emoji make a customer casual", () => {
    const style = detectCustomerStyle(["halo kak, ready ga? wkwk", "yg warna item ada gk", "makasih ya 😊"]);
    assert.equal(style.formality, "casual");
    assert.equal(style.usesEmoji, true);
  });

  test("short messages mean a to-the-point customer; one long story means a chatty one", () => {
    assert.equal(detectCustomerStyle(["harga?", "ada ukuran L", "ongkir ke solo"]).brevity, "terse");
    assert.equal(detectCustomerStyle(["ada ukuran L? harga?"]).brevity, "terse");
    const story = "Halo, jadi begini kak, saya itu lagi cari kado buat istri saya yang ulang tahun minggu depan, dia suka warna-warna lembut dan sebenarnya kemarin sempat lihat di instagram tapi lupa yang mana, bisa dibantu cari yang kira-kira cocok untuk dia?";
    assert.equal(detectCustomerStyle([story]).brevity, "chatty");
  });

  test("capital letters alone do not make a long chatty message formal", () => {
    const story = "Halo, jadi begini kak, saya itu lagi cari kado buat istri saya yang ulang tahun minggu depan, dia suka warna-warna lembut dan lupa yang mana, bisa dibantu cari?";
    assert.equal(detectCustomerStyle([story]).formality, "neutral");
  });

  test("a bare greeting says nothing about style", () => {
    const style = detectCustomerStyle(["halo kak"]);
    assert.equal(style.brevity, "normal");
    assert.equal(styleBlock(style), "");
  });

  test("a complaint is serious, and the serious flag wins over emoji", () => {
    const style = detectCustomerStyle(["Barang saya belum sampai sudah 2 minggu, saya kecewa 😡"]);
    assert.equal(style.serious, true);
    const block = styleBlock(style);
    assert.match(block, /serius atau kesal/);
    assert.match(block, /Tanpa emoji/);
    assert.doesNotMatch(block, /satu emoji yang pas boleh/);
  });

  test("only the last eight messages count, and junk input is harmless", () => {
    const old = Array.from({ length: 30 }, () => "Selamat siang, mohon informasi.");
    const style = detectCustomerStyle([...old, ...Array.from({ length: 8 }, () => "gk jadi wkwk")]);
    assert.equal(style.formality, "casual");
    assert.equal(detectCustomerStyle(null).samples, 0);
    assert.equal(detectCustomerStyle([null, undefined, "  "]).samples, 0);
    assert.equal(styleBlock(detectCustomerStyle([])), "");
  });
});

describe("the style block in the prompt", () => {
  test("a formal customer is told to be answered formally, and the block says it beats the default voice", () => {
    const block = styleBlock(detectCustomerStyle(["Selamat siang, saya ingin menanyakan harga."]));
    assert.match(block, /menulis formal/);
    assert.match(block, /MENANG atas gaya bawaan/);
  });

  test("a terse customer gets a short, direct answer", () => {
    assert.match(styleBlock(detectCustomerStyle(["harga?", "ada L", "ongkir solo"])), /to the point/);
  });

  test("the block lands in the system prompt after the owner persona, and the default voice yields to it", () => {
    const block = styleBlock(detectCustomerStyle(["Selamat siang, saya ingin menanyakan harga."]));
    const withBlock = prompt(block);
    assert.match(withBlock, /\[GAYA PELANGGAN INI\]/);
    assert.ok(withBlock.indexOf("[GAYA PELANGGAN INI]") < withBlock.indexOf("CARA NGOBROL"));
    assert.match(withBlock, /kalau ada bagian \[GAYA PELANGGAN INI\], ikuti bagian itu/);
    assert.doesNotMatch(prompt(""), /\[GAYA PELANGGAN INI\]\nDibaca/);
  });

  test("the prompt asks for a human marketer's voice and keeps the honesty rule", () => {
    const text = prompt("");
    assert.match(text, /marketing sungguhan/);
    assert.match(text, /jangan pernah berbohong/i);
    assert.match(text, /admin virtual berbasis AI/);
  });
});
