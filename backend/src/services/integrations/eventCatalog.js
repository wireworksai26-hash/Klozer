/**
 * Every event a tenant can subscribe a webhook to. The name is the contract: receivers match on it, so a name never
 * changes meaning; a new kind of event gets a new name.
 */
export const EVENTS = Object.freeze({
  "message.received": "Pelanggan mengirim pesan (semua kanal)",
  "message.sent": "Pesan keluar dari AI, CS, atau API",
  "contact.created": "Kontak baru (dari chat pertama, impor, atau API)",
  "contact.updated": "Data kontak diubah (nama, kota, status, catatan)",
  "contact.consent_changed": "Persetujuan promosi sebuah kontak berubah (termasuk berhenti)",
  "conversation.handoff": "Chat diserahkan dari AI ke manusia atau dikembalikan ke AI",
  "conversation.agent_changed": "Agen AI yang menangani chat berganti",
  "conversation.assigned": "Chat ditugaskan ke seorang agen",
  "task.created": "Tugas baru untuk tim (dari staf, agen AI, atau aturan otomatis)",
  "task.updated": "Tugas berubah (penanggung jawab, status, tenggat, isi)",
  "task.completed": "Tugas selesai",
  "task.overdue": "Tugas melewati tenggat (satu kali per tugas)",
  "order.created": "Pesanan baru (dashboard, chat AI, atau API)",
  "order.paid": "Pesanan dibayar",
  "order.status_changed": "Status pesanan berubah",
  "shipment.updated": "Kurir, resi, atau status pengiriman diperbarui",
  "broadcast.completed": "Kampanye broadcast selesai",
  "broadcast.paused": "Kampanye broadcast dijeda (token, templat, atau kredit)",
  "template.status_changed": "Status templat WhatsApp berubah (disetujui, ditolak, dst.)",
  ping: "Uji koneksi dari dashboard",
});

export const EVENT_TYPES = Object.freeze(Object.keys(EVENTS));

/** `["*"]` subscribes to everything (except the connection test, which always goes to the endpoint being tested). */
export const matchesSubscription = (events, type) => events.includes("*") ? type !== "ping" : events.includes(type);
