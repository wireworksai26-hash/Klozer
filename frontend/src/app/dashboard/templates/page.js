"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  FileTextIcon,
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  ZapIcon,
  CheckIcon,
  XIcon,
} from "@/components/icons";

export default function CsTemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [shortcutTitle, setShortcutTitle] = useState("");
  const [shortcutCode, setShortcutCode] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Greeting");

  const [templates, setTemplates] = useState([
    {
      id: "TPL-01",
      shortcut: "/salam",
      title: "Salam Pembuka Ramah (Sapaan Pagi/Siang)",
      category: "Greeting",
      body: "Halo kak {{nama}}! Selamat datang di {{nama_toko}}. Senang sekali bisa terhubung dengan kakak. Ada produk pilihan yang bisa saya bantu hari ini?",
    },
    {
      id: "TPL-02",
      shortcut: "/rekening",
      title: "Instruksi Pembayaran Rekening Resmi & QRIS",
      category: "Pembayaran",
      body: "Pembayaran dapat dilakukan melalui Rekening Resmi Toko an. {{nama_toko}}, atau scan QRIS Dinamis terlampir ya kak. Total: {{total_bayar}}.",
    },
    {
      id: "TPL-03",
      shortcut: "/form-order",
      title: "Formulir Pemesanan & Alamat Pengiriman",
      category: "Pemesanan",
      body: "Baik kak! Mohon bantu lengkapi data pengiriman berikut ya:\n- Nama Penerima:\n- No. WhatsApp:\n- Alamat Lengkap + Kelurahan/Kecamatan/Kota:\n- Kode Pos:\n- Pilihan Produk & Ukuran:",
    },
    {
      id: "TPL-04",
      shortcut: "/resi",
      title: "Konfirmasi Pengiriman & Nomor Resi",
      category: "Ekspedisi",
      body: "Paket pesanan kakak sudah dipickup oleh kurir {{ekspedisi}} dengan nomor resi: {{no_resi}}. Kakak bisa lacak perjalanan paket secara berkala. Terima kasih sudah belanja di toko kami kak!",
    },
    {
      id: "TPL-05",
      shortcut: "/diskon-grosir",
      title: "Penawaran Khusus Grosir / Reseller",
      category: "Promo",
      body: "Kabar gembira kak! Untuk pembelian minimal 10 pcs, kakak langsung mendapatkan diskon grosir 15% + gratis ongkir pulau Jawa. Mau kami buatkan nota proformanya sekarang?",
    },
  ]);

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!shortcutTitle.trim() || !templateBody.trim()) return;

    const newTpl = {
      id: `TPL-0${templates.length + 1}`,
      shortcut: shortcutCode.startsWith("/") ? shortcutCode : `/${shortcutCode}`,
      title: shortcutTitle,
      category: templateCategory,
      body: templateBody,
    };
    setTemplates([newTpl, ...templates]);
    setShowAddModal(false);
    setShortcutTitle("");
    setShortcutCode("");
    setTemplateBody("");
    alert("Template pesan cepat (Quick Reply) berhasil ditambahkan!");
  };

  const filtered = templates.filter((t) => {
    if (selectedCategory === "all") return true;
    return t.category === selectedCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <FileTextIcon className="w-3.5 h-3.5" />
              <span>Efisiensi CS & Quick Reply</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Template Pesan Cepat (Quick Reply)
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Daftar template pesan standar CS dengan shortcut (/kode) agar membalas chat pelanggan lebih cepat dan konsisten.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <FileTextIcon className="w-4 h-4" />
          <span>+ Buat Template Baru</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", "Greeting", "Pembayaran", "Pemesanan", "Ekspedisi", "Promo"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold border-none cursor-pointer transition-all ${
              selectedCategory === cat
                ? "bg-[#2545ff] text-white shadow-xs"
                : "bg-white text-[#5a6380] hover:text-[#1e2640] border border-[#ede8e2]"
            }`}
          >
            {cat === "all" ? "Semua Template" : cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#ede8e2] mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-extrabold px-2 py-0.5 rounded-md bg-[#edeffe] text-[#2545ff] border border-blue-200">
                    {t.shortcut}
                  </span>
                  <span className="font-extrabold text-[14px] text-[#1e2640]">{t.title}</span>
                </div>
                <span className="badge badge-lavender text-[10.5px]">{t.category}</span>
              </div>

              <div className="p-3.5 bg-[#fcfbf9] rounded-xl border border-[#ede8e2] text-[13px] text-[#1e2640] leading-relaxed whitespace-pre-line font-medium">
                {t.body}
              </div>
            </div>

            <div className="pt-3 border-t border-[#ede8e2] flex items-center justify-between">
              <span className="text-[11px] text-[#8f95a8]">Ketik {t.shortcut} di room chat WA</span>
              <button
                type="button"
                onClick={() => handleCopy(t.id, t.body)}
                className="px-3.5 py-1.5 rounded-xl text-[12px] font-bold bg-[#f5f4f2] hover:bg-[#edeffe] text-[#1e2640] hover:text-[#2545ff] border border-[#ede8e2] cursor-pointer transition-all"
              >
                {copiedId === t.id ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </span>
                ) : (
                  "Salin Pesan"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Template */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Tambah Template Quick Reply</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Judul Singkat *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Konfirmasi Pembayaran Lunas"
                  value={shortcutTitle}
                  onChange={(e) => setShortcutTitle(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-semibold focus:border-[#2545ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1e2640] block mb-1">Kode Shortcut *</label>
                  <input
                    type="text"
                    required
                    placeholder="/lunas"
                    value={shortcutCode}
                    onChange={(e) => setShortcutCode(e.target.value)}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-mono outline-none focus:border-[#2545ff]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1e2640] block mb-1">Kategori</label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                  >
                    <option value="Greeting">Greeting (Sapaan)</option>
                    <option value="Pembayaran">Pembayaran & Rekening</option>
                    <option value="Pemesanan">Format Pemesanan</option>
                    <option value="Ekspedisi">Ekspedisi & Resi</option>
                    <option value="Promo">Promo & Diskon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Isi Pesan WhatsApp *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tulis pesan cepat. Gunakan {{nama}}, {{total_bayar}}, {{no_resi}}..."
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-3 text-[#1e2640] outline-none font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
