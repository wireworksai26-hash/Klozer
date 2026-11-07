// Words, tones and small helpers shared by the delivery screens. Labels are Indonesian keys: they are looked up with
// t(label) where they are shown, so keep each one a plain string literal.

export const DELIVERY_STATUS = {
  assigned: { label: "Menunggu diambil", tone: "warning" },
  picked_up: { label: "Dalam perjalanan", tone: "brand" },
  delivered: { label: "Sudah diterima", tone: "success" },
  failed: { label: "Gagal diantar", tone: "danger" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

export const NOTICE_STATUS = {
  sent: { label: "PIC sudah diberi tahu", tone: "success" },
  failed: { label: "Pemberitahuan gagal", tone: "danger" },
  skipped: { label: "PIC belum diberi tahu", tone: "warning" },
  pending: { label: "Mengirim pemberitahuan", tone: "neutral" },
};

export const isOpen = (delivery) => delivery.status === "assigned" || delivery.status === "picked_up";

/** A link that opens the address in a maps app on the PIC's phone. */
export const mapsUrl = (address) => (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null);

/** A tel: link from a stored number (digits in international form, or as typed). */
export const telUrl = (phone) => {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits.startsWith("+") ? digits : `+${digits}`}` : null;
};
