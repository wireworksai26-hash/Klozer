// Contact statuses as the dashboard names them (see leadStatusToUi), in pipeline order.
export const PIPELINE = [
  { id: "new", label: "Baru" },
  { id: "follow_up", label: "Tindak lanjut" },
  { id: "closing", label: "Closing" },
  { id: "repeat_order", label: "Repeat" },
  { id: "idle", label: "Tidak aktif" },
  { id: "closed_lost", label: "Batal" },
];

// The same statuses as the server stores them, used by saved segments.
export const SEGMENT_STATUSES = [
  { id: "new", label: "Baru" },
  { id: "in_progress", label: "Tindak lanjut" },
  { id: "closing", label: "Closing" },
  { id: "repeat", label: "Repeat" },
  { id: "idle", label: "Tidak aktif" },
  { id: "closed_lost", label: "Batal" },
];

export const ORDER_STATUS_LABEL = {
  waiting_payment: "Menunggu bayar",
  paid: "Lunas",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Diterima",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

/** One line that says what a saved filter means, for the segment list. */
export function describeFilters(f, t) {
  const parts = [];
  if (f.statuses?.length) parts.push(f.statuses.map((s) => t(SEGMENT_STATUSES.find((x) => x.id === s)?.label ?? s)).join(" / "));
  if (f.vip === true) parts.push(t("VIP"));
  if (f.vip === false) parts.push(t("bukan VIP"));
  if (f.bought === true) parts.push(t("pernah membeli"));
  if (f.bought === false) parts.push(t("belum pernah membeli"));
  if (f.minSpent !== undefined) parts.push(t("belanja minimal Rp {amount}", { amount: Number(f.minSpent).toLocaleString("id-ID") }));
  if (f.maxSpent !== undefined) parts.push(t("belanja maksimal Rp {amount}", { amount: Number(f.maxSpent).toLocaleString("id-ID") }));
  if (f.inactiveDays !== undefined) parts.push(t("tidak aktif {days} hari", { days: f.inactiveDays }));
  if (f.consent === "opted_in") parts.push(t("setuju promosi"));
  if (f.consent === "opted_out") parts.push(t("menolak promosi"));
  if (f.consent === "unknown") parts.push(t("persetujuan belum diketahui"));
  return parts.length ? parts.join(", ") : t("Semua kontak");
}
