"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { ShieldCheckIcon, AlertTriangleIcon, UsersIcon, XIcon } from "@/components/icons";
import { relativeTimeKey } from "@/utils/mappers.mjs";

export default function LeadsPage() {
  const { leads, addLead, updateLead, deleteLead, teamMembers, t } = useDashboard();
  const ago = (iso) => {
    const r = relativeTimeKey(iso);
    return t(r.key, r.vars);
  };
  const salesStaff = teamMembers.filter((m) => m.status === "active" && ["cs", "supervisor", "owner"].includes(m.roleKey));

  const [view, setView] = useState("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    source: "WhatsApp Direct Link",
    interest: "",
    status: "new",
    cs: "",
    codScore: 85,
    estValue: 300000,
    notes: "",
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      phone: "+62 8",
      source: "WhatsApp Direct Link",
      interest: "",
      status: "new",
      cs: "",
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
        <span className="text-caption font-bold bg-success-100 text-success-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap" title={t("Tingkat keberhasilan kirim COD tinggi")}>
          <ShieldCheckIcon className="w-3.5 h-3.5 text-success-600" />
          <span>{t("COD Aman")} ({score}%)</span>
        </span>
      );
    }
    if (risk === "medium" || score >= 60) {
      return (
        <span className="text-caption font-bold bg-warning-100 text-warning-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap" title={t("Perlu konfirmasi ulang sebelum kirim COD")}>
          <AlertTriangleIcon className="w-3.5 h-3.5 text-warning-600" />
          <span>{t("Sedang")} ({score}%)</span>
        </span>
      );
    }
    return (
      <span className="text-caption font-bold bg-danger-100 text-danger-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap" title={t("Riwayat retur tinggi, sarankan bayar QRIS")}>
        <AlertTriangleIcon className="w-3.5 h-3.5 text-danger-600" />
        <span>{t("Resiko RTS")} ({score}%)</span>
      </span>
    );
  };

  const stages = [
    { key: "new", label: "Lead Baru", color: "border-brand" },
    { key: "follow_up", label: "Sedang Follow-Up", color: "border-warning-500" },
    { key: "closing", label: "Minta Rekening / QRIS", color: "border-accent-500" },
    { key: "repeat_order", label: t("VIP / Repeat Order"), color: "border-success-500" },
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
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("CRM & Distribusi Leads")}</h1>
          <p className="text-body-sm text-fg-muted">{t("Lacak calon pembeli WhatsApp, skor mitigasi resiko COD, dan penugasan CS.")}</p>
        </div>

        <div className="flex flex-wrap items-center [&>button]:whitespace-nowrap [&>a]:whitespace-nowrap gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-line shadow-xs">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-lg text-label font-bold border-none cursor-pointer transition-all ${
                view === "kanban" ? "bg-brand text-white shadow-xs" : "bg-transparent text-fg-muted"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-lg text-label font-bold border-none cursor-pointer transition-all ${
                view === "table" ? "bg-brand text-white shadow-xs" : "bg-transparent text-fg-muted"
              }`}
            >
              {t("Tabel")}
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2"
          >
            <span>+</span>
            <span>{t("Tambah Lead Baru")}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-line shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 bg-canvas border border-line rounded-full px-3.5 py-2 w-full sm:w-[360px]">
          <svg className="text-fg-subtle" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder={t("Cari nama pelanggan, nomor WA, produk minat...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-body-sm text-ink placeholder:text-fg-subtle flex-1 font-medium"
          />
        </div>

        <span className="text-label text-fg-subtle hidden sm:inline">
          {t("Total:")} <strong className="text-ink">{filtered.length} {t("Leads Terpantau")}</strong>
        </span>
      </div>

      {/* KANBAN BOARD VIEW */}
      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 min-[1440px]:grid-cols-4 gap-5 items-start">
          {stages.map((stage) => {
            const stageLeads = filtered.filter((l) => l.status === stage.key);
            return (
              <div key={stage.key} className="bg-canvas p-4 rounded-2xl border border-line flex flex-col gap-3 min-h-[420px]">
                
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-2.5 border-b-2 ${stage.color}`}>
                  <span className="text-body-sm font-bold text-ink">{t(stage.label)}</span>
                  <span className="text-caption font-bold bg-white text-brand border border-line px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Lead Cards */}
                <div className="flex flex-col gap-3">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white p-4 rounded-xl border border-line shadow-xs hover:shadow-md transition-all flex flex-col gap-2 cursor-pointer"
                      onClick={() => handleOpenEdit(lead)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-caption font-bold text-brand bg-brand-soft px-2 py-0.5 rounded whitespace-nowrap">
                          {lead.source}
                        </span>
                        {getRiskBadge(lead.codScore, lead.codRisk)}
                      </div>

                      <div>
                        <h4 className="text-body-sm font-bold text-ink">{lead.name}</h4>
                        <div className="text-label text-fg-muted font-medium">{lead.phone}</div>
                      </div>

                      <div className="bg-canvas p-2 rounded-lg text-caption text-charcoal border border-line">
                        <span className="text-fg-subtle block">{t("Minat Produk:")}</span>
                        <span className="font-bold">{lead.interest}</span> (Rp {lead.estValue.toLocaleString("id-ID")})
                      </div>

                      {lead.notes && (
                        <p className="text-caption text-fg-muted italic line-clamp-2">
                          &quot;{lead.notes}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-line text-caption text-fg-subtle">
                        <span>CS: <strong className="text-ink">{lead.cs}</strong></span>
                        <span>{ago(lead.lastInteractionAt)}</span>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="py-8 text-center text-label text-fg-subtle italic">
                      {t("Belum ada lead di tahap ini")}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-line shadow-soft overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas border-b border-line">
                  <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">{t("Calon Pembeli")}</th>
                  <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">{t("Sumber Iklan")}</th>
                  <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">{t("Minat Produk")}</th>
                  <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">{t("Mitigasi COD")}</th>
                  <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">{t("Tahap CRM")}</th>
                  <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">{t("CS Bertugas")}</th>
                  <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted text-right">{t("Aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
                          <UsersIcon className="w-6 h-6 text-brand" />
                        </div>
                        <div className="font-bold text-ink text-body">{t("Belum Ada Lead / Kontak")}</div>
                        <p className="text-label text-fg-muted mt-1 mb-4">
                          {t("Kontak calon pembeli dari Meta Ads CAPI atau chat WhatsApp baru akan otomatis tercatat di sini.")}
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="btn-primary !py-2 !px-4 text-label font-bold"
                        >
                          {t("+ Tambah Lead Pertama")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-soft transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-ink text-body-sm">{l.name}</div>
                        <span className="tabular-nums text-caption font-bold text-fg-muted">{l.phone}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-label font-bold bg-brand-soft text-brand px-2.5 py-1 rounded-full">
                          {l.source}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-ink font-medium">{l.interest}</td>
                      <td className="py-4 px-5">
                        {getRiskBadge(l.codScore, l.codRisk)}
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-bold text-label bg-brand-soft text-brand px-2.5 py-0.5 rounded-full capitalize">
                          {l.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-medium text-charcoal">{l.cs}</td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="px-2.5 py-1 text-label font-bold text-brand bg-brand-soft hover:bg-brand hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(l.id)}
                            className="px-2.5 py-1 text-label font-bold text-danger-600 bg-danger-50 hover:bg-danger-600 hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                          >
                            {t("Hapus")}
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
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line animate-scale-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="card-title">
                {editingLead ? t("Edit Data Lead CRM") : t("Tambah Calon Pembeli (Lead)")}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLead(null);
                }}
                className="w-7 h-7 rounded-full bg-canvas hover:bg-brand-soft flex items-center justify-center text-fg-muted border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="flex flex-col gap-3.5 text-body-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Nama Pelanggan *")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("Nama Lengkap")}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Nomor WhatsApp *")}</label>
                  <input
                    type="text"
                    required
                    placeholder="+62 812-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Sumber Kontak (Traffic)")}</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  >
                    <option value="Instagram Ads (Reels)">Instagram Ads (Reels)</option>
                    <option value="Facebook Ads (Feed)">Facebook Ads (Feed)</option>
                    <option value="TikTok Click to WA">TikTok Click to WA</option>
                    <option value="WhatsApp Direct Link">WhatsApp Direct Link</option>
                    <option value="Website Organic">Website Organic</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Tahap Status")}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  >
                    <option value="new">{t("Lead Baru Masuk")}</option>
                    <option value="follow_up">{t("Sedang Follow-Up")}</option>
                    <option value="closing">{t("Minta Rekening / QRIS")}</option>
                    <option value="repeat_order">{t("VIP / Repeat Order")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Minat Produk")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("Produk yang diminati pelanggan")}
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Estimasi Nilai (Rp)")}</label>
                  <input
                    type="number"
                    required
                    value={formData.estValue}
                    onChange={(e) => setFormData({ ...formData, estValue: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Tugaskan ke CS")}</label>
                  <select
                    value={formData.cs}
                    onChange={(e) => setFormData({ ...formData, cs: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  >
                    <option value="">{t("Belum ditugaskan")}</option>
                    {salesStaff.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">{t("Skor Keberhasilan COD (%)")}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.codScore}
                    onChange={(e) => setFormData({ ...formData, codScore: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">{t("Catatan Tambahan")}</label>
                <textarea
                  rows="2"
                  placeholder={t("Kebutuhan khusus atau jadwal follow-up...")}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLead(null);
                  }}
                  className="btn-outline !py-2 !px-4 text-body-sm"
                >
                  {t("Batal")}
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-body-sm font-bold">
                  {editingLead ? t("Simpan Perubahan") : t("Simpan Lead")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-2xl border border-line animate-scale-pop text-center">
            <div className="w-12 h-12 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="card-title mb-1.5">{t("Hapus Data Lead?")}</h3>
            <p className="text-body-sm text-fg-muted mb-5">
              {t("Data calon pembeli #{id} akan dihapus dari sistem CRM.", { id: deleteConfirmId })}
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-outline !py-2 !px-4 text-body-sm"
              >
                {t("Batal")}
              </button>
              <button
                onClick={() => {
                  deleteLead(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-full bg-danger-600 hover:bg-danger-700 text-white font-bold text-body-sm border-none cursor-pointer shadow-sm"
              >
                {t("Ya, Hapus")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
