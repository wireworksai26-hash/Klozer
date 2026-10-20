/**
 * Everything the assistant says about an order, as fixed templates. Amounts, names and numbers are filled in from
 * database values; no language model writes (or rewrites) any of this text, so a total can never be "creatively"
 * wrong. Same casual voice as the rest of the assistant.
 */

export const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;

const itemLine = (l) => `- ${l.quantity} x ${l.name} = ${rupiah(l.subtotal)}`;

export const PAYMENT_LABELS = { qris: "QRIS", bank_transfer: "Transfer bank", cod: "COD (bayar di tempat)" };

const FIELD_LABELS = {
  name: "Nama penerima",
  phone: "Nomor HP penerima",
  address: "Alamat lengkap (jalan, RT/RW, kelurahan, kecamatan, kota)",
  postalCode: "Kode pos",
};

/** What the customer said that we could not use as asked (stock, unknown product). */
export function problemsText(problems) {
  const lines = [];
  for (const p of problems) {
    if (p.reason === "unknown") lines.push("Ada produk yang kakak sebut yang belum ada di katalog kami, jadi belum aku masukkan.");
    else if (p.reason === "out_of_stock") lines.push(`${p.name} lagi habis kak.`);
    else if (p.reason === "limited") lines.push(`Stok ${p.name} tinggal ${p.available}, jadi aku set ${p.available} ya.`);
  }
  return [...new Set(lines)].join("\n");
}

function cartBlock(lines) {
  return `${lines.map(itemLine).join("\n")}\nSubtotal: ${rupiah(lines.reduce((s, l) => s + l.subtotal, 0))}`;
}

export function askRecipientText({ lines, missing }) {
  const parts = [];
  parts.push(`Siap kak, aku catat ya:\n${cartBlock(lines)}`);
  parts.push(`Biar bisa diproses, tolong kirim:\n${missing.map((f) => `- ${FIELD_LABELS[f]}`).join("\n")}`);
  return parts.join("\n\n");
}

export const askItemsText = () => "Mau pesan produk yang mana kak, dan berapa banyak?";

export function shippingOptionsText({ options, city }) {
  const rows = options.map((o, i) => `${i + 1}. ${o.label} - ${rupiah(o.fee)}${o.eta ? ` (${o.eta})` : ""}`);
  return `Pilihan pengiriman${city ? ` ke ${city}` : ""}:\n${rows.join("\n")}\n\nBalas nomornya ya kak.`;
}

export function paymentOptionsText({ methods, total }) {
  const rows = methods.map((m, i) => `${i + 1}. ${PAYMENT_LABELS[m]}`);
  return `Total ${rupiah(total)}. Mau bayar pakai apa kak?\n${rows.join("\n")}\n\nBalas nomor atau namanya ya.`;
}

export function summaryText({ lines, shippingFee, total, recipient, fulfillmentType, courierLabel, eta, paymentMethod, notes }) {
  const rows = [lines.map(itemLine).join("\n")];
  rows.push(fulfillmentType === "pickup" ? "Ambil sendiri di toko" : `Ongkir${courierLabel ? ` (${courierLabel}${eta ? `, ${eta}` : ""})` : ""}: ${rupiah(shippingFee)}`);
  rows.push(`Total: ${rupiah(total)}`);
  rows.push(`Bayar: ${PAYMENT_LABELS[paymentMethod]}`);
  const to = [recipient.name, recipient.phone, fulfillmentType === "pickup" ? null : [recipient.address, recipient.city, recipient.postalCode].filter(Boolean).join(", ")].filter(Boolean).join(" | ");
  rows.push(`Penerima: ${to}`);
  if (notes) rows.push(`Catatan: ${notes}`);
  return `Cek dulu ya kak:\n${rows.join("\n")}\n\nSudah benar? Balas YA untuk lanjut, atau sebutkan yang mau diubah.`;
}

export const cancelledText = () => "Oke kak, pesanannya aku batalkan. Kalau nanti mau pesan lagi, tinggal chat ya 😊";

export const handoffShippingText = () => "Siap kak, pesanan kakak sudah aku catat. Untuk ongkirnya tim kami yang hitung dulu ya, nanti dilanjut dari sini 🙏";

export const handoffGenericText = () => "Pesanan kakak sudah aku catat, tapi untuk bagian ini aku bantu sambungkan ke tim kami ya biar tidak salah 🙏";

