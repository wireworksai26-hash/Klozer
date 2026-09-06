"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { ShieldCheckIcon, AlertTriangleIcon, UsersIcon, XIcon } from "@/components/icons";

export default function LeadsPage() {
  const { leads, addLead, updateLead, deleteLead } = useDashboard();

  const [view, setView] = useState("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    source: "Instagram Ads (Reels)",
    interest: "Kemeja Batik Modern",
    status: "new",
    cs: "Sarah Amalia",
    codScore: 85,
    estValue: 300000,
    notes: "",
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      phone: "+62 8",
      source: "Instagram Ads (Reels)",
      interest: "Kemeja Batik Modern",
      status: "new",
      cs: "Sarah Amalia",
      codScore: 85,
      estValue: 300000,
      notes: "",
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (l) => {
    setEditingLead(l);
    setFormData({
      name: l.name,
      phone: l.phone,
      source: l.source,
      interest: l.interest,
      status: l.status,
      cs: l.cs,
      codScore: l.codScore,
      estValue: l.estValue,
      notes: l.notes,
    });
  };

  const handleSaveLead = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      estValue: Number(formData.estValue),
      codScore: Number(formData.codScore),
      codRisk: Number(formData.codScore) > 80 ? "low" : Number(formData.codScore) > 60 ? "medium" : "high",
    };

    if (editingLead) {
      updateLead(editingLead.id, payload);
      setEditingLead(null);
    } else {
      addLead(payload);
      setShowAddModal(false);
    }
  };

  const getRiskBadge = (score, risk) => {
    if (risk === "low" || score >= 80) {
      return (
        <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Tingkat keberhasilan kirim COD tinggi">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>COD Aman ({score}%)</span>
        </span>
      );
    }
    if (risk === "medium" || score >= 60) {
      return (
        <span className="text-[11px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Perlu konfirmasi ulang sebelum kirim COD">
          <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
          <span>Sedang ({score}%)</span>
        </span>
      );
    }
    return (
      <span className="text-[11px] font-extrabold bg-red-100 text-red-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Riwayat retur tinggi, sarankan bayar QRIS">
        <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
        <span>Resiko RTS ({score}%)</span>
      </span>
    );
  };

  const stages = [
    { key: "new", label: "Lead Baru", color: "border-blue-500" },
    { key: "follow_up", label: "Sedang Follow-Up", color: "border-amber-500" },
    { key: "closing", label: "Minta Rekening / QRIS", color: "border-purple-500" },
    { key: "repeat_order", label: "VIP / Repeat Order", color: "border-emerald-500" },
  ];

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.interest.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">CRM & Distribusi Leads</h1>
          <p className="text-[13.5px] text-[#64748b]">Lacak calon pembeli WhatsApp, skor mitigasi resiko COD, dan penugasan CS.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#f0e9e1] shadow-xs">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer transition-all ${
                view === "kanban" ? "bg-[#2545ff] text-white shadow-xs" : "bg-transparent text-[#64748b]"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer transition-all ${
                view === "table" ? "bg-[#2545ff] text-white shadow-xs" : "bg-transparent text-[#64748b]"
              }`}
            >
              Tabel
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2"
          >
            <span>+</span>
            <span>Tambah Lead Baru</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#f0e9e1] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-3.5 py-2 w-full sm:w-[360px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#969696" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Cari nama pelanggan, nomor WA, produk minat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] text-[#0c1754] placeholder:text-[#969696] flex-1 font-medium"
          />
        </div>

        <span className="text-[12px] text-[#969696] hidden sm:inline">
          Total: <strong className="text-[#0c1754]">{filtered.length} Leads Terpantau</strong>
        </span>
      </div>

      {/* KANBAN BOARD VIEW */}
      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {stages.map((stage) => {
            const stageLeads = filtered.filter((l) => l.status === stage.key);
            return (
              <div key={stage.key} className="bg-[#f9f8f6] p-4 rounded-2xl border border-[#f0e9e1] flex flex-col gap-3 min-h-[420px]">
                
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-2.5 border-b-2 ${stage.color}`}>
                  <span className="text-[13px] font-bold text-[#0c1754]">{stage.label}</span>
                  <span className="text-[11px] font-extrabold bg-white text-[#2545ff] border border-[#f0e9e1] px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Lead Cards */}
                <div className="flex flex-col gap-3">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white p-4 rounded-xl border border-[#f0e9e1] shadow-xs hover:shadow-md transition-all flex flex-col gap-2 cursor-pointer"
                      onClick={() => handleOpenEdit(lead)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#2545ff] bg-[#eaebf8] px-2 py-0.5 rounded">
                          {lead.source}
                        </span>
                        {getRiskBadge(lead.codScore, lead.codRisk)}
                      </div>

                      <div>
                        <h4 className="text-[14px] font-bold text-[#0c1754]">{lead.name}</h4>
                        <div className="text-[12px] text-[#64748b] font-medium">{lead.phone}</div>
                      </div>

                      <div className="bg-[#f9f8f6] p-2 rounded-lg text-[11.5px] text-[#171417] border border-[#f0e9e1]">
                        <span className="text-[#969696] block">Minat Produk:</span>
                        <span className="font-bold">{lead.interest}</span> (Rp {lead.estValue.toLocaleString()})
                      </div>

                      {lead.notes && (
                        <p className="text-[11.5px] text-[#64748b] italic line-clamp-2">
                          "{lead.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[#f0e9e1] text-[11px] text-[#969696]">
                        <span>CS: <strong className="text-[#0c1754]">{lead.cs}</strong></span>
                        <span>{lead.lastInteraction}</span>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="py-8 text-center text-[12px] text-[#969696] italic">
                      Belum ada lead di tahap ini
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Calon Pembeli</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Sumber Iklan</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Minat Produk</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Mitigasi COD</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Tahap CRM</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">CS Bertugas</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9e1] text-[13.5px]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-3">
                          <UsersIcon className="w-6 h-6 text-[#2545ff]" />
                        </div>
                        <div className="font-extrabold text-[#0c1754] text-[15px]">Belum Ada Lead / Kontak</div>
                        <p className="text-[12.5px] text-[#64748b] mt-1 mb-4">
                          Kontak calon pembeli dari Meta Ads CAPI atau chat WhatsApp baru akan otomatis tercatat di sini.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="btn-primary !py-2 !px-4 text-[12.5px] font-bold"
                        >
                          + Tambah Lead Pertama
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#0c1754] text-[14px]">{l.name}</div>
                        <span className="font-mono text-[11px] font-bold text-[#64748b]">{l.phone}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-[12px] font-bold bg-[#eaebf8] text-[#2545ff] px-2.5 py-1 rounded-full">
                          {l.source}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-[#0c1754] font-medium">{l.interest}</td>
                      <td className="py-4 px-5">
                        {getRiskBadge(l.codScore, l.codRisk)}
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-bold text-[12px] bg-[#eaebf8] text-[#2545ff] px-2.5 py-0.5 rounded-full capitalize">
                          {l.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-medium text-[#171417]">{l.cs}</td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="px-2.5 py-1 text-[12px] font-bold text-[#2545ff] bg-[#eaebf8] hover:bg-[#2545ff] hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(l.id)}
                            className="px-2.5 py-1 text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Lead */}
      {(showAddModal || editingLead) && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#f0e9e1] animate-scale-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
              <h3 className="text-[18px] font-extrabold text-[#0c1754]">
                {editingLead ? "Edit Data Lead CRM" : "Tambah Calon Pembeli (Lead)"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLead(null);
                }}
                className="w-7 h-7 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] flex items-center justify-center text-[#64748b] border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="flex flex-col gap-3.5 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Nama Pelanggan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Nomor WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+62 812-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Sumber Kontak (Traffic)</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="Instagram Ads (Reels)">Instagram Ads (Reels)</option>
                    <option value="Facebook Ads (Feed)">Facebook Ads (Feed)</option>
                    <option value="TikTok Click to WA">TikTok Click to WA</option>
                    <option value="WhatsApp Direct Link">WhatsApp Direct Link</option>
                    <option value="Website Organic">Website Organic</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Tahap Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="new">Lead Baru Masuk</option>
                    <option value="follow_up">Sedang Follow-Up</option>
                    <option value="closing">Minta Rekening / QRIS</option>
                    <option value="repeat_order">VIP / Repeat Order</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Minat Produk</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kemeja Batik Modern"
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Estimasi Nilai (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.estValue}
                    onChange={(e) => setFormData({ ...formData, estValue: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Tugaskan ke CS</label>
                  <select
                    value={formData.cs}
                    onChange={(e) => setFormData({ ...formData, cs: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="Sarah Amalia">Sarah Amalia (CS Senior)</option>
                    <option value="Rizky Ramadhan">Rizky Ramadhan (CS Junior)</option>
                    <option value="Belum Ditugaskan">Belum Ditugaskan (Auto-Round Robin)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Skor Keberhasilan COD (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.codScore}
                    onChange={(e) => setFormData({ ...formData, codScore: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Catatan Tambahan</label>
                <textarea
                  rows="2"
                  placeholder="Kebutuhan khusus atau jadwal follow-up..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f0e9e1] mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLead(null);
                  }}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  {editingLead ? "Simpan Perubahan" : "Simpan Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[380px] p-5 shadow-2xl border border-[#f0e9e1] animate-scale-pop text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-[17px] font-extrabold text-[#0c1754] mb-1.5">Hapus Data Lead?</h3>
            <p className="text-[13px] text-[#64748b] mb-5">
              Data calon pembeli #{deleteConfirmId} akan dihapus dari sistem CRM.
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
                  deleteLead(deleteConfirmId);
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
