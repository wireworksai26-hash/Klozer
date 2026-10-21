/**
 * QRIS (EMV merchant QR) helpers. A merchant's printed QRIS is "static": no amount, so the payer types one. A dynamic QRIS
 * is the same code with the amount inside, so the payer's app shows the exact amount and cannot change it. Making one
 * means: mark the code as dynamic (tag 01 = 12), put the amount in tag 54, and recompute the CRC (tag 63).
 */

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as QRIS requires, over the text up to and including "6304". */
export function crc16(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Split a payload into its top level [tag, value] pairs. Null when it is not well formed TLV. */
export function parseTlv(payload) {
  const items = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) return null;
    const tag = payload.slice(i, i + 2);
    const lengthText = payload.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) return null;
    const length = Number(lengthText);
    if (i + 4 + length > payload.length) return null;
    items.push([tag, payload.slice(i + 4, i + 4 + length)]);
    i += 4 + length;
  }
  return items;
}

const tlv = (tag, value) => `${tag}${String(value.length).padStart(2, "0")}${value}`;

/**
 * Check that a text is a QRIS payload that can be turned into dynamic ones: well formed, a correct CRC, a static code (no
 * amount yet) and a merchant name.
 * @returns {{ ok: true, merchantName: string, city: string|null } | { ok: false, reason: string }}
 */
export function inspectQris(payload) {
  const text = String(payload ?? "").trim();
  if (text.length < 40 || text.length > 700) return { ok: false, reason: "Isi kode QRIS tidak valid." };
  const items = parseTlv(text);
  if (!items) return { ok: false, reason: "Isi kode QRIS tidak valid." };
  const get = (tag) => items.find(([t]) => t === tag)?.[1];
  if (get("00") !== "01") return { ok: false, reason: "Ini bukan kode QRIS (format QR pembayaran Indonesia)." };
  const tail = items.at(-1);
  if (!tail || tail[0] !== "63" || tail[1].length !== 4) return { ok: false, reason: "Kode QRIS tidak lengkap." };
  if (crc16(text.slice(0, -4)) !== tail[1].toUpperCase()) return { ok: false, reason: "Kode QRIS rusak (CRC tidak cocok). Pindai ulang dari gambar yang lebih jelas." };
  if (get("54")) return { ok: false, reason: "Kode QRIS ini sudah memuat nominal. Pakai QRIS statis tanpa nominal." };
  const merchantName = get("59");
  if (!merchantName) return { ok: false, reason: "Kode QRIS tidak memuat nama merchant." };
  return { ok: true, merchantName, city: get("60") ?? null };
}

/**
 * The dynamic code for one amount. Everything of the merchant's code stays as it is; only the type, the amount and the CRC
 * change.
 * @param {string} staticPayload a payload that passed inspectQris
 * @param {number} amountIdr a whole amount in rupiah, above 0
 */
export function buildDynamicQris(staticPayload, amountIdr) {
  if (!Number.isInteger(amountIdr) || amountIdr < 1 || amountIdr > 999_999_999_999) throw new RangeError("Nominal QRIS harus bilangan bulat rupiah di atas 0.");
  const checked = inspectQris(staticPayload);
  if (!checked.ok) throw new Error(checked.reason);
  const items = parseTlv(String(staticPayload).trim()).filter(([tag]) => tag !== "63" && tag !== "54");
  const out = [];
  for (const [tag, value] of items) {
    out.push([tag, tag === "01" ? "12" : value]);
    // the amount belongs right after the currency (tag 53)
    if (tag === "53") out.push(["54", String(amountIdr)]);
  }
  if (!out.some(([tag]) => tag === "54")) {
    // no currency tag: keep the tags in order by putting the amount before the first tag that sorts after it
    const at = out.findIndex(([tag]) => tag > "54");
    out.splice(at === -1 ? out.length : at, 0, ["54", String(amountIdr)]);
  }
  const body = out.map(([tag, value]) => tlv(tag, value)).join("") + "6304";
  return body + crc16(body);
}
