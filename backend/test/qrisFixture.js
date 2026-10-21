import { crc16 } from "../src/utils/qris.js";

const tlv = (tag, value) => `${tag}${String(value.length).padStart(2, "0")}${value}`;

/** A made up static QRIS shaped like a real one: merchant account info, category, currency, country, name, city, extra data. */
export function staticQris(extra = [], merchant = "Toko Contoh") {
  const body =
    tlv("00", "01") +
    tlv("01", "11") +
    tlv("26", tlv("00", "ID.CO.EXAMPLE.WWW") + tlv("01", "ID1000000000001") + tlv("02", "ID1000000000001") + tlv("03", "UMI")) +
    tlv("51", tlv("00", "ID.CO.QRIS.WWW") + tlv("02", "ID1000000000001") + tlv("03", "UMI")) +
    tlv("52", "8999") +
    tlv("53", "360") +
    extra.map(([t, v]) => tlv(t, v)).join("") +
    tlv("58", "ID") +
    tlv("59", merchant) +
    tlv("60", "JAKARTA") +
    tlv("61", "10110") +
    tlv("62", tlv("07", "A01")) +
    "6304";
  return body + crc16(body);
}
