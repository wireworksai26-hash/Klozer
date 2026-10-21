import { test, describe } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { buildDynamicQris, crc16, inspectQris, parseTlv } from "../src/utils/qris.js";
import { decodeQrFromImage } from "../src/utils/qrisDecode.js";
import { staticQris } from "./qrisFixture.js";

describe("QRIS dynamic codes", () => {
  test("the CRC is CRC-16/CCITT-FALSE (the standard check value)", () => {
    assert.equal(crc16("123456789"), "29B1");
  });

  test("a static code is accepted and its merchant read", () => {
    const checked = inspectQris(staticQris());
    assert.deepEqual([checked.ok, checked.merchantName, checked.city], [true, "Toko Contoh", "JAKARTA"]);
  });

  test("a dynamic code carries the amount, is marked dynamic, keeps the merchant and has a valid CRC", () => {
    const base = staticQris();
    const dynamic = buildDynamicQris(base, 115037);
    const tags = parseTlv(dynamic);
    const get = (t) => tags.find(([x]) => x === t)?.[1];
    assert.equal(get("01"), "12", "dynamic");
    assert.equal(get("54"), "115037", "the amount");
    assert.equal(get("59"), "Toko Contoh");
    assert.deepEqual(tags.map(([t]) => t), ["00", "01", "26", "51", "52", "53", "54", "58", "59", "60", "61", "62", "63"], "tags stay in order, the amount right after the currency");
    assert.equal(crc16(dynamic.slice(0, -4)), dynamic.slice(-4), "valid CRC");
    // everything else of the merchant's code is untouched
    for (const t of ["26", "51", "52", "53", "58", "59", "60", "61", "62"]) assert.equal(get(t), parseTlv(base).find(([x]) => x === t)[1]);
  });

  test("a different amount gives a different code, the same amount the same code", () => {
    const base = staticQris();
    assert.notEqual(buildDynamicQris(base, 1000), buildDynamicQris(base, 1001));
    assert.equal(buildDynamicQris(base, 5000), buildDynamicQris(base, 5000));
  });

  test("bad input is refused: damaged CRC, not a QRIS, a code that already has an amount, a bad amount", () => {
    const base = staticQris();
    const damaged = base.slice(0, -4) + (base.endsWith("0000") ? "FFFF" : "0000");
    assert.equal(inspectQris(damaged).ok, false);
    assert.match(inspectQris(damaged).reason, /CRC/);
    assert.equal(inspectQris("hello world, this is not a payment code at all").ok, false);
    assert.equal(inspectQris("").ok, false);
    assert.equal(inspectQris(staticQris([["54", "10000"]])).ok, false, "already carries an amount");
    assert.throws(() => buildDynamicQris(base, 0), RangeError);
    assert.throws(() => buildDynamicQris(base, 10.5), RangeError);
    assert.throws(() => buildDynamicQris(base, -5), RangeError);
    assert.throws(() => buildDynamicQris("bukan qris", 1000));
  });

  test("a code is read back out of a picture of it, PNG, and a dynamic code survives the round trip", async () => {
    const dynamic = buildDynamicQris(staticQris(), 250123);
    const png = await QRCode.toBuffer(dynamic, { errorCorrectionLevel: "M", margin: 4, width: 420 });
    assert.equal(decodeQrFromImage(png, "image/png"), dynamic);
    assert.equal(decodeQrFromImage(Buffer.from("bukan gambar"), "image/png"), null);
    assert.equal(decodeQrFromImage(png, "image/webp"), null, "WebP is not read");
  });
});
