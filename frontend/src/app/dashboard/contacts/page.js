"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  UsersIcon,
  CrownIcon,
  CheckCircleIcon,
  DownloadIcon,
  TagIcon,
  SparklesIcon,
} from "@/components/icons";

export default function SupervisorContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [showImportModal, setShowImportModal] = useState(false);
  const [isCleaningData, setIsCleaningData] = useState(false);

  const [contacts, setContacts] = useState([
    {
      id: "CTC-01",
      name: "Fauzan Hadi",
      phone: "+62 819-2233-4455",
      city: "Surakarta",
      totalOrders: 6,
      totalSpend: 2450000,
      tags: ["VIP", "Repeat"],
      lastActive: "29 Agu 2026",
    },
    {
      id: "CTC-02",
      name: "Clarissa Putri",
      phone: "+62 812-9988-4433",
      city: "Jakarta Selatan",
      totalOrders: 3,
      totalSpend: 1350000,
      tags: ["Repeat", "Fashion"],
      lastActive: "29 Agu 2026",
    },
    {
      id: "CTC-03",
      name: "Dimas Anggara",
      phone: "+62 857-1122-9900",
      city: "Bandung",
      totalOrders: 1,
      totalSpend: 290000,
      tags: ["New Lead"],
      lastActive: "28 Agu 2026",
    },
    {
      id: "CTC-04",
      name: "Indah Permata",
      phone: "+62 878-4455-6677",
      city: "Surabaya",
      totalOrders: 0,
      totalSpend: 0,
      tags: ["Cold Lead", "Tanya Ongkir"],
      lastActive: "27 Agu 2026",
    },
  ]);

  const handleImportClean = (e) => {
    e.preventDefault();
    setIsCleaningData(true);
    setTimeout(() => {
      setIsCleaningData(false);
      setShowImportModal(false);
      alert("AI Data Cleaner sukses menormalisasi 140 nomor HP ke format +62 dan menghapus 4 duplikat!");
    }, 1500);
  };

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = selectedTag === "all" || c.tags.includes(selectedTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Master Database Kontak Pelanggan</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Daftar Kontak & Pelanggan (OTA)
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Database seluruh pelanggan, riwayat belanja (LTV), tag segmen otomatis, dan fitur Import Excel dengan AI Data Cleaner.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-[13px] font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Import Excel + AI Cleaner</span>
          </button>
          <button
            type="button"
            onClick={() => alert("Mengunduh seluruh database kontak ke CSV...")}
            className="btn-primary !py-2.5 !px-4 text-[13px] font-bold flex items-center gap-2 cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Kontak Pelanggan</div>
          <div className="text-[26px] font-extrabold text-[#1e2640]">3,420 Kontak</div>
          <span className="text-[11.5px] font-bold text-emerald-600">+124 Kontak Baru Minggu Ini</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Pelanggan Repeat Order</div>
          <div className="text-[26px] font-extrabold text-[#2545ff]">48.5%</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Loyalitas Tinggi (VIP)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Rata-Rata Nilai LTV</div>
          <div className="text-[26px] font-extrabold text-emerald-700">Rp 715,000</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Lifetime Value Pelanggan</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Kualitas Data Kontak</div>
          <div className="text-[26px] font-extrabold text-purple-700">99.8% Valid</div>
          <span className="text-[11.5px] font-bold text-purple-600">Nomor WhatsApp Terverifikasi</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#ede8e2] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Cari nama, nomor WhatsApp, kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-[13px] bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2 text-[#1e2640] outline-none w-full sm:w-[260px] focus:border-[#2545ff]"
          />

          <div className="flex items-center gap-1.5 bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-1.5">
            <TagIcon className="w-3.5 h-3.5 text-[#8f95a8]" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-transparent text-[12.5px] font-bold text-[#1e2640] outline-none cursor-pointer"
            >
              <option value="all">Semua Label Tag</option>
              <option value="VIP">Label: VIP</option>
              <option value="Repeat">Label: Repeat</option>
              <option value="New Lead">Label: New Lead</option>
              <option value="Cold Lead">Label: Cold Lead</option>
            </select>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-[#8f95a8]">
          Menampilkan <span className="text-[#2545ff]">{filtered.length}</span> Kontak
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nama Pelanggan</th>
              <th>Nomor WhatsApp</th>
              <th>Kota Domisili</th>
              <th>Total Belanja (LTV)</th>
              <th>Segmen Label</th>
              <th>Aktivitas Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-[#fcfbf9] transition-colors">
                <td>
                  <div className="font-bold text-[#1e2640] text-[13.5px]">{c.name}</div>
                  <div className="text-[11px] text-[#8f95a8]">{c.id}</div>
                </td>
                <td>
                  <span className="font-mono font-bold text-[#5a6380] text-[13px]">{c.phone}</span>
                </td>
                <td>
                  <span className="text-[13px] font-semibold text-[#1e2640]">{c.city}</span>
                </td>
                <td>
                  <div className="font-extrabold text-[#1e2640] text-[13.5px]">
                    Rp {c.totalSpend.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[11px] text-[#8f95a8]">{c.totalOrders} Pesanan Selesai</div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          t === "VIP"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : t === "Repeat"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="text-[12px] text-[#5a6380]">{c.lastActive}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: AI Import Cleaner */}
      {showImportModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <h3 className="text-[17px] font-extrabold text-[#1e2640]">Import Excel + AI Data Cleaner</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportClean} className="flex flex-col gap-4 text-[13px]">
              <div className="p-4 border-2 border-dashed border-[#ede8e2] rounded-xl bg-[#fcfbf9] text-center flex flex-col items-center justify-center gap-2">
                <DownloadIcon className="w-8 h-8 text-[#8f95a8]" />
                <span className="font-bold text-[#1e2640]">Pilih File Excel / CSV Kontak Anda</span>
                <span className="text-[11.5px] text-[#8f95a8]">Mendukung file .xlsx, .csv hingga 50.000 kontak</span>
                <input type="file" className="mt-2 text-[12px]" />
              </div>

              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 flex flex-col gap-1.5 text-[12px] text-purple-900">
                <span className="font-bold flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4 text-purple-700" />
                  <span>Fitur Otomatis AI Data Cleaner:</span>
                </span>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Mengubah format 0812... dan 62812... menjadi standar WhatsApp (+62)</li>
                  <li>Mendeteksi & menghapus baris nomor duplikat secara cerdas</li>
                  <li>Auto-assign label berdasarkan riwayat belanja dari kolom Excel</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCleaningData}
                  className="btn-primary !py-2 !px-5 text-[13px] font-bold flex items-center gap-2 cursor-pointer"
                >
                  {isCleaningData ? "Memproses Data AI..." : "Mulai Import & Bersihkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
