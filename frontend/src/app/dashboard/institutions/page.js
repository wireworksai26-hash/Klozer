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

  // Generate random password helper
  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "Klz!";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordInput(pass);
  };

  // Execute password reset
  const handleExecuteResetPassword = async () => {
    if (!editingInst) return;
    setIsResetting(true);
    setResetFeedback(null);

    const res = await resetInstitutionPassword(editingInst.id, resetPasswordInput);
    setIsResetting(false);
    if (res && res.success) {
      setResetFeedback(res.credentials || {
        institutionName: editingInst.name,
        email: editingInst.email || "owner@klozer.id",
        newPassword: resetPasswordInput || "Klozer123!",
      });
    }
  };

  const handleCopyCredentials = () => {
    if (!resetFeedback) return;
    const textToCopy = `Kredensial Login Klozer:
Instansi: ${resetFeedback.institutionName}
Email: ${resetFeedback.email}
Password Baru: ${resetFeedback.newPassword}
Login URL: http://localhost:3000/login`;

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
    <div className="flex flex-col gap-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f1f3f7]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Super Admin Control
            </span>
            <span className="text-[12px] text-[#64748b]">Multi-Tenant & Akses Instansi</span>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">
            {t("institutions.title", "Manajemen Instansi & Multi-Tenant")}
          </h1>
          <p className="text-[12.5px] text-[#64748b]">
            {t("institutions.subtitle", "Kelola data tenant, kuota pesan, bahasa dashboard, dan reset kata sandi akun.")}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-[#2545ff] hover:bg-[#1d37cc] text-white text-[13px] font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>{t("institutions.addBtn", "+ Tambah Instansi")}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e8eaef] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-[320px]">
          <input
            type="text"
            placeholder="Cari nama instansi, pemilik, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-[13px] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2 text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#2545ff] focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[12px] font-bold text-[#64748b] whitespace-nowrap">Sektor:</span>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="text-[12.5px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-1.5 text-[#0f172a] outline-none cursor-pointer"
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
      <div className="bg-white rounded-2xl border border-[#e8eaef] shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="py-3 px-4 font-bold text-[#475467]">Instansi & Pemilik</th>
                <th className="py-3 px-4 font-bold text-[#475467]">Sektor & Paket</th>
                <th className="py-3 px-4 font-bold text-[#475467]">Bahasa Dashboard</th>
                <th className="py-3 px-4 font-bold text-[#475467]">Penggunaan Kuota WA</th>
                <th className="py-3 px-4 font-bold text-[#475467]">Status</th>
                <th className="py-3 px-4 font-bold text-[#475467] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f7]">
              {filtered.map((inst) => (
                <tr key={inst.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-[#0f172a] text-[13.5px]">{inst.name}</div>
                    <div className="text-[11.5px] text-[#64748b]">
                      Owner: <strong>{inst.owner || "Owner"}</strong> • {inst.email}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[#0f172a] font-medium">{inst.sector}</div>
                    <span className="text-[11px] font-bold text-[#2545ff] bg-[#f0f4ff] px-2 py-0.5 rounded-md border border-[#dbeafe] inline-block mt-0.5">
                      {inst.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-[#0f172a] border border-slate-200">
                      {inst.language === "en" ? "🇬🇧 English" : "🇮🇩 Indonesia"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-[#0f172a] font-bold">
                      {(inst.quotaUsed || 0).toLocaleString()} / {(inst.quotaMax || 50000).toLocaleString()}
                    </div>
                    <div className="w-24 h-1.5 bg-[#f1f3f7] rounded-full overflow-hidden mt-1">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(((inst.quotaUsed || 0) / (inst.quotaMax || 50000)) * 100)
                          )}%`,
                        }}
                        className="h-full bg-[#2545ff] rounded-full"
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Aktif
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(inst)}
                        className="px-3 py-1.5 text-[12px] font-bold text-[#2545ff] bg-[#f0f4ff] hover:bg-[#e0e7ff] border border-[#dbeafe] rounded-lg cursor-pointer transition-colors"
                      >
                        Edit & Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(inst.id)}
                        className="px-2.5 py-1.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 border border-transparent rounded-lg cursor-pointer transition-colors"
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
        <div className="fixed inset-0 bg-[#0f172a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[#e8eaef] animate-scale-pop font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3f7] mb-4">
              <div>
                <h3 className="text-[17px] font-bold text-[#0f172a]">
                  {editingInst ? t("institutions.editTitle", "Edit Konfigurasi Instansi") : t("institutions.addTitle", "Registrasi Instansi Baru")}
                </h3>
                <p className="text-[12px] text-[#64748b]">
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
                className="p-1 rounded-lg hover:bg-[#f1f3f7] text-[#64748b] bg-transparent border-none cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-[13px]">
              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  {t("institutions.nameLabel", "Nama Instansi / Bisnis")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Batik Mahakarya Solo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] outline-none font-medium focus:border-[#2545ff] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    {t("institutions.sectorLabel", "Sektor Usaha")}
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] outline-none font-medium"
                  >
                    <option value="Fashion & Retail">Fashion & Retail</option>
                    <option value="Beauty & Healthcare">Beauty & Healthcare</option>
                    <option value="Lembaga Sosial & Donasi">Lembaga Sosial & Donasi</option>
                    <option value="Kuliner & F&B">Kuliner & F&B</option>
                    <option value="Properti & Jasa">Properti & Jasa</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    {t("institutions.tierLabel", "Paket Langganan")}
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] outline-none font-medium"
                  >
                    <option value="Starter">Starter (10.000 Pesan)</option>
                    <option value="Pro Plan">Pro Plan (50.000 Pesan)</option>
                    <option value="Enterprise">Enterprise (100.000+ Pesan)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Language Setting per Institution */}
              <div className="p-3.5 bg-[#f0f4ff] rounded-xl border border-[#dbeafe]">
                <label className="font-bold text-[#0f172a] flex items-center gap-1.5 mb-1">
                  <GlobeIcon className="w-4 h-4 text-[#2545ff]" />
                  <span>{t("institutions.languageLabel", "Bahasa Tampilan Dashboard Tenant")}</span>
                </label>
                <p className="text-[11.5px] text-[#64748b] mb-2">
                  Mengatur bahasa antarmuka dashboard untuk akun Owner & CS instansi ini.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: "id" })}
                    className={`py-2 px-3 rounded-xl text-[12.5px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.language === "id"
                        ? "bg-[#2545ff] text-white border-[#2545ff] shadow-xs"
                        : "bg-white text-[#475467] border-[#e2e8f0] hover:bg-slate-50"
                    }`}
                  >
                    <span>🇮🇩</span>
                    <span>Bahasa Indonesia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: "en" })}
                    className={`py-2 px-3 rounded-xl text-[12.5px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.language === "en"
                        ? "bg-[#2545ff] text-white border-[#2545ff] shadow-xs"
                        : "bg-white text-[#475467] border-[#e2e8f0] hover:bg-slate-50"
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>English (International)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    {t("institutions.ownerLabel", "Nama Pemilik (Owner)")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] outline-none font-medium focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0f172a] block mb-1">
                    {t("institutions.phoneLabel", "Nomor WhatsApp Cloud")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+62 812-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] outline-none font-medium focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0f172a] block mb-1">
                  {t("institutions.emailLabel", "Email Akun Owner (Login)")}
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@brand.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] outline-none font-medium focus:bg-white"
                />
              </div>

              {/* 🔑 RESET PASSWORD SECTION (For Edit Modal) */}
              {editingInst && (
                <div className="p-4 bg-[#faf5ff] rounded-2xl border border-[#e9d5ff]">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyIcon className="w-4 h-4 text-purple-700" />
                    <span className="font-extrabold text-[13.5px] text-[#0f172a]">
                      {t("institutions.resetPasswordSection", "Reset Kata Sandi Akun Owner")}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#64748b] mb-3">
                    {t("institutions.resetPasswordDesc", "Atur ulang kata sandi login untuk akun Owner/Admin instansi ini.")}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("institutions.newPasswordPlaceholder", "Masukkan kata sandi baru (min 6 karakter)")}
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      className="w-full bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-[12.5px] font-mono text-[#0f172a] outline-none focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="w-full sm:w-auto px-3 py-2 text-[12px] font-bold rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {t("institutions.autoGenerateBtn", "⚡ Generate Sandi")}
                    </button>
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleExecuteResetPassword}
                      className="w-full sm:w-auto px-3.5 py-2 text-[12px] font-extrabold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isResetting ? "Memproses..." : t("institutions.resetPasswordBtn", "Reset Password")}
                    </button>
                  </div>

                  {/* Reset Success Feedback Card */}
                  {resetFeedback && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-scale-pop">
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[12.5px]">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>{t("institutions.passwordResetSuccess", "Kata sandi berhasil di-reset!")}</span>
                        </div>
                        <div className="text-[12px] text-[#475467] font-mono mt-0.5">
                          Email: <strong>{resetFeedback.email}</strong> • Password Baru:{" "}
                          <strong className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {resetFeedback.newPassword}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        className="px-3 py-1.5 text-[11.5px] font-extrabold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors self-end sm:self-auto"
                      >
                        {copied ? t("institutions.copied", "Tersalin! ✓") : t("institutions.copyCredentials", "Salin Kredensial")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Feature Toggles */}
              <div className="pt-2">
                <label className="font-bold text-[#0f172a] block mb-2">
                  Hak Akses Modul Fitur:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#f8fafc] p-3.5 rounded-xl border border-[#e2e8f0] max-h-[180px] overflow-y-auto">
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
                    <label
                      key={m.key}
                      className="flex items-center gap-2 cursor-pointer text-[12px] font-medium text-[#0f172a]"
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
                        className="accent-[#2545ff]"
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f1f3f7] mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingInst(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 text-[13px] font-semibold cursor-pointer"
                >
                  {t("common.cancel", "Batal")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2545ff] hover:bg-[#1d37cc] text-white text-[13px] font-bold shadow-xs hover:shadow transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-[#0f172a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-2xl border border-[#e8eaef] animate-scale-pop text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-[17px] font-extrabold text-[#0f172a] mb-1.5">Hapus Data Institusi?</h3>
            <p className="text-[13px] text-[#64748b] mb-5">
              Apakah Anda yakin ingin menghapus institusi ini? Semua kuota pesan dan konfigurasi modul akan dinonaktifkan.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-[#e2e8f0] text-[#64748b] text-[13px] font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInstitution(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] border-none cursor-pointer shadow-xs"
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
