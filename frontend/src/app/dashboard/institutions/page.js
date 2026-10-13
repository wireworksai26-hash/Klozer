"use client";
import React, { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
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
      language: "id",
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
            <h3 className="card-title mb-1">{t("Instansi dibuat:")} {createdCreds.institutionName}</h3>
            <p className="text-label text-fg-muted mb-3">{t("Berikan kredensial owner ini kepada pemilik. Password hanya ditampilkan sekali.")}</p>
            <pre className="font-mono text-label bg-canvas border border-line rounded-lg p-3 whitespace-pre-wrap break-all">{`Email: ${createdCreds.email}\nPassword: ${createdCreds.temporaryPassword}\nLogin: ${createdCreds.loginUrl}`}</pre>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => navigator.clipboard.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.temporaryPassword}\nLogin: ${createdCreds.loginUrl}`)} className="btn-outline !py-2 !px-4 text-body-sm">{t("Salin")}</button>
              <button type="button" onClick={() => setCreatedCreds(null)} className="btn-primary !py-2 !px-4 text-body-sm font-bold">{t("Selesai")}</button>
            </div>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            <span className="text-caption font-bold text-accent-700 bg-accent-50 px-2.5 py-0.5 rounded-full border border-accent-200">
              Super Admin Control
            </span>
            <span className="text-label text-fg-muted">{t("Multi-Tenant & Akses Instansi")}</span>
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
            placeholder={t("Cari nama instansi, pemilik, ID...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-body-sm bg-soft border border-line rounded-xl px-3.5 py-2 text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-label font-bold text-fg-muted whitespace-nowrap">{t("Sektor:")}</span>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="text-label font-semibold bg-soft border border-line rounded-xl px-3 py-1.5 text-fg outline-none cursor-pointer"
          >
            <option value="all">{t("Semua Sektor")} ({institutions.length})</option>
            <option value="Fashion">Fashion & Retail</option>
            <option value="Beauty">Beauty & Skincare</option>
            <option value="Sosial">{t("Lembaga Sosial & ZISWAF")}</option>
            <option value="Kuliner">{t("Kuliner & F&B")}</option>
          </select>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-soft border-b border-line">
                <th className="py-3 px-4 font-bold text-fg-muted">{t("Instansi & Pemilik")}</th>
                <th className="py-3 px-4 font-bold text-fg-muted">{t("Sektor & Paket")}</th>
                <th className="py-3 px-4 font-bold text-fg-muted">{t("Bahasa Dashboard")}</th>
                <th className="py-3 px-4 font-bold text-fg-muted">{t("Penggunaan Kuota WA")}</th>
                <th className="py-3 px-4 font-bold text-fg-muted">Status</th>
                <th className="py-3 px-4 font-bold text-fg-muted text-right">{t("Aksi")}</th>
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
                    <span className="inline-flex items-center gap-1 text-caption font-bold px-2.5 py-0.5 rounded-full bg-sunken text-fg border border-line">
                      {inst.language === "en" ? "🇬🇧 English" : t("🇮🇩 Indonesia")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 tabular-nums">
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
                    <span className="text-caption font-bold text-success-700 bg-success-50 px-2.5 py-0.5 rounded-full border border-success-200">
                      {t("Aktif")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(inst)}
                        className="px-3 py-1.5 text-label font-bold text-brand bg-brand-soft hover:bg-brand/15 border border-brand-soft rounded-lg cursor-pointer transition-colors"
                      >
                        {t("Edit & Reset")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(inst.id)}
                        className="px-2.5 py-1.5 text-label font-bold text-danger-600 hover:bg-danger-50 border border-transparent rounded-lg cursor-pointer transition-colors"
                      >
                        {t("Hapus")}
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
                    ? t("Perbarui profil, bahasa dashboard, dan reset kata sandi {name}", { name: editingInst.name })
                    : t("Tambahkan tenant bisnis baru ke dalam sistem Klozer")}
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
                  placeholder={t("Contoh: Batik Mahakarya Solo")}
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
                    <option value="Lembaga Sosial & Donasi">{t("Lembaga Sosial & Donasi")}</option>
                    <option value="Kuliner & F&B">{t("Kuliner & F&B")}</option>
                    <option value="Properti & Jasa">{t("Properti & Jasa")}</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-fg block mb-1">
                    {t("institutions.tierLabel", "Paket Langganan")}
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full bg-soft border border-line rounded-xl p-2.5 text-fg outline-none font-medium"
                  >
                    <option value="Starter">{t("Starter (10.000 Pesan)")}</option>
                    <option value="Pro Plan">{t("Pro Plan (50.000 Pesan)")}</option>
                    <option value="Enterprise">{t("Enterprise (100.000+ Pesan)")}</option>
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
                  {t("Mengatur bahasa antarmuka dashboard untuk akun Owner & CS instansi ini.")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: "id" })}
                    className={`py-2 px-3 rounded-xl text-label font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.language === "id"
                        ? "bg-brand text-white border-brand shadow-xs"
                        : "bg-white text-fg-muted border-line hover:bg-soft"
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
                        : "bg-white text-fg-muted border-line hover:bg-soft"
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
                    placeholder={t("Nama Lengkap")}
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
                <div className="p-4 bg-accent-50 rounded-2xl border border-accent-200">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                    <KeyIcon className="w-4 h-4 text-accent-700" />
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
                      className="w-full bg-white border border-line rounded-xl px-3 py-2 text-label font-mono text-fg outline-none focus:border-accent-600"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="w-full sm:w-auto px-3 py-2 text-label font-bold rounded-xl bg-accent-100 hover:bg-accent-200 text-accent-800 border border-accent-300 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {t("institutions.autoGenerateBtn", "⚡ Generate Sandi")}
                    </button>
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleExecuteResetPassword}
                      className="w-full sm:w-auto px-3.5 py-2 text-label font-bold rounded-xl bg-accent-700 hover:bg-accent-800 text-white shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isResetting ? t("Memproses...") : t("institutions.resetPasswordBtn", "Reset Password")}
                    </button>
                  </div>

                  {/* Reset Success Feedback Card */}
                  {resetFeedback && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-success-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-scale-pop">
                      <div>
                        <div className="flex items-center gap-1.5 text-success-700 font-bold text-label">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>{t("institutions.passwordResetSuccess", "Kata sandi berhasil di-reset!")}</span>
                        </div>
                        <div className="text-label text-fg-muted font-mono mt-0.5">
                          Email: <strong>{resetFeedback.email}</strong> • {t("Password Baru:")}{" "}
                          <strong className="text-accent-700 bg-accent-50 px-1.5 py-0.5 rounded border border-accent-200">
                            {resetFeedback.newPassword}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        className="px-3 py-1.5 text-caption font-bold rounded-lg bg-success-600 hover:bg-success-700 text-white cursor-pointer shadow-xs transition-colors self-end sm:self-auto"
                      >
                        {copied ? t("institutions.copied", "Tersalin! ✓") : t("institutions.copyCredentials", "Salin Kredensial")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Feature Toggles */}
              <div className="pt-2">
                <label className="font-bold text-fg block mb-2">
                  {t("Hak Akses Modul Fitur:")}
                </label>
                <div className="grid grid-cols-2 gap-2 bg-soft p-3.5 rounded-xl border border-line max-h-[180px] overflow-y-auto">
                  {[
                    { key: "personaAi", label: t("Persona AI CS") },
                    { key: "autoLabel", label: t("Auto-Label AI") },
                    { key: "printReceipt", label: t("Cetak Nota / Invoice") },
                    { key: "baileys", label: "Baileys WhatsApp" },
                    { key: "instagram", label: "Instagram Direct DM" },
                    { key: "csBlast", label: "CS Broadcast Blast" },
                    { key: "publicBooking", label: "Public Booking / Form" },
                    { key: "stockManagement", label: "Stock Management" },
                    { key: "picFeature", label: "PIC Round Robin" },
                    { key: "qris", label: "Dynamic QRIS In-Chat" },
                    { key: "voiceAi", label: "Voice Note AI (Whisper)" },
                    { key: "antiFraud", label: t("Anti-Fraud Struk Forensics") },
                    { key: "metaCapi", label: "Meta Ads CAPI Tracking" },
                    { key: "multiCs", label: "Multi-CS Department" },
                  ].map((m) => (
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
                  className="px-4 py-2 rounded-xl border border-line text-fg-muted hover:bg-soft text-body-sm font-semibold cursor-pointer"
                >
                  {t("common.cancel", t("Batal"))}
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
            <div className="w-12 h-12 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="card-title mb-1.5">{t("Hapus Data Institusi?")}</h3>
            <p className="text-body-sm text-fg-muted mb-5">
              {t("Apakah Anda yakin ingin menghapus institusi ini? Semua kuota pesan dan konfigurasi modul akan dinonaktifkan.")}
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-line text-fg-muted text-body-sm font-semibold cursor-pointer"
              >
                {t("Batal")}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInstitution(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-danger-600 hover:bg-danger-700 text-white font-bold text-body-sm border-none cursor-pointer shadow-xs"
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
