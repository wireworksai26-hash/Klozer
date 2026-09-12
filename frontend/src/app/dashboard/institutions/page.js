"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { BuildingIcon, CrownIcon, AlertTriangleIcon, CheckCircleIcon, XIcon } from "@/components/icons";

export default function InstitutionsPage() {
  const { institutions, addInstitution, updateInstitution, toggleInstitutionModule, deleteInstitution } = useDashboard();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInst, setEditingInst] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State with ~14 Feature Toggles
  const [formData, setFormData] = useState({
    name: "",
    sector: "Fashion & Retail",
    owner: "",
    email: "",
    phone: "",
    tier: "Pro Plan",
    quotaMax: 50000,
    modules: {
      personaAi: true,
      autoLabel: true,
      printReceipt: true,
      baileys: false,
      instagram: true,
      csBlast: true,
      publicBooking: false,
      stockManagement: true,
      picFeature: true,
      qris: true,
      voiceAi: true,
      antiFraud: true,
      metaCapi: true,
      multiCs: true,
    },
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      sector: "Fashion & Retail",
      owner: "",
      email: "",
      phone: "",
      tier: "Pro Plan",
      quotaMax: 50000,
      modules: {
        personaAi: true,
        autoLabel: true,
        printReceipt: true,
        baileys: false,
        instagram: true,
        csBlast: true,
        publicBooking: false,
        stockManagement: true,
        picFeature: true,
        qris: true,
        voiceAi: true,
        antiFraud: true,
        metaCapi: true,
        multiCs: true,
      },
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (inst) => {
    setEditingInst(inst);
    setFormData({
      name: inst.name,
      sector: inst.sector,
      owner: inst.owner,
      email: inst.email,
      phone: inst.phone,
      tier: inst.tier,
      quotaMax: inst.quotaMax,
      modules: { ...inst.modules },
    });
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingInst) {
      updateInstitution(editingInst.id, formData);
      setEditingInst(null);
    } else {
      addInstitution(formData);
      setShowAddModal(false);
    }
  };

  const filtered = institutions.filter((inst) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (inst.name?.toLowerCase() || "").includes(s) ||
      (inst.owner?.toLowerCase() || "").includes(s) ||
      (inst.id?.toLowerCase() || "").includes(s);
    const matchSector = selectedSector === "all" || (inst.sector?.toLowerCase() || "").includes(selectedSector.toLowerCase());
    return matchSearch && matchSector;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Super Admin Feature</span>
            </span>
            <span className="text-[12px] text-[#969696]">• Multi-Tenant Control</span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Manajemen Institusi & Merchant
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kelola data institusi terdaftar, kuota pesan WhatsApp Cloud API, dan saklar modul fitur aktif.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span>
          <span>Tambah Institusi Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#f0e9e1] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-3.5 py-2 w-full sm:w-[320px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#969696" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Cari nama institusi, owner, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] text-[#0c1754] placeholder:text-[#969696] flex-1 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[12px] font-bold text-[#64748b] whitespace-nowrap">Sektor:</span>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="text-[12.5px] font-bold bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl px-3 py-1.5 text-[#0c1754] outline-none"
          >
            <option value="all">Semua Sektor ({institutions.length})</option>
            <option value="Fashion">Fashion & Retail</option>
            <option value="Beauty">Beauty & Skincare</option>
            <option value="Sosial">Lembaga Sosial & ZISWAF</option>
            <option value="Kuliner">Kuliner & F&B</option>
          </select>
        </div>
      </div>

      {/* Institutions Table with Interactive Module Toggles */}
      <div className="bg-white rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Institusi & Owner</th>
                <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Sektor & Paket</th>
                <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Penggunaan Kuota WA</th>
                <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Modul Aktif (Toggles)</th>
                <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Status</th>
                <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e9e1] text-[13.5px]">
              {filtered.map((inst) => {
                const quotaPercent = Math.round((inst.quotaUsed / inst.quotaMax) * 100);
                return (
                  <tr key={inst.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#0c1754] text-[14px] flex items-center gap-1.5">
                        <BuildingIcon className="w-4 h-4 text-[#2545ff]" />
                        <span>{inst.name}</span>
                      </div>
                      <div className="text-[12px] text-[#64748b] flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[#2545ff] font-bold">{inst.id}</span>
                        <span>•</span>
                        <span>{inst.owner} ({inst.phone})</span>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-medium text-[#171417]">{inst.sector}</div>
                      <span className="inline-block mt-0.5 text-[11px] font-extrabold bg-[#eaebf8] text-[#2545ff] px-2 py-0.5 rounded-full">
                        {inst.tier}
                      </span>
                    </td>

                    <td className="py-4 px-5 min-w-[180px]">
                      <div className="flex justify-between text-[11.5px] font-bold mb-1 text-[#0c1754]">
                        <span>{inst.quotaUsed.toLocaleString()} / {inst.quotaMax.toLocaleString()}</span>
                        <span>{quotaPercent}%</span>
                      </div>
                      <div className="w-full bg-[#f0e9e1] rounded-full h-1.5 overflow-hidden">
                        <div
                          style={{ width: `${quotaPercent}%` }}
                          className={`h-full rounded-full ${
                            quotaPercent > 80 ? "bg-amber-500" : "bg-[#2545ff]"
                          }`}
                        />
                      </div>
                    </td>

                    {/* Interactive Feature Module Toggles (~14 Toggles) */}
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
                        {[
                          { key: "personaAi", label: "Persona" },
                          { key: "autoLabel", label: "AutoLabel" },
                          { key: "printReceipt", label: "Nota" },
                          { key: "baileys", label: "Baileys" },
                          { key: "instagram", label: "IG" },
                          { key: "csBlast", label: "Blast" },
                          { key: "publicBooking", label: "Booking" },
                          { key: "stockManagement", label: "Stok" },
                          { key: "picFeature", label: "PIC" },
                          { key: "qris", label: "QRIS" },
                          { key: "voiceAi", label: "Voice AI" },
                          { key: "antiFraud", label: "Anti-Struk" },
                          { key: "metaCapi", label: "CAPI" },
                          { key: "multiCs", label: "Multi-CS" },
                        ].map((m) => {
                          const isEnabled = inst.modules?.[m.key] ?? false;
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => toggleInstitutionModule(inst.id, m.key)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border transition-all cursor-pointer ${
                                isEnabled
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
                                  : "bg-[#f5f4f2] text-[#8f95a8] border-[#ede8e2] opacity-50 line-through"
                              }`}
                              title={`Klik untuk toggle modul ${m.label}`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Aktif</span>
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(inst)}
                          className="px-2.5 py-1 text-[12px] font-bold text-[#2545ff] bg-[#eaebf8] hover:bg-[#2545ff] hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(inst.id)}
                          className="px-2.5 py-1 text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Institution */}
      {(showAddModal || editingInst) && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[540px] p-6 shadow-2xl border border-[#f0e9e1] animate-scale-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
              <h3 className="text-[18px] font-extrabold text-[#0c1754]">
                {editingInst ? "Edit Data Institusi / Merchant" : "Tambah Institusi / Merchant Baru"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingInst(null);
                }}
                className="w-7 h-7 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] flex items-center justify-center text-[#64748b] border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Nama Usaha / Institusi *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Toko Batik Solo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Sektor Usaha</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="Fashion & Retail">Fashion & Retail</option>
                    <option value="Beauty & Healthcare">Beauty & Healthcare</option>
                    <option value="Lembaga Sosial & Donasi">Lembaga Sosial & Donasi</option>
                    <option value="Kuliner & F&B">Kuliner & F&B</option>
                    <option value="Properti & Jasa">Properti & Jasa</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Paket Langganan</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="Starter">Starter (10.000 Pesan)</option>
                    <option value="Pro Plan">Pro Plan (50.000 Pesan)</option>
                    <option value="Enterprise">Enterprise (100.000+ Pesan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Nama Pemilik (Owner)</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Nomor WhatsApp Cloud</label>
                  <input
                    type="text"
                    required
                    placeholder="+62 812-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Email Akun Administrator</label>
                <input
                  type="email"
                  required
                  placeholder="admin@brand.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                />
              </div>

              <div className="pt-2">
                <label className="font-bold text-[#0c1754] block mb-2">Hak Akses Modul Fitur (Master Data Toggle):</label>
                <div className="grid grid-cols-2 gap-2 bg-[#f9f8f6] p-3.5 rounded-xl border border-[#f0e9e1] max-h-[220px] overflow-y-auto">
                  {[
                    { key: "personaAi", label: "Persona AI CS" },
                    { key: "autoLabel", label: "Auto-Label AI" },
                    { key: "printReceipt", label: "Cetak Nota / Invoice" },
                    { key: "baileys", label: "Baileys WhatsApp" },
                    { key: "instagram", label: "Instagram Direct DM" },
                    { key: "csBlast", label: "CS Broadcast Blast" },
                    { key: "publicBooking", label: "Public Booking / Form" },
                    { key: "stockManagement", label: "Stock Management" },
                    { key: "picFeature", label: "PIC Round Robin" },
                    { key: "qris", label: "Dynamic QRIS In-Chat" },
                    { key: "voiceAi", label: "Voice Note AI (Whisper)" },
                    { key: "antiFraud", label: "Anti-Fraud Struk Forensics" },
                    { key: "metaCapi", label: "Meta Ads CAPI Tracking" },
                    { key: "multiCs", label: "Multi-CS Department" },
                  ].map((m) => (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer text-[12px] font-medium text-[#171417]">
                      <input
                        type="checkbox"
                        checked={formData.modules?.[m.key] ?? false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            modules: { ...formData.modules, [m.key]: e.target.checked },
                          })
                        }
                        className="accent-[#2545ff]"
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f0e9e1] mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingInst(null);
                  }}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  {editingInst ? "Simpan Perubahan" : "Tambahkan Institusi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-2xl border border-[#f0e9e1] animate-scale-pop text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-[17px] font-extrabold text-[#0c1754] mb-1.5">Hapus Data Institusi?</h3>
            <p className="text-[13px] text-[#64748b] mb-5">
              Apakah Anda yakin ingin menghapus institusi ini? Semua kuota pesan dan konfigurasi modul akan dinonaktifkan.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-outline !py-2 !px-4 text-[13px]"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteInstitution(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] border-none cursor-pointer shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
