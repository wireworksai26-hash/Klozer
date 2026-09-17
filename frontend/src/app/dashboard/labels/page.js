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
  const [newLabelColor, setNewLabelColor] = useState("bg-amber-100 text-amber-800 border-amber-200");
  const [newAiCriteria, setNewAiCriteria] = useState("");

  const [labels, setLabels] = useState([
    {
      id: "TAG-01",
      name: "Pelanggan VIP",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      totalContacts: 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan memiliki total belanja > Rp 1.500.000 atau order lebih dari 3 kali berturut-turut.",
    },
    {
      id: "TAG-02",
      name: "Repeat Buyer",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      totalContacts: 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan melakukan pemesanan kedua kalinya (Repeat Order).",
    },
    {
      id: "TAG-03",
      name: "B2B / Grosir Kuantitas Besar",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      totalContacts: 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika chat menanyakan harga grosir/partai besar, invoice proforma, atau pesanan kuantitas tinggi.",
    },
    {
      id: "TAG-04",
      name: "Cold Lead (Tanya Produk)",
      badgeColor: "bg-blue-100 text-[#2545ff] border-blue-200",
      totalContacts: 0,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan bertanya harga / ongkir tapi belum melakukan transaksi dalam 24 jam.",
    },
    {
      id: "TAG-05",
      name: "Potensi Resiko RTS COD",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      totalContacts: 0,
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
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5" />
              <span>Segmentasi & Tagging CRM</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Manajemen Label Pelanggan & Kriteria AI Auto-Label
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Buat kategori label pelanggan dan definisikan prompt kriteria deteksi otomatis oleh kecerdasan buatan (NLP).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <TagIcon className="w-4 h-4" />
          <span>+ Buat Label Baru</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Kategori Label</div>
          <div className="text-[28px] font-extrabold text-[#1e2640]">{labels.length} Kategori</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Semua Terintegrasi AI Auto-Tag</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Kontak Tersegmentasi</div>
          <div className="text-[28px] font-extrabold text-[#2545ff]">
            {totalSegmented.toLocaleString("id-ID")} Kontak
          </div>
          <span className={`text-[11.5px] font-bold ${totalSegmented > 0 ? "text-emerald-600" : "text-[#8f95a8]"}`}>
            {totalSegmented > 0 ? "Otomatis terindeks AI" : "Belum ada kontak terindeks"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Akurasi Deteksi NLP AI</div>
          <div className="text-[28px] font-extrabold text-purple-700">100%</div>
          <span className="text-[11.5px] font-bold text-purple-600">NVIDIA NIM Auto-Classifier</span>
        </div>
      </div>

      {/* Labels List & AI Prompts */}
      <div className="flex flex-col gap-4">
        {labels.map((lbl) => (
          <div key={lbl.id} className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#ede8e2]">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[12.5px] font-extrabold border ${lbl.badgeColor}`}>
                  {lbl.name}
                </span>
                <span className="text-[12.5px] text-[#5a6380] font-semibold">
                  {lbl.totalContacts} Kontak Memiliki Label Ini
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-blue-50 text-[#2545ff] border border-blue-100 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3 text-[#2545ff]" />
                  <span>AI Auto-Tag: AKTIF</span>
                </span>
              </div>
            </div>

            <div className="bg-[#fcfbf9] p-3.5 rounded-xl border border-[#ede8e2]">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-purple-800 mb-1">
                <SparklesIcon className="w-3 h-3 text-purple-600" />
                <span>Prompt Kriteria Deteksi AI (Bahasa Alami):</span>
              </div>
              <p className="text-[13px] text-[#1e2640] italic font-medium leading-relaxed">
                "{lbl.aiPromptCriteria}"
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Label */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Tambah Label & Kriteria AI Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama Label Tag *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Reseller Grosir Jawa Tengah"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-semibold focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Warna Badge</label>
                <select
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  <option value="bg-amber-100 text-amber-800 border-amber-200">Kuning / Amber (VIP)</option>
                  <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Hijau / Emerald (Repeat)</option>
                  <option value="bg-purple-100 text-purple-800 border-purple-200">Ungu / Purple (B2B / Grosir)</option>
                  <option value="bg-blue-100 text-[#2545ff] border-blue-200">Biru / Primary (General)</option>
                  <option value="bg-rose-100 text-rose-800 border-rose-200">Merah / Rose (Risk Alert)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">
                  Kriteria Deteksi AI Auto-Tag (Bahasa Alami)
                </label>
                <textarea
                  rows="3"
                  placeholder="Contoh: Pasang tag ini jika pelanggan bertanya paket reseller atau belanja di atas 50 pcs..."
                  value={newAiCriteria}
                  onChange={(e) => setNewAiCriteria(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none text-[13px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-[#5a6380] bg-[#f5f4f2] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-[13px] font-bold">
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
