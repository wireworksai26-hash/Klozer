"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  TagIcon,
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  BotIcon,
  SlidersIcon,
  XIcon,
} from "@/components/icons";

export default function SupervisorLabelsPage() {
  const { currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("bg-warning-100 text-warning-800 border-warning-200");
  const [newAiCriteria, setNewAiCriteria] = useState("");

  const [labels, setLabels] = useState([
    {
      id: "TAG-01",
      name: "Pelanggan VIP",
      badgeColor: "bg-warning-100 text-warning-800 border-warning-200",
      totalContacts: isDefaultDemo ? 142 : 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan memiliki total belanja > Rp 1.500.000 atau order lebih dari 3 kali berturut-turut.",
    },
    {
      id: "TAG-02",
      name: "Repeat Buyer",
      badgeColor: "bg-success-100 text-success-800 border-success-200",
      totalContacts: isDefaultDemo ? 520 : 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan melakukan pemesanan kedua kalinya (Repeat Order).",
    },
    {
      id: "TAG-03",
      name: "B2B / Grosir Kuantitas Besar",
      badgeColor: "bg-accent-100 text-accent-800 border-accent-200",
      totalContacts: isDefaultDemo ? 68 : 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika chat menanyakan harga grosir/partai besar, invoice proforma, atau pesanan kuantitas tinggi.",
    },
    {
      id: "TAG-04",
      name: "Cold Lead (Tanya Produk)",
      badgeColor: "bg-brand-soft text-brand border-brand-soft",
      totalContacts: isDefaultDemo ? 840 : 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan bertanya harga / ongkir tapi belum melakukan transaksi dalam 24 jam.",
    },
    {
      id: "TAG-05",
      name: "Potensi Resiko RTS COD",
      badgeColor: "bg-danger-100 text-danger-800 border-danger-200",
      totalContacts: isDefaultDemo ? 34 : 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika alamat tidak lengkap, nomor tidak aktif WhatsApp OTP, atau histori retur > 20%.",
    },
  ]);

  const totalSegmented = labels.reduce((sum, l) => sum + (l.totalContacts || 0), 0);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    const newTag = {
      id: `TAG-0${labels.length + 1}`,
      name: newLabelName,
      badgeColor: newLabelColor,
      totalContacts: 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: newAiCriteria || "Kriteria AI belum dikonfigurasi.",
    };
    setLabels([...labels, newTag]);
    setShowAddModal(false);
    setNewLabelName("");
    setNewAiCriteria("");
    alert("Label baru & kriteria NLP Auto-Label AI berhasil disimpan!");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-micro font-bold uppercase tracking-wider bg-brand-soft text-brand px-2.5 py-0.5 rounded-full border border-brand-soft flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5" />
              <span>Segmentasi & Tagging CRM</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Manajemen Label Pelanggan & Kriteria AI Auto-Label
          </h1>
          <p className="text-label text-fg-muted">
            Buat kategori label pelanggan dan definisikan prompt kriteria deteksi otomatis oleh kecerdasan buatan (NLP).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-label font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <TagIcon className="w-4 h-4" />
          <span>+ Buat Label Baru</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Total Kategori Label</div>
          <div className="text-heading-md font-bold text-fg">{labels.length} Kategori</div>
          <span className="text-micro font-bold text-success-600">Semua Terintegrasi AI Auto-Tag</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Kontak Tersegmentasi</div>
          <div className="text-heading-md font-bold text-brand">
            {totalSegmented.toLocaleString("id-ID")} Kontak
          </div>
          <span className={`text-micro font-bold ${totalSegmented > 0 ? "text-success-600" : "text-fg-subtle"}`}>
            {totalSegmented > 0 ? "Otomatis terindeks AI" : "Belum ada kontak terindeks"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Akurasi Deteksi NLP AI</div>
          <div className="text-heading-md font-bold text-accent-700">100%</div>
          <span className="text-micro font-bold text-accent-600">NVIDIA NIM Auto-Classifier</span>
        </div>
      </div>

      {/* Labels List & AI Prompts */}
      <div className="flex flex-col gap-4">
        {labels.map((lbl) => (
          <div key={lbl.id} className="bg-white p-5 rounded-2xl border border-line shadow-xs flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-caption font-bold border ${lbl.badgeColor}`}>
                  {lbl.name}
                </span>
                <span className="text-caption text-fg-muted font-semibold">
                  {lbl.totalContacts} Kontak Memiliki Label Ini
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-micro font-bold bg-brand-soft text-brand border border-brand-soft flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3 text-brand" />
                  <span>AI Auto-Tag: AKTIF</span>
                </span>
              </div>
            </div>

            <div className="bg-soft p-3.5 rounded-xl border border-line">
              <div className="flex items-center gap-1.5 text-micro font-bold uppercase text-accent-800 mb-1">
                <SparklesIcon className="w-3 h-3 text-accent-600" />
                <span>Prompt Kriteria Deteksi AI (Bahasa Alami):</span>
              </div>
              <p className="text-label text-fg italic font-medium leading-relaxed">
                &ldquo;{lbl.aiPromptCriteria}&rdquo;
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Label */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-line animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="text-body font-bold text-fg">Tambah Label & Kriteria AI Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-sunken text-fg-subtle hover:text-fg flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5 text-label">
              <div>
                <label className="font-bold text-fg block mb-1">Nama Label Tag *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Reseller Grosir Jawa Tengah"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full bg-sunken border border-line rounded-xl p-2.5 text-fg outline-none font-semibold focus:border-brand"
                />
              </div>

              <div>
                <label className="font-bold text-fg block mb-1">Warna Badge</label>
                <select
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-full bg-sunken border border-line rounded-xl p-2.5 text-fg outline-none font-bold"
                >
                  <option value="bg-warning-100 text-warning-800 border-warning-200">Kuning / Amber (VIP)</option>
                  <option value="bg-success-100 text-success-800 border-success-200">Hijau / Emerald (Repeat)</option>
                  <option value="bg-accent-100 text-accent-800 border-accent-200">Ungu / Purple (B2B / Grosir)</option>
                  <option value="bg-brand-soft text-brand border-brand-soft">Biru / Primary (General)</option>
                  <option value="bg-danger-100 text-danger-800 border-danger-200">Merah / Rose (Risk Alert)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-fg block mb-1">
                  Kriteria Deteksi AI Auto-Tag (Bahasa Alami)
                </label>
                <textarea
                  rows="3"
                  placeholder="Contoh: Pasang tag ini jika pelanggan bertanya paket reseller atau belanja di atas 50 pcs..."
                  value={newAiCriteria}
                  onChange={(e) => setNewAiCriteria(e.target.value)}
                  className="w-full bg-sunken border border-line rounded-xl p-2.5 text-fg outline-none text-label"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-label font-bold text-fg-muted bg-sunken hover:bg-line rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-label font-bold">
                  Simpan Label
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
