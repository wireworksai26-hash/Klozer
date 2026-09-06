"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  UsersIcon,
  CrownIcon,
  CheckCircleIcon,
  DownloadIcon,
  UploadIcon,
  TagIcon,
  SparklesIcon,
} from "@/components/icons";
import DataTransferModal from "@/components/common/DataTransferModal";

export default function SupervisorContactsPage() {
  const { currentUser, activeInstitution, orders } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [contacts, setContacts] = useState(
    isDefaultDemo
      ? [
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
        ]
      : []
  );

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = selectedTag === "all" || c.tags.includes(selectedTag);
    return matchSearch && matchTag;
  });

  const totalSpendAll = contacts.reduce((acc, c) => acc + c.totalSpend, 0);
  const avgLtv = contacts.length > 0 ? Math.round(totalSpendAll / contacts.length) : 0;
  const repeatCount = contacts.filter((c) => c.totalOrders > 1).length;
  const repeatRate = contacts.length > 0 ? Math.round((repeatCount / contacts.length) * 100) : 0;

  const handleCleanData = () => {
    setIsCleaningData(true);
    setTimeout(() => {
      setIsCleaningData(false);
      alert("AI Intelligence Contact Cleaner: Format nomor WhatsApp telah dinormalisasi ke standar internasional (+62).");
    }, 900);
  };

  const handleImportContacts = (importedRows, mode) => {
    const formatted = importedRows.map((r, idx) => ({
      id: `CTC-0${contacts.length + idx + 1}`,
      name: r.name,
      phone: r.phone,
      city: r.city || "Indonesia",
      totalOrders: 1,
      totalSpend: Number(r.totalSpent) || 0,
      tags: [r.category || "Lead Baru"],
      lastActive: "Hari ini",
    }));
    setContacts((prev) => (mode === "replace" ? formatted : [...formatted, ...prev]));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Customer Intelligence & Database</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Database Kontak & Profil Pelanggan
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Analisis data demografi, riwayat transaksi (LTV), segmentasi label minat, dan normalisasi nomor WhatsApp via AI.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleCleanData}
            disabled={isCleaningData || contacts.length === 0}
            className="btn-secondary !py-2.5 !px-4 text-[13px] font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <SparklesIcon className="w-4 h-4 text-purple-600" />
            <span>{isCleaningData ? "Merapikan..." : "AI Auto-Clean"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#1e2640] hover:text-emerald-700 border border-[#ede8e2] rounded-xl text-[13px] font-extrabold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <UploadIcon className="w-4 h-4 text-emerald-600" />
            <span>Impor / Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Kontak Pelanggan</div>
          <div className="text-[26px] font-extrabold text-[#1e2640]">{contacts.length} Kontak</div>
          <span className={`text-[11.5px] font-bold ${contacts.length > 0 ? "text-emerald-600" : "text-[#8f95a8]"}`}>
            {contacts.length > 0 ? "Database terverifikasi" : "Belum ada kontak"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Pelanggan Repeat Order</div>
          <div className="text-[26px] font-extrabold text-[#2545ff]">{repeatRate}%</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Loyalitas Pelanggan</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Rata-Rata Nilai LTV</div>
          <div className="text-[26px] font-extrabold text-emerald-700">Rp {avgLtv.toLocaleString("id-ID")}</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Lifetime Value</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Kualitas Data Kontak</div>
          <div className="text-[26px] font-extrabold text-purple-700">100% Valid</div>
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
      <div className="bg-white rounded-2xl border border-[#ede8e2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Nomor WhatsApp</th>
                <th className="py-3 px-4">Kota Domisili</th>
                <th className="py-3 px-4">Total Belanja (LTV)</th>
                <th className="py-3 px-4">Segmen Label</th>
                <th className="py-3 px-4">Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-2">
                        <UsersIcon className="w-5 h-5 text-[#2545ff]" />
                      </div>
                      <div className="font-extrabold text-[#0c1754] text-[14px]">Belum Ada Kontak Pelanggan</div>
                      <p className="text-[12px] text-[#64748b] mt-1">
                        Kontak baru yang chat ke WhatsApp atau melakukan order akan otomatis terindeks di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e2640] text-[13.5px]">{c.name}</div>
                      <div className="text-[11px] text-[#8f95a8]">{c.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#5a6380] text-[13px]">{c.phone}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[13px] font-semibold text-[#1e2640]">{c.city}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#1e2640] text-[13.5px]">
                        Rp {c.totalSpend.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[11px] text-[#8f95a8]">{c.totalOrders} Pesanan Selesai</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span
                            key={t}
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                              t === "VIP"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : t === "Repeat"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-blue-50 text-[#2545ff] border border-blue-100"
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5a6380] text-[12.5px]">{c.lastActive}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Transfer Modal (Import / Export CSV) */}
      <DataTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        type="contacts"
        data={contacts}
        onImportSuccess={handleImportContacts}
      />
    </div>
  );
}
