/**
 * Pure rules for deliveries: which orders can be handed to a PIC, how a delivery moves, how an order follows, and the
 * words sent to the PIC's phone. No database and no network, so the rules can be tested alone.
 */

export const ACTIVE_STATUSES = Object.freeze(["assigned", "picked_up"]);

/** Order statuses an order can have while it is being taken to the customer. */
const DELIVERABLE_ORDER = new Set(["paid", "processing", "shipped"]);

/**
 * Can this order be handed to a PIC now? A paid order can. A cash-on-delivery order can too, because the customer pays
 * the PIC at the door. Everything else (not paid yet, cancelled, already delivered) cannot.
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canAssignOrder(order) {
  if (order.fulfillment_type !== "delivery") return { ok: false, reason: "Pesanan ini diambil sendiri oleh pelanggan, bukan diantar." };
  if (DELIVERABLE_ORDER.has(order.status)) return { ok: true };
  if (order.status === "waiting_payment" && order.payment_method === "cod") return { ok: true };
  if (order.status === "waiting_payment") return { ok: false, reason: "Pesanan belum dibayar. Antar setelah dibayar, atau ubah cara bayarnya menjadi COD." };
  return { ok: false, reason: "Pesanan ini sudah selesai atau dibatalkan, jadi tidak perlu diantar." };
}

/** The statuses a delivery may move to from where it is, and by whom. */
const NEXT = Object.freeze({
  assigned: ["picked_up", "delivered", "failed", "cancelled"],
  picked_up: ["delivered", "failed", "cancelled"],
  delivered: [],
  failed: [],
  cancelled: [],
});

export const canMove = (from, to) => (NEXT[from] ?? []).includes(to);

/**
 * The order statuses to walk through so the order reflects the delivery: handing it over means shipped, handing it to the
 * customer means delivered. Steps follow ORDER_TRANSITIONS one at a time; an order that cannot get there is left alone.
 * @returns {string[]} the statuses to set, in order (empty when nothing should change)
 */
export function orderPathFor(orderStatus, target) {
  const chain = ["paid", "processing", "shipped", "delivered"];
  const from = chain.indexOf(orderStatus);
  const to = chain.indexOf(target);
  if (from < 0 || to < 0 || from >= to) return [];
  return chain.slice(from + 1, to + 1);
}

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;

/** The message the PIC gets on their phone. Plain text, short enough to read at a glance. */
export function assignmentMessage({ picName, orderNumber, recipientName, recipientPhone, address, items = [], codAmount = 0, note = "", shopName = "" }) {
  const lines = [`Halo ${String(picName || "").split(/\s+/)[0] || "kak"}, ada pengantaran baru${shopName ? ` dari ${shopName}` : ""}.`, "", `Pesanan: ${orderNumber}`];
  lines.push(`Penerima: ${recipientName || "-"}${recipientPhone ? ` (${recipientPhone})` : ""}`);
  lines.push(`Alamat: ${address || "-"}`);
  if (items.length) lines.push(`Barang: ${items.slice(0, 5).map((i) => `${i.quantity}x ${i.name}`).join(", ")}${items.length > 5 ? `, +${items.length - 5} lainnya` : ""}`);
  if (codAmount > 0) lines.push(`Tagih tunai (COD): ${rupiah(codAmount)}`);
  if (note) lines.push(`Catatan: ${note}`);
  lines.push("", "Buka dashboard Klozer untuk menandai sudah diambil atau diantar.");
  return lines.join("\n");
}

/** How the result of sending that message is recorded on the delivery. */
export function noticeOutcome({ hasPhone, result }) {
  if (!hasPhone) return { status: "skipped", detail: "Nomor HP PIC belum diisi." };
  if (!result) return { status: "failed", detail: "Pesan tidak terkirim." };
  if (result.mode === "sandbox_simulated") return { status: "skipped", detail: "Belum ada saluran WhatsApp yang terhubung." };
  if (result.success) return { status: "sent", detail: "Terkirim ke WhatsApp PIC." };
  return { status: "failed", detail: String(result.error || "Gagal mengirim ke WhatsApp.").slice(0, 190) };
}
