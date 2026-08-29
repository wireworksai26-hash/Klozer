"use client";
import { useState } from "react";
import {
  TagIcon,
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  BotIcon,
  SlidersIcon,
} from "@/components/icons";

export default function SupervisorLabelsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("bg-amber-100 text-amber-800 border-amber-200");
  const [newAiCriteria, setNewAiCriteria] = useState("");

  const [labels, setLabels] = useState([
    {
      id: "TAG-01",
      name: "Pelanggan VIP",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      totalContacts: 142,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan memiliki total belanja > Rp 1.500.000 atau order lebih dari 3 kali berturut-turut.",
    },
    {
      id: "TAG-02",
      name: "Repeat Buyer",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      totalContacts: 520,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan melakukan pemesanan kedua kalinya (Repeat Order).",
    },
    {
      id: "TAG-03",
      name: "B2B / Grosir Seragam",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      totalContacts: 68,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika chat menanyakan harga kodi/lusin, pembuatan seragam kantor, atau minimal kuantitas 20 pcs.",
    },
    {
      id: "TAG-04",
      name: "Cold Lead (Tanya-Tanya)",
      badgeColor: "bg-blue-100 text-[#2545ff] border-blue-200",
      totalContacts: 840,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika pelanggan bertanya harga / ongkir tapi tidak melakukan checkout dalam 24 jam.",
    },
    {
      id: "TAG-05",
      name: "Potensi Resiko RTS COD",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      totalContacts: 34,
      aiAutoTagEnabled: true,
      aiPromptCriteria: "Pasang tag ini jika alamat tidak lengkap, nomor tidak aktif WhatsApp OTP, atau histori retur > 20%.",
    },
  ]);

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
          <div className="text-[28px] font-extrabold text-[#2545ff]">1,604 Kontak</div>
          <span className="text-[11.5px] font-bold text-emerald-600">46.8% dari Total Database</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Akurasi Deteksi NLP AI</div>
          <div className="text-[28px] font-extrabold text-purple-700">97.4%</div>
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

              <div className="flex items-center gap-2 self-end md:self-auto">
                <span className="badge badge-lavender text-[11px] flex items-center gap-1">
                  <BotIcon className="w-3 h-3" />
                  <span>AI Auto-Tag: AKTIF</span>
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#fcfbf9] rounded-xl border border-[#ede8e2] flex flex-col gap-1 text-[13px]">
              <span className="text-[11px] font-bold uppercase text-purple-700 flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Prompt Kriteria Deteksi AI (Bahasa Alami):</span>
              </span>
              <p className="text-[#1e2640] font-medium leading-relaxed italic">&ldquo;{lbl.aiPromptCriteria}&rdquo;</p>
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
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
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
                  <option value="bg-amber-100 text-amber-800 border-amber-200">Kuning Emas (VIP)</option>
                  <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Hijau (Repeat / Sukses)</option>
                  <option value="bg-purple-100 text-purple-800 border-purple-200">Ungu (B2B / Grosir)</option>
                  <option value="bg-blue-100 text-[#2545ff] border-blue-200">Biru (General / Regular)</option>
                  <option value="bg-rose-100 text-rose-800 border-rose-200">Merah (Warning / High Risk)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Prompt Kriteria AI Auto-Label</label>
                <textarea
                  rows={3}
                  placeholder="Tulis dalam bahasa alami instruksi kepada bot kapan label ini harus dipasang otomatis pada kontak..."
                  value={newAiCriteria}
                  onChange={(e) => setNewAiCriteria(e.target.value)}
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
                  Simpan Label & AI Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
