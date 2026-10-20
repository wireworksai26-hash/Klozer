// Words, tones and small pure helpers shared by the broadcast screens. Labels here are Indonesian keys:
// they are looked up with t(label) where they are shown, so keep each one a plain string literal.

export const CAMPAIGN_STATUS = {
  draft: { label: "Draf", tone: "neutral" },
  scheduled: { label: "Terjadwal", tone: "accent" },
  sending: { label: "Sedang dikirim", tone: "brand" },
  paused: { label: "Dijeda", tone: "warning" },
  completed: { label: "Selesai", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

// Why the server paused a campaign (pause_reason), and what the owner can do about it.
export const PAUSE_REASON = {
  manual: { label: "Dijeda oleh tim", help: "Lanjutkan kapan saja bila sudah siap." },
  template_problem: { label: "Templat bermasalah", help: "Templat tidak lagi disetujui Meta, atau Meta menolak isinya. Periksa statusnya di tab Templat, lalu lanjutkan." },
  channel_auth: { label: "Akun WhatsApp bermasalah", help: "Token kanal kedaluwarsa atau akun dikunci. Perbarui kanal di Saluran Chat, lalu lanjutkan." },
  out_of_credits: { label: "Kredit blast habis", help: "Tambah kredit, lalu lanjutkan. Pesan yang belum terkirim tetap menunggu." },
};

export const TEMPLATE_STATUS = {
  draft: { label: "Draf", tone: "neutral" },
  pending: { label: "Menunggu tinjauan Meta", tone: "warning" },
  approved: { label: "Disetujui", tone: "success" },
  rejected: { label: "Ditolak", tone: "danger" },
  paused: { label: "Dijeda Meta", tone: "warning" },
  disabled: { label: "Nonaktif", tone: "neutral" },
};

export const TEMPLATE_CATEGORY = {
  marketing: "Promosi",
  utility: "Info transaksi",
  authentication: "Kode verifikasi",
};

export const LANGUAGES = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
  { value: "en_US", label: "English (US)" },
  { value: "ms", label: "Melayu" },
  { value: "ar", label: "Arab" },
];

export const RECIPIENT_STATUS = {
  pending: { label: "Menunggu", tone: "neutral" },
  sending: { label: "Sedang dikirim", tone: "brand" },
  sent: { label: "Diterima Meta", tone: "brand" },
  delivered: { label: "Sampai", tone: "success" },
  read: { label: "Dibaca", tone: "success" },
  failed: { label: "Gagal", tone: "danger" },
  skipped: { label: "Dilewati", tone: "warning" },
};

export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "Baru" },
  { value: "in_progress", label: "Dalam proses" },
  { value: "closing", label: "Hampir closing" },
  { value: "repeat", label: "Pelanggan ulang" },
  { value: "idle", label: "Tidak aktif" },
  { value: "closed_lost", label: "Batal beli" },
];

export const ORDER_FILTER_OPTIONS = [
  { value: "", label: "Semua kontak" },
  { value: "never", label: "Belum pernah memesan" },
  { value: "has_order", label: "Pernah memesan" },
  { value: "has_paid_order", label: "Pernah membayar pesanan" },
];

export const FIELD_OPTIONS = [
  { value: "first_name", label: "Nama depan kontak" },
  { value: "name", label: "Nama lengkap kontak" },
  { value: "city", label: "Kota kontak" },
];

const PLACEHOLDER = /\{\{\s*(\d{1,2})\s*\}\}/g;

/** Placeholder numbers in order of first appearance: "Halo {{1}}, kode {{2}}" gives [1, 2]. */
export function placeholderNumbers(text = "") {
  const seen = [];
  for (const m of String(text).matchAll(PLACEHOLDER)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen;
}

/** The sentence a customer would read, with sample values filled where given. */
export function renderBody(bodyText, values = []) {
  return String(bodyText || "").replace(PLACEHOLDER, (whole, n) => (values[Number(n) - 1] ? values[Number(n) - 1] : whole));
}

/** Header, body, footer and buttons of a template as the API returns it (components follow Meta's shape). */
export function describeTemplate(template) {
  const components = template?.components || [];
  const header = components.find((c) => c.type === "HEADER");
  const footer = components.find((c) => c.type === "FOOTER");
  const buttons = components.find((c) => c.type === "BUTTONS")?.buttons || [];
  return {
    headerFormat: header?.format ? String(header.format).toLowerCase() : "none",
    headerText: header?.format === "TEXT" ? header.text : null,
    body: template?.bodyText || components.find((c) => c.type === "BODY")?.text || "",
    footer: footer?.text || null,
    buttons: buttons.map((b) => ({ type: String(b.type).toLowerCase(), text: b.text, url: b.url || null })),
  };
}

/** Rules Meta enforces at submission, checked here first so a typo does not cost a round trip. Returns Indonesian problems. */
export function templateProblems(input) {
  const problems = [];
  if (!/^[a-z0-9_]{1,100}$/.test(input.name || "")) problems.push("Nama hanya boleh huruf kecil, angka, dan garis bawah.");
  const body = String(input.body || "").trim();
  if (!body) problems.push("Isi pesan wajib diisi.");
  if (body.length > 1024) problems.push("Isi pesan maksimal 1024 karakter.");
  const numbers = placeholderNumbers(body);
  if (![...numbers].sort((a, b) => a - b).every((n, i) => n === i + 1)) problems.push("Variabel harus berurutan {{1}}, {{2}}, dan seterusnya tanpa lompat.");
  if (/^\s*\{\{/.test(body) || /\}\}\s*$/.test(body)) problems.push("Isi pesan tidak boleh diawali atau diakhiri variabel.");
  if (/\{\{\d+\}\}\s*\{\{\d+\}\}/.test(body)) problems.push("Dua variabel tidak boleh berdempetan.");
  if (numbers.length && body.length < numbers.length * 12) problems.push("Isi pesan terlalu pendek dibanding jumlah variabelnya.");
  if (numbers.length && (input.examples || []).filter((e) => String(e || "").trim()).length !== numbers.length) problems.push("Isi contoh nilai untuk setiap variabel. Meta mewajibkannya.");
  if (input.headerText && placeholderNumbers(input.headerText).length) problems.push("Judul tidak boleh berisi variabel: kampanye hanya mengisi variabel pada isi pesan.");
  for (const b of input.buttons || []) {
    if (!String(b.text || "").trim()) problems.push("Teks tombol wajib diisi.");
    if (b.type === "url" && !/^https:\/\/\S+$/.test(String(b.url || "").trim())) problems.push("Tombol tautan harus memakai alamat https://.");
  }
  return [...new Set(problems)];
}

/** Whether a template may be picked for a campaign: approved and not a verification-code template. */
export const isSendable = (template) => template.status === "approved" && template.category !== "authentication";
