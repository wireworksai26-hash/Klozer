"use client";
import { useState } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  ShieldCheckIcon,
  QrIcon,
  MicIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  KlozerIcon,
  CrownIcon,
  HeadphonesIcon,
  CheckIcon,
} from "@/components/icons";
import { apiFetch } from "@/utils/api";

export default function RegisterPage() {
  const [institutionName, setInstitutionName] = useState("");
  const [sector, setSector] = useState("Fashion & Retail");
  const [mode, setMode] = useState("business");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [credentialsBundle, setCredentialsBundle] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedItem, setCopiedItem] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!institutionName) {
      setErrorMsg("Mohon masukkan nama toko / bisnis Anda.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        auth: false,
        body: { institutionName, sector, mode, ownerName: ownerName || undefined, phone: phone || undefined },
      });
      setCredentialsBundle(data.credentialsBundle);
    } catch (err) {
      setErrorMsg(err.message || "Gagal terhubung ke server pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!credentialsBundle) return;
    const b = credentialsBundle;
    const text = `
=== KREDENSIAL AKUN KLOZER RESMI ===
----------------------------------------
Instansi  : ${b.institutionName} (${b.sector || "Bisnis"})
Login URL : ${b.loginUrl || "http://localhost:3000/login"}
----------------------------------------
1. AKUN SUPERVISOR (SPV / OWNER):
   • Email    : ${b.spv?.email}
   • Password : ${b.spv?.password}
   • Akses    : Penuh (Laporan, Keuangan, AI)

2. AKUN CS 1 (CUSTOMER SERVICE):
   • Email    : ${b.cs1?.email}
   • Password : ${b.cs1?.password}
   • Akses    : WhatsApp Inbox & Closing Order

3. AKUN CS 2 (CUSTOMER SERVICE):
   • Email    : ${b.cs2?.email}
   • Password : ${b.cs2?.password}
   • Akses    : WhatsApp Inbox & Closing Order
----------------------------------------
Silakan gunakan kredensial ini untuk login di: http://localhost:3000/login
`.trim();
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySingle = (label, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(""), 2000);
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white">
      {/* LEFT COLUMN: Full Height Deep Ink Navy Showcase (5 Cols) */}
      <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-b from-ink via-ink-deep to-ink-abyss text-white">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-info-light/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 no-underline group" title="Kembali ke Beranda">
            <KlozerIcon className="w-11 h-11 rounded-xl shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-heading-md font-bold tracking-tight text-white leading-none">
              klozer<span className="text-brand">.</span>
            </span>
          </Link>
        </div>

        {/* Center Editorial Showcase */}
        <div className="relative z-10 my-auto py-8 max-w-[440px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/25 border border-brand/40 text-caption font-bold tracking-wider uppercase text-info-light mb-4">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Auto-Generate Akun SPV & CS Instan</span>
          </div>

          <h1 className="text-heading-lg font-bold text-white leading-tight tracking-tight mb-4">
            Otomatiskan Penjualan WhatsApp Bisnis Anda
          </h1>

          <p className="text-body-sm text-brand-soft/80 leading-relaxed mb-8">
            Daftarkan bisnis Anda dan dapatkan username email <code className="text-info-light font-bold">spv@bisnis.id</code> & <code className="text-info-light font-bold">cs@bisnis.id</code> beserta kata sandi angka otomatis yang siap langsung dipakai login.
          </p>

          {/* Value Checklist */}
          <div className="space-y-4 pt-6 border-t border-white/15">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                <QrIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-body-sm font-bold text-white">In-Chat Dynamic QRIS</div>
                <div className="text-label text-brand-soft/70">Checkout instan flat Rp 750 tanpa biaya langganan QRIS</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                <MicIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-body-sm font-bold text-white">AI Voice Note Engine</div>
                <div className="text-label text-brand-soft/70">Transkripsi & balasan suara otomatis logat lokal Indonesia</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                <ShieldCheckIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-body-sm font-bold text-white">Anti-Fraud OCR & Mutasi Bank</div>
                <div className="text-label text-brand-soft/70">Verifikasi struk transfer otomatis anti-struk palsu</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="relative z-10 pt-6 border-t border-white/15 text-label text-brand-soft/60 font-medium">
          Dipercaya oleh 1.400+ Brand, Toko Online & UMKM di Indonesia
        </div>
      </div>

      {/* RIGHT COLUMN: Full Width / Height Form Viewport (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 xl:px-20 py-10 bg-white min-h-screen overflow-y-auto">
        <div className="w-full max-w-[500px]">
          
          {/* Mobile Brand Logo */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2.5 mb-8 no-underline" title="Kembali ke Beranda">
            <KlozerIcon className="w-10 h-10 rounded-xl shadow-md flex-shrink-0" />
            <span className="text-heading-md font-bold tracking-tight text-ink">
              klozer<span className="text-brand">.</span>
            </span>
          </Link>

          {!credentialsBundle ? (
            <div>
              {/* Header with Quick Fill Presets */}
              <div className="mb-5">
                <span className="text-caption font-bold uppercase tracking-wider text-brand bg-brand-soft px-3 py-1 rounded-full border border-brand/20 inline-block mb-2">
                  Pendaftaran Tenant Baru
                </span>

                <h2 className="text-heading-md sm:text-heading font-bold text-ink tracking-tight leading-tight">
                  Buat Akun Bisnis Anda
                </h2>
                <p className="text-body-sm text-fg-muted mt-1 font-medium">
                  Sistem akan otomatis men-generate akun <strong>spv@bisnis.id</strong> dan <strong>cs@bisnis.id</strong> dengan password acak yang kuat. Simpan password tersebut, hanya ditampilkan sekali.
                </p>

              </div>

              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-body-sm font-semibold flex items-center gap-2.5">
                  <AlertTriangleIcon className="w-4.5 h-4.5 text-danger-600 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-body-sm font-bold text-charcoal mb-1">
                    Nama Toko / Bisnis / Instansi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mahalaundry / Batik Solo"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-line bg-canvas text-body-sm text-charcoal font-semibold placeholder-fg-subtle outline-none focus:border-brand focus:bg-white transition-all shadow-xs"
                  />
                  {institutionName && (
                    <div className="text-caption text-brand font-medium mt-1">
                      Preview Email Login: <span className="font-mono font-bold">spv@{institutionName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "bisnis"}.id</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-body-sm font-bold text-charcoal mb-1">
                      Tipe Operasional
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-line bg-canvas text-body-sm text-charcoal font-bold outline-none focus:border-brand focus:bg-white"
                    >
                      <option value="business">Bisnis / Retail E-Commerce</option>
                      <option value="ngo">NGO / Lembaga ZISWAF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-body-sm font-bold text-charcoal mb-1">
                      Sektor Industri
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-line bg-canvas text-body-sm text-charcoal font-bold outline-none focus:border-brand focus:bg-white"
                    >
                      <option value="Fashion & Retail">Fashion & Retail</option>
                      <option value="Kecantikan & Skincare">Kecantikan & Skincare</option>
                      <option value="Kuliner & F&B">Kuliner & F&B</option>
                      <option value="Jasa & Laundry">Jasa & Laundry</option>
                      <option value="Properti & Otomotif">Properti & Otomotif</option>
                      <option value="Lembaga Sosial & Donasi">Lembaga Sosial & Donasi</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-line">
                  <label className="block text-body-sm font-bold text-charcoal mb-1">
                    Nama Pemilik / Supervisor (SPV)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso (Opsional)"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-line bg-canvas text-body-sm text-charcoal font-semibold placeholder-fg-subtle outline-none focus:border-brand focus:bg-white transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-bold text-charcoal mb-1">
                    No. WhatsApp Aktif (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-line bg-canvas text-body-sm text-charcoal font-semibold placeholder-fg-subtle outline-none focus:border-brand focus:bg-white transition-all shadow-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary !py-3.5 text-body-sm font-bold shadow-md hover:shadow-xl cursor-pointer flex items-center justify-center gap-2 mt-4 transition-all"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Membuat Akun SPV & CS...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4.5 h-4.5" />
                      <span>Buat Akun & Generate Kredensial Otomatis →</span>
                    </>
                  )}
                </button>

                <p className="text-label text-fg-subtle text-center mt-3 leading-relaxed">
                  Dengan membuat akun, Anda menyetujui{" "}
                  <Link href="/syarat-ketentuan" target="_blank" className="text-brand hover:underline">Syarat dan Ketentuan</Link>{" "}
                  serta{" "}
                  <Link href="/kebijakan-privasi" target="_blank" className="text-brand hover:underline">Kebijakan Privasi</Link>{" "}
                  Klozer.
                </p>
              </form>

              <div className="mt-6 text-center text-body-sm text-fg-muted">
                Sudah punya akun?{" "}
                <Link href="/login" className="font-bold text-brand hover:underline">
                  Masuk di sini
                </Link>
              </div>
            </div>
          ) : (
            /* Direct Credentials Presentation View */
            <div className="flex flex-col gap-3.5 animate-scale-pop">
              <div className="p-5 bg-gradient-to-b from-success-50 to-canvas rounded-2xl border border-success-200 text-center">
                <div className="w-12 h-12 rounded-2xl bg-success-600 text-white mx-auto flex items-center justify-center mb-2 shadow-md shadow-success-600/20">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <h3 className="text-subheading font-bold text-success-900">
                  Akun SPV & CS Berhasil Dibuat!
                </h3>
                <p className="text-body-sm text-success-700 mt-1 font-medium">
                  Berikut adalah kredensial login resmi untuk instansi <strong>{credentialsBundle.institutionName}</strong>:
                </p>
              </div>

              {/* Stacked Interactive Credential Cards with Numeric Passwords */}
              <div className="space-y-2.5">
                {/* 1. SPV Account */}
                <div className="p-3.5 bg-white rounded-2xl border-2 border-brand/30 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-body-sm flex items-center gap-2">
                      <CrownIcon className="w-4 h-4 text-warning-500" />
                      <span>Akun Supervisor (SPV / Owner)</span>
                    </span>
                    <span className="text-micro bg-brand text-white px-2 py-0.5 rounded-full font-bold">
                      Akses Penuh
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-label bg-canvas p-2.5 rounded-xl border border-line">
                    <div>
                      <span className="text-micro text-fg-muted font-bold block">Email Login:</span>
                      <span className="font-mono font-bold text-ink text-body-sm select-all">
                        {credentialsBundle.spv?.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-micro text-fg-muted font-bold block">Password:</span>
                      <span className="font-mono font-bold text-success-700 bg-success-100 px-2 py-0.5 rounded border border-success-300 text-body-sm select-all">
                        {credentialsBundle.spv?.password}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copySingle("SPV", `${credentialsBundle.spv?.email} / ${credentialsBundle.spv?.password}`)}
                    className="text-caption font-bold text-brand hover:underline self-end flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    <ClipboardListIcon className="w-3.5 h-3.5" />
                    <span>{copiedItem === "SPV" ? "Tersalin!" : "Salin Akun SPV"}</span>
                  </button>
                </div>

                {/* 2. CS 1 Account */}
                <div className="p-3.5 bg-white rounded-2xl border border-line shadow-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-body-sm flex items-center gap-2">
                      <HeadphonesIcon className="w-4 h-4 text-success-600" />
                      <span>Akun CS 1 (Customer Service)</span>
                    </span>
                    <span className="text-micro bg-success-600 text-white px-2 py-0.5 rounded-full font-bold">
                      CS Frontliner
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-label bg-canvas p-2.5 rounded-xl border border-line">
                    <div>
                      <span className="text-micro text-fg-muted font-bold block">Email Login:</span>
                      <span className="font-mono font-bold text-ink text-body-sm select-all">
                        {credentialsBundle.cs1?.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-micro text-fg-muted font-bold block">Password:</span>
                      <span className="font-mono font-bold text-success-700 bg-success-100 px-2 py-0.5 rounded border border-success-300 text-body-sm select-all">
                        {credentialsBundle.cs1?.password}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copySingle("CS1", `${credentialsBundle.cs1?.email} / ${credentialsBundle.cs1?.password}`)}
                    className="text-caption font-bold text-brand hover:underline self-end flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    <ClipboardListIcon className="w-3.5 h-3.5" />
                    <span>{copiedItem === "CS1" ? "Tersalin!" : "Salin Akun CS 1"}</span>
                  </button>
                </div>

                {/* 3. CS 2 Account */}
                <div className="p-3.5 bg-white rounded-2xl border border-line shadow-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-body-sm flex items-center gap-2">
                      <HeadphonesIcon className="w-4 h-4 text-success-600" />
                      <span>Akun CS 2 (Customer Service)</span>
                    </span>
                    <span className="text-micro bg-success-600 text-white px-2 py-0.5 rounded-full font-bold">
                      CS Frontliner
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-label bg-canvas p-2.5 rounded-xl border border-line">
                    <div>
                      <span className="text-micro text-fg-muted font-bold block">Email Login:</span>
                      <span className="font-mono font-bold text-ink text-body-sm select-all">
                        {credentialsBundle.cs2?.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-micro text-fg-muted font-bold block">Password:</span>
                      <span className="font-mono font-bold text-success-700 bg-success-100 px-2 py-0.5 rounded border border-success-300 text-body-sm select-all">
                        {credentialsBundle.cs2?.password}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copySingle("CS2", `${credentialsBundle.cs2?.email} / ${credentialsBundle.cs2?.password}`)}
                    className="text-caption font-bold text-brand hover:underline self-end flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    <ClipboardListIcon className="w-3.5 h-3.5" />
                    <span>{copiedItem === "CS2" ? "Tersalin!" : "Salin Akun CS 2"}</span>
                  </button>
                </div>
              </div>

              {/* Master Copy Button */}
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full btn-outline !py-3 text-body-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all mt-1"
              >
                <ClipboardListIcon className="w-4 h-4 text-brand" />
                <span>{copied ? "Seluruh Kredensial Berhasil Disalin!" : "Salin Semua Akun (SPV & CS)"}</span>
              </button>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/login"
                  className="w-full btn-primary !py-3.5 text-body-sm font-bold text-center block shadow-md hover:shadow-xl"
                >
                  Lanjut ke Halaman Login Sekarang →
                </Link>

                <button
                  type="button"
                  onClick={() => setCredentialsBundle(null)}
                  className="w-full py-2 text-label font-bold text-fg-muted hover:text-ink text-center border-none bg-transparent cursor-pointer transition-colors"
                >
                  ← Daftarkan Bisnis Lain
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
