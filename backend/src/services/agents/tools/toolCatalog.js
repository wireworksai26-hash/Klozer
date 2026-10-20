/**
 * What an AI agent may be allowed to do besides answering. The names are the contract with the owner's settings
 * (`capabilities.tools`), so a name keeps its meaning. `kind: "read"` only looks things up; `"write"` changes something
 * (and is always recorded). Which tools an agent really has is the owner's choice per agent; none by default.
 */
export const TOOL_CATALOG = Object.freeze([
  { name: "check_stock", kind: "read", summary: "Cek harga dan stok produk", args: '{"query":"nama atau SKU produk"}' },
  { name: "lookup_order", kind: "read", summary: "Lihat status pesanan pelanggan yang sedang chat (bukan pelanggan lain)", args: '{"orderNumber":"opsional, kosongkan untuk pesanan terakhir"}' },
  { name: "create_task", kind: "write", summary: "Buat tugas untuk tim (hubungi lagi, cek stok ke gudang, dan sebagainya)", args: '{"title":"judul singkat","type":"follow_up | check_stock | call_customer | check_payment | other","note":"opsional","dueInMinutes":60,"priority":"low | normal | high"}' },
  { name: "handoff_to_human", kind: "write", summary: "Serahkan chat ini ke tim manusia setelah balasanmu terkirim", args: '{"reason":"alasan singkat"}' },
  { name: "consult_agent", kind: "read", summary: "Tanya agen AI lain di toko ini untuk bahan jawabanmu (pelanggan tidak melihatnya)", args: '{"agent":"nama agen","question":"pertanyaan lengkap"}' },
  { name: "transfer_to_agent", kind: "write", summary: "Pindahkan chat ini ke agen AI lain; pesan berikutnya ditangani agen itu", args: '{"agent":"nama agen","reason":"alasan singkat"}' },
]);

export const TOOL_NAMES = Object.freeze(TOOL_CATALOG.map((t) => t.name));
export const toolMeta = (name) => TOOL_CATALOG.find((t) => t.name === name) ?? null;

/** Tools that talk to another agent: only useful when the shop has a second active agent. */
export const AGENT_TOOLS = Object.freeze(["consult_agent", "transfer_to_agent"]);
