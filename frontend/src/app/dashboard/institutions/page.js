"use client";
import React, { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { FEATURE_LIST, featuresForTier } from "@/utils/plans";
import {
  BuildingIcon,
  CrownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XIcon,
  KeyIcon,
  ShieldCheckIcon,
  SparklesIcon,
  GlobeIcon,
} from "@/components/icons";

export default function InstitutionsPage() {
  const {
    institutions,
    addInstitution,
    updateInstitution,
    toggleInstitutionModule,
    deleteInstitution,
    resetInstitutionPassword,
    notify,
    language,
    t,
  } = useDashboard();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInst, setEditingInst] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Password reset state inside Edit modal
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form State with Language & Modules
  const [formData, setFormData] = useState({
    name: "",
    sector: "Fashion & Retail",
    owner: "",
    email: "",
    phone: "",
    tier: "Pro Plan",
    quotaMax: 50000,
    language: "id", // "id" | "en"
    modules: featuresForTier("Pro Plan"),
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
      language: "id",
      modules: featuresForTier("Pro Plan"),
    });
    setResetFeedback(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (inst) => {
    setEditingInst(inst);
    setFormData({
      name: inst.name || "",
      sector: inst.sector || "Fashion & Retail",
      owner: inst.owner || "",
      email: inst.email || "",
      phone: inst.phone || "",
      tier: inst.tier || "Pro Plan",
      quotaMax: inst.quotaMax || 50000,
      language: inst.language || "id",
      modules: { ...(inst.modules || {}) },
    });
    setResetPasswordInput("");
    setResetFeedback(null);
    setCopied(false);
  };

  const [createdCreds, setCreatedCreds] = useState(null);

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingInst) {
      const ok = await updateInstitution(editingInst.id, formData);
      if (ok) setEditingInst(null);
    } else {
      const created = await addInstitution(formData);
      if (created) {
        setShowAddModal(false);
        setCreatedCreds(created.credentialsBundle);
      }
    }
  };

  // Generate random password helper
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    setResetPasswordInput(Array.from(bytes, (b) => chars[b % chars.length]).join(""));
  };

  // Execute password reset
  const handleExecuteResetPassword = async () => {
    if (!editingInst) return;
    setIsResetting(true);
    setResetFeedback(null);

    let res = null;
    try {
      res = await resetInstitutionPassword(editingInst.id, resetPasswordInput);
    } catch (err) {
      notify("error", err.message);
    }
    setIsResetting(false);
    if (res && res.success) setResetFeedback(res.credentials);
  };

  const handleCopyCredentials = () => {
    if (!resetFeedback) return;
    const textToCopy = `Kredensial Login Klozer:
Instansi: ${resetFeedback.institutionName}
Email: ${resetFeedback.email}
Password Baru: ${resetFeedback.newPassword}
Login URL: ${window.location.origin}/login`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const filtered = institutions.filter((inst) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (inst.name?.toLowerCase() || "").includes(s) ||
      (inst.owner?.toLowerCase() || "").includes(s) ||
      (inst.id?.toLowerCase() || "").includes(s);
    const matchSector =
      selectedSector === "all" ||
      (inst.sector?.toLowerCase() || "").includes(selectedSector.toLowerCase());
    return matchSearch && matchSector;
  });

  return (
    <div className="flex flex-col gap-6">
      {createdCreds && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[460px] p-6 shadow-2xl border border-line">
            <h3 className="card-title mb-1">Instansi dibuat: {createdCreds.institutionName}</h3>
            <p className="text-label text-fg-muted mb-3">Berikan kredensial owner ini kepada pemilik. Password hanya ditampilkan sekali.</p>
            <pre className="font-mono text-label bg-canvas border border-line rounded-lg p-3 whitespace-pre-wrap break-all">{`Email: ${createdCreds.email}\nPassword: ${createdCreds.temporaryPassword}\nLogin: ${createdCreds.loginUrl}`}</pre>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => navigator.clipboard.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.temporaryPassword}\nLogin: ${createdCreds.loginUrl}`)} className="btn-outline !py-2 !px-4 text-body-sm">Salin</button>
              <button type="button" onClick={() => setCreatedCreds(null)} className="btn-primary !py-2 !px-4 text-body-sm font-bold">Selesai</button>
            </div>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            <span className="text-caption font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Super Admin Control
            </span>
            <span className="text-label text-fg-muted">Multi-Tenant & Akses Instansi</span>
          </div>
          <h1 className="page-title">
            {t("institutions.title", "Manajemen Instansi & Multi-Tenant")}
          </h1>
          <p className="text-label text-fg-muted">
            {t("institutions.subtitle", "Kelola data tenant, kuota pesan, bahasa dashboard, dan reset kata sandi akun.")}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-body-sm font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>{t("institutions.addBtn", "+ Tambah Instansi")}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-line shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-[320px]">
          <input
            type="text"
            placeholder="Cari nama instansi, pemilik, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-body-sm bg-soft border border-line rounded-xl px-3.5 py-2 text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-label font-bold text-fg-muted whitespace-nowrap">Sektor:</span>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="text-label font-semibold bg-soft border border-line rounded-xl px-3 py-1.5 text-fg outline-none cursor-pointer"
          >
            <option value="all">Semua Sektor ({institutions.length})</option>
            <option value="Fashion">Fashion & Retail</option>
            <option value="Beauty">Beauty & Skincare</option>
            <option value="Sosial">Lembaga Sosial & ZISWAF</option>
            <option value="Kuliner">Kuliner & F&B</option>
          </select>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-2xl border border-line shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-soft border-b border-line">
                <th className="py-3 px-4 font-bold text-fg-muted">Instansi & Pemilik</th>
                <th className="py-3 px-4 font-bold text-fg-muted">Sektor & Paket</th>
                <th className="py-3 px-4 font-bold text-fg-muted">Bahasa Dashboard</th>
                <th className="py-3 px-4 font-bold text-fg-muted">Penggunaan Kuota WA</th>
                <th className="py-3 px-4 font-bold text-fg-muted">Status</th>
                <th className="py-3 px-4 font-bold text-fg-muted text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((inst) => (
                <tr key={inst.id} className="hover:bg-soft/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-fg text-body-sm">{inst.name}</div>
                    <div className="text-caption text-fg-muted">
                      Owner: <strong>{inst.owner || "Owner"}</strong> • {inst.email}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-fg font-medium">{inst.sector}</div>
                    <span className="text-caption font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-md border border-brand-soft inline-block mt-0.5">
                      {inst.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-caption font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-fg border border-slate-200">
                      {inst.language === "en" ? "🇬🇧 English" : "🇮🇩 Indonesia"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-fg font-bold">
                      {(inst.quotaUsed || 0).toLocaleString("id-ID")} / {(inst.quotaMax || 50000).toLocaleString("id-ID")}
                    </div>
                    <div className="w-24 h-1.5 bg-sunken rounded-full overflow-hidden mt-1">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(((inst.quotaUsed || 0) / (inst.quotaMax || 50000)) * 100)
                          )}%`,
                        }}
                        className="h-full bg-brand rounded-full"
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-caption font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Aktif
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(inst)}
                        className="px-3 py-1.5 text-label font-bold text-brand bg-brand-soft hover:bg-[#e0e7ff] border border-brand-soft rounded-lg cursor-pointer transition-colors"
                      >
                        Edit & Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(inst.id)}
                        className="px-2.5 py-1.5 text-label font-bold text-rose-600 hover:bg-rose-50 border border-transparent rounded-lg cursor-pointer transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Institution Modal */}
      {(showAddModal || editingInst) && (
        <div className="fixed inset-0 bg-fg/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-line animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div>
                <h3 className="card-title">
                  {editingInst ? t("institutions.editTitle", "Edit Konfigurasi Instansi") : t("institutions.addTitle", "Registrasi Instansi Baru")}
                </h3>
                <p className="text-label text-fg-muted">
                  {editingInst
                    ? `Perbarui profil, bahasa dashboard, dan reset kata sandi ${editingInst.name}`
                    : "Tambahkan tenant bisnis baru ke dalam sistem Klozer"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingInst(null);
                }}
                className="p-1 rounded-lg hover:bg-sunken text-fg-muted bg-transparent border-none cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-body-sm">
              <div>
                <label className="font-bold text-fg block mb-1">
                  {t("institutions.nameLabel", "Nama Instansi / Bisnis")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Batik Mahakarya Solo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-soft border border-line rounded-xl p-2.5 text-fg outline-none font-medium focus:border-brand focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-fg block mb-1">
                    {t("institutions.sectorLabel", "Sektor Usaha")}
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full bg-soft border border-line rounded-xl p-2.5 text-fg outline-none font-medium"
                  >
                    <option value="Fashion & Retail">Fashion & Retail</option>
                    <option value="Beauty & Healthcare">Beauty & Healthcare</option>
                    <option value="Lembaga Sosial & Donasi">Lembaga Sosial & Donasi</option>
                    <option value="Kuliner & F&B">Kuliner & F&B</option>
                    <option value="Properti & Jasa">Properti & Jasa</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">
                    {t("institutions.tierLabel", "Paket Langganan")}
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value, ...(editingInst ? {} : { modules: featuresForTier(e.target.value) }) })}
                    className="w-full bg-soft border border-line rounded-xl p-2.5 text-fg outline-none font-medium"
                  >
                    <option value="Starter">Starter (10.000 Pesan)</option>
                    <option value="Pro Plan">Pro Plan (50.000 Pesan)</option>
                    <option value="Enterprise">Enterprise (100.000+ Pesan)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Language Setting per Institution */}
              <div className="p-3.5 bg-brand-soft rounded-xl border border-brand-soft">
                <label className="font-bold text-fg flex items-center gap-1.5 mb-1">
                  <GlobeIcon className="w-4 h-4 text-brand" />
                  <span>{t("institutions.languageLabel", "Bahasa Tampilan Dashboard Tenant")}</span>
                </label>
                <p className="text-caption text-fg-muted mb-2">
                  Mengatur bahasa antarmuka dashboard untuk akun Owner & CS instansi ini.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: "id" })}
                    className={`py-2 px-3 rounded-xl text-label font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.language === "id"
                        ? "bg-brand text-white border-brand shadow-xs"
                        : "bg-white text-fg-muted border-line hover:bg-slate-50"
                    }`}
                  >
                    <span>🇮🇩</span>
                    <span>Bahasa Indonesia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: "en" })}
                    className={`py-2 px-3 rounded-xl text-label font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.language === "en"
                        ? "bg-brand text-white border-brand shadow-xs"
                        : "bg-white text-fg-muted border-line hover:bg-slate-50"
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>English (International)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-fg block mb-1">
                    {t("institutions.ownerLabel", "Nama Pemilik (Owner)")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-soft border border-line rounded-xl p-2.5 text-fg outline-none font-medium focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-fg block mb-1">
                    {t("institutions.phoneLabel", "Nomor WhatsApp Cloud")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+62 812-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-soft border border-line rounded-xl p-2.5 text-fg outline-none font-medium focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-fg block mb-1">
                  {t("institutions.emailLabel", "Email Akun Owner (Login)")}
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@brand.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-soft border border-line rounded-xl p-2.5 text-fg outline-none font-medium focus:bg-white"
                />
              </div>

              {/* 🔑 RESET PASSWORD SECTION (For Edit Modal) */}
              {editingInst && (
                <div className="p-4 bg-[#faf5ff] rounded-2xl border border-[#e9d5ff]">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                    <KeyIcon className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-body-sm text-fg">
                      {t("institutions.resetPasswordSection", "Reset Kata Sandi Akun Owner")}
                    </span>
                  </div>
                  <p className="text-label text-fg-muted mb-3">
                    {t("institutions.resetPasswordDesc", "Atur ulang kata sandi login untuk akun Owner/Admin instansi ini.")}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("institutions.newPasswordPlaceholder", "Masukkan kata sandi baru (min 6 karakter)")}
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      className="w-full bg-white border border-line rounded-xl px-3 py-2 text-label font-mono text-fg outline-none focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="w-full sm:w-auto px-3 py-2 text-label font-bold rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {t("institutions.autoGenerateBtn", "⚡ Generate Sandi")}
                    </button>
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleExecuteResetPassword}
                      className="w-full sm:w-auto px-3.5 py-2 text-label font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isResetting ? "Memproses..." : t("institutions.resetPasswordBtn", "Reset Password")}
                    </button>
                  </div>

                  {/* Reset Success Feedback Card */}
                  {resetFeedback && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-scale-pop">
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-label">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>{t("institutions.passwordResetSuccess", "Kata sandi berhasil di-reset!")}</span>
                        </div>
                        <div className="text-label text-fg-muted font-mono mt-0.5">
                          Email: <strong>{resetFeedback.email}</strong> • Password Baru:{" "}
                          <strong className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {resetFeedback.newPassword}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        className="px-3 py-1.5 text-caption font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors self-end sm:self-auto"
                      >
                        {copied ? t("institutions.copied", "Tersalin! ✓") : t("institutions.copyCredentials", "Salin Kredensial")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Feature Toggles */}
              <div className="pt-2">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <label className="font-bold text-fg">
                    Fitur yang aktif ({FEATURE_LIST.filter((m) => formData.modules?.[m.key]).length} dari {FEATURE_LIST.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, modules: featuresForTier(formData.tier) })}
                    className="px-3 py-1.5 text-caption font-bold rounded-lg bg-brand-soft text-brand border-none cursor-pointer"
                  >
                    Terapkan fitur paket {formData.tier}
                  </button>
                </div>
                <p className="text-caption text-fg-muted mb-2">Centang atau hilangkan per fitur sesuai paket yang dibeli klien. Menu dan akses fitur yang dimatikan langsung hilang untuk toko tersebut.</p>
                <div className="grid grid-cols-2 gap-2 bg-soft p-3.5 rounded-xl border border-line max-h-[260px] overflow-y-auto">
                  {FEATURE_LIST.map((m) => (
                    <label
                      key={m.key}
                      className="flex items-center gap-2 cursor-pointer text-label font-medium text-fg"
                    >
                      <input
                        type="checkbox"
                        checked={formData.modules?.[m.key] ?? false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            modules: { ...formData.modules, [m.key]: e.target.checked },
                          })
                        }
                        className="accent-brand"
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingInst(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-line text-fg-muted hover:bg-slate-50 text-body-sm font-semibold cursor-pointer"
                >
                  {t("common.cancel", "Batal")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-body-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  {editingInst ? t("common.save", "Simpan Perubahan") : t("institutions.addBtn", "Tambahkan Institusi")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-fg/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-2xl border border-line animate-scale-pop text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="card-title mb-1.5">Hapus Data Institusi?</h3>
            <p className="text-body-sm text-fg-muted mb-5">
              Apakah Anda yakin ingin menghapus institusi ini? Semua kuota pesan dan konfigurasi modul akan dinonaktifkan.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-line text-fg-muted text-body-sm font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInstitution(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-body-sm border-none cursor-pointer shadow-xs"
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