export function placedText({ orderNumber, total, paymentMethod, fulfillmentType, qris, accounts = [], qrisMinutes = 5 }) {
  const head = `Pesanan ${orderNumber} sudah dibuat ✅ Total ${rupiah(total)}.`;
  if (paymentMethod === "qris") {
    if (qris?.imageUrl) return `${head}\nScan QRIS ini ya kak: ${qris.imageUrl}\nBerlaku ${qrisMinutes} menit. Kalau sudah habis, balas "QRIS" nanti aku buatkan lagi.`;
    return `${head}\nQRIS-nya kami siapkan dulu ya kak, sebentar lagi dikirim oleh tim.`;
  }
  if (paymentMethod === "bank_transfer") {
    const rows = accounts.map((a) => `- ${a.bank}: ${a.accountNumber} a.n. ${a.holder}`).join("\n");
    return `${head}\nTransfer tepat ${rupiah(total)} ke:\n${rows}\n\nSetelah transfer, kirim foto buktinya di sini ya kak.`;
  }
  return fulfillmentType === "pickup" ? `${head}\nBayar saat ambil di toko ya kak. Nanti kami kabari kalau sudah siap.` : `${head}\nBayar ke kurir saat paket sampai ya kak. Pesananmu kami proses.`;
}

export function qrisRenewedText({ orderNumber, total, imageUrl, qrisMinutes = 5 }) {
  return imageUrl
    ? `QRIS baru untuk pesanan ${orderNumber} (${rupiah(total)}): ${imageUrl}\nBerlaku ${qrisMinutes} menit ya kak.`
    : `Aku minta tim kirim QRIS baru untuk pesanan ${orderNumber} ya kak 🙏`;
}

export function transferReminderText({ orderNumber, total, accounts }) {
  const rows = accounts.map((a) => `- ${a.bank}: ${a.accountNumber} a.n. ${a.holder}`).join("\n");
  return `Untuk pesanan ${orderNumber}, transfer tepat ${rupiah(total)} ke:\n${rows}\n\nSetelah itu kirim foto buktinya di sini ya kak.`;
}

export const askProofText = () => "Siap kak, boleh kirim foto bukti transfernya di sini ya, nanti kami cek 🙏";

export const optOutText = () => "Siap kak, aku tidak akan mengirim pengingat lagi, termasuk promo. Kalau butuh apa-apa, chat saja ya 🙏";

const ORDER_STATUS_TEXT = {
  waiting_payment: "menunggu pembayaran",
  paid: "sudah dibayar, sedang disiapkan",
  processing: "sedang diproses",
  shipped: "sudah dikirim",
  delivered: "sudah sampai",
  completed: "selesai",
  cancelled: "dibatalkan",
};

export function orderStatusText({ order, shipment, tracking }) {
  const rows = [`Pesanan ${order.order_number}: ${ORDER_STATUS_TEXT[order.status] || order.status}. Total ${rupiah(order.total_amount)}.`];
  if (shipment?.awb_number) rows.push(`Kurir ${shipment.courier_code}${shipment.service_name ? ` ${shipment.service_name}` : ""}, resi ${shipment.awb_number}.`);
  else if (["paid", "processing"].includes(order.status)) rows.push("Resinya belum ada, nanti kami kabari begitu paketnya dikirim.");
  if (tracking?.status) rows.push(`Status terakhir: ${tracking.status}${tracking.lastNote ? ` (${tracking.lastNote})` : ""}.`);
  return rows.join("\n");
}

export const paymentReceivedText = ({ orderNumber, total }) => `Pembayaran ${rupiah(total)} untuk pesanan ${orderNumber} sudah kami terima ✅ Pesananmu langsung kami proses ya kak. Makasih!`;

export function shippedText({ orderNumber, courier, service, awb }) {
  return `Kabar baik kak, pesanan ${orderNumber} sudah dikirim 📦\nKurir: ${[courier, service].filter(Boolean).join(" ")}\nResi: ${awb}\nKalau mau cek posisinya, tanya aja "resi" di sini ya.`;
}

/** Reminder texts. Step 1 is gentle, the last step says plainly that the order will be released. */
export function unpaidReminderText({ step, isLast, orderNumber, total, paymentMethod, autoCancelHours }) {
  const how = paymentMethod === "qris" ? 'Kalau QRIS-nya sudah habis, balas "QRIS" nanti aku buatkan lagi.' : paymentMethod === "bank_transfer" ? 'Kalau lupa rekeningnya, balas "transfer" ya.' : "";
  const release = isLast && autoCancelHours ? ` Pesanan ini kami simpan sampai ${autoCancelHours} jam dari pembuatan, setelah itu stoknya kami lepas.` : "";
  const opener = step <= 1 ? `Halo kak, pesanan ${orderNumber} (${rupiah(total)}) masih menunggu pembayaran nih.` : `Kak, pesanan ${orderNumber} (${rupiah(total)}) belum kami terima pembayarannya.`;
  return [opener, how, release.trim(), "Kalau ada kendala, kabari aku ya 🙏"].filter(Boolean).join(" ");
}

export function cartReminderText({ lines }) {
  const names = lines.slice(0, 3).map((l) => `${l.quantity} ${l.name}`).join(", ");
  return `Halo kak, tadi kakak pilih ${names}${lines.length > 3 ? ", dll" : ""}. Masih mau dilanjut? Tinggal balas "lanjut" dan aku bantu selesaikan 😊`;
}
