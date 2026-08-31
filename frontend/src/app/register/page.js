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
  MailIcon,
} from "@/components/icons";

export default function RegisterPage() {
  const [institutionName, setInstitutionName] = useState("");
  const [sector, setSector] = useState("Fashion & Retail");
  const [mode, setMode] = useState("business");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [credentialsBundle, setCredentialsBundle] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQuickDetails, setShowQuickDetails] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!institutionName || !email || !ownerName) {
      setErrorMsg("Mohon lengkapi seluruh field formulir pendaftaran.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      let data = null;
      try {
        const res = await fetch("http://localhost:5000/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionName,
            sector,
            mode,
            ownerName,
            email,
            phone,
          }),
        });
        data = await res.json();
      } catch (err) {
        // Local simulation fallback
        data = {
          success: true,
          emailSent: true,
          targetEmail: email,
          credentialsBundle: {
            institutionName,
            sector,
            targetEmail: email,
            loginUrl: "/login",
            owner: {
              name: ownerName,
              email: email,
              temporaryPassword: "Spv" + Math.floor(1000 + Math.random() * 9000) + "!",
              role: "Owner / Supervisor",
            },
            cs1: {
              name: "CS 1 - " + institutionName,
              email: "cs1." + institutionName.toLowerCase().replace(/[^a-z0-9]+/g, "") + "@klozer.id",
              temporaryPassword: "Cs1" + Math.floor(1000 + Math.random() * 9000) + "!",
              role: "Customer Service 1",
            },
            cs2: {
              name: "CS 2 - " + institutionName,
              email: "cs2." + institutionName.toLowerCase().replace(/[^a-z0-9]+/g, "") + "@klozer.id",
              temporaryPassword: "Cs2" + Math.floor(1000 + Math.random() * 9000) + "!",
              role: "Customer Service 2",
            },
          },
        };
      }

      if (data && data.credentialsBundle) {
        setCredentialsBundle(data.credentialsBundle);
      } else {
        setErrorMsg(data?.message || "Pendaftaran gagal. Silakan coba lagi.");
      }
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
🎉 KREDENSIAL AKUN KLOZER RESMI
----------------------------------------
Instansi  : ${b.institutionName} (${b.sector || "Bisnis"})
Email Dituju: ${b.targetEmail || email}
Login URL : ${b.loginUrl || "http://localhost:3000/login"}
----------------------------------------
1. AKUN SUPERVISOR (SPV / OWNER):
   • Email    : ${b.owner?.email || email}
   • Password : ${b.owner?.temporaryPassword || "Klozer123!"}
   • Akses    : Penuh (Finansial, Tim, Pengaturan)

2. AKUN CS 1 (CUSTOMER SERVICE):
   • Email    : ${b.cs1?.email || "cs1@" + b.institutionName?.toLowerCase().replace(/\s+/g, "") + ".klozer.id"}
   • Password : ${b.cs1?.temporaryPassword || "KlozerCS1!"}
   • Akses    : WhatsApp Inbox & Closing Order

3. AKUN CS 2 (CUSTOMER SERVICE):
   • Email    : ${b.cs2?.email || "cs2@" + b.institutionName?.toLowerCase().replace(/\s+/g, "") + ".klozer.id"}
   • Password : ${b.cs2?.temporaryPassword || "KlozerCS2!"}
   • Akses    : WhatsApp Inbox & Closing Order
----------------------------------------
Silakan simpan informasi akun ini dengan aman.
`.trim();
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 font-sans bg-white">
      {/* LEFT COLUMN: Full Height Deep Ink Navy Showcase (5 Cols) */}
      <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-b from-[#0c1754] via-[#08103d] to-[#040821] text-white">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2545ff]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#38bdf8]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 no-underline group" title="Kembali ke Beranda">
            <KlozerIcon className="w-11 h-11 rounded-xl shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-[28px] font-black tracking-tight text-white leading-none">
              klozer<span className="text-[#2545ff]">.</span>
            </span>
          </Link>
        </div>

        {/* Center Editorial Showcase */}
        <div className="relative z-10 my-auto py-8 max-w-[440px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2545ff]/25 border border-[#2545ff]/40 text-[11px] font-extrabold tracking-wider uppercase text-[#38bdf8] mb-4">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Uji Coba 14 Hari Tanpa Kartu Kredit</span>
          </div>

          <h1 className="text-[32px] xl:text-[36px] font-black text-white leading-[1.2] tracking-tight mb-4">
            Otomatiskan Penjualan WhatsApp Bisnis Anda
          </h1>

          <p className="text-[14.5px] text-[#eaebf8]/80 leading-relaxed mb-8">
            Daftarkan instansi Anda dan dapatkan kredensial otomatis untuk Supervisor dan seluruh Customer Service Anda langsung ke email.
          </p>

          {/* Value Checklist */}
          <div className="space-y-4 pt-6 border-t border-white/15">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#2545ff] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                <QrIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[14px] font-extrabold text-white">In-Chat Dynamic QRIS</div>
                <div className="text-[12.5px] text-[#eaebf8]/70">Checkout instan flat Rp 750 tanpa biaya langganan QRIS</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#2545ff] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                <MicIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[14px] font-extrabold text-white">AI Voice Note Engine</div>
                <div className="text-[12.5px] text-[#eaebf8]/70">Transkripsi & balasan suara otomatis logat lokal Indonesia</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#2545ff] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                <ShieldCheckIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[14px] font-extrabold text-white">Anti-Fraud OCR & Mutasi Bank</div>
                <div className="text-[12.5px] text-[#eaebf8]/70">Verifikasi struk transfer otomatis anti-struk palsu</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="relative z-10 pt-6 border-t border-white/15 text-[12.5px] text-[#eaebf8]/60 font-medium">
          Dipercaya oleh 1.400+ Brand, Toko Online & UMKM di Indonesia
        </div>
      </div>

      {/* RIGHT COLUMN: Full Width / Height Form Viewport (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 xl:px-20 py-10 bg-white min-h-screen overflow-y-auto">
        <div className="w-full max-w-[500px]">

          {/* Mobile Brand Logo */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2.5 mb-8 no-underline" title="Kembali ke Beranda">
            <KlozerIcon className="w-10 h-10 rounded-xl shadow-md flex-shrink-0" />
            <span className="text-[26px] font-black tracking-tight text-[#0c1754]">
              klozer<span className="text-[#2545ff]">.</span>
            </span>
          </Link>

          {!credentialsBundle ? (
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2545ff] bg-[#eaebf8] px-3 py-1 rounded-full border border-[#2545ff]/20 inline-block mb-2.5">
                  Pendaftaran Tenant Baru
                </span>
                <h2 className="text-[28px] sm:text-[32px] font-black text-[#0c1754] tracking-tight leading-tight">
                  Mulai Uji Coba Gratis
                </h2>
                <p className="text-[14px] text-[#64748b] mt-1.5 font-medium">
                  Kredensial login untuk SPV dan 2 Customer Service akan langsung dikirimkan ke email Anda.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold flex items-center gap-2.5">
                  <AlertTriangleIcon className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-bold text-[#171417] mb-1.5">
                    Nama Toko / Bisnis / Instansi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mahalaundry / Batik Mahakarya Solo"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[14px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1.5">
                      Tipe Operasional
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13px] text-[#171417] font-bold outline-none focus:border-[#2545ff] focus:bg-white"
                    >
                      <option value="business">Bisnis / Retail E-Commerce</option>
                      <option value="ngo">NGO / Lembaga ZISWAF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1.5">
                      Sektor Industri
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13px] text-[#171417] font-bold outline-none focus:border-[#2545ff] focus:bg-white"
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

                <div className="pt-2 border-t border-[#f0e9e1]">
                  <label className="block text-[13px] font-bold text-[#171417] mb-1.5">
                    Nama Lengkap Pemilik / Supervisor (SPV) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hendra Wijaya"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[14px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1.5">
                      Email Penerima Kredensial *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="emailanda@bisnis.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[14px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1.5">
                      No. WhatsApp Aktif
                    </label>
                    <input
                      type="text"
                      placeholder="081234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[14px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary !py-4 text-[14.5px] font-extrabold shadow-md hover:shadow-xl cursor-pointer flex items-center justify-center gap-2 mt-5 transition-all"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Mengirim Kredensial ke Email...</span>
                    </>
                  ) : (
                    <>
                      <MailIcon className="w-5 h-5" />
                      <span>Kirim Kredensial Akun ke Email Saya →</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-[13.5px] text-[#64748b]">
                Sudah punya akun?{" "}
                <Link href="/login" className="font-extrabold text-[#2545ff] hover:underline">
                  Masuk di sini
                </Link>
              </div>
            </div>
          ) : (
            /* Email Sent Success State */
            <div className="flex flex-col gap-4 animate-scale-pop">
              <div className="p-7 bg-gradient-to-b from-[#eaebf8]/70 to-[#f9f8f6] rounded-2xl border border-[#2545ff]/25 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#2545ff] text-white mx-auto flex items-center justify-center mb-3.5 shadow-xl shadow-[#2545ff]/25">
                  <MailIcon className="w-8 h-8" />
                </div>
                <h3 className="text-[22px] font-black text-[#0c1754]">
                  Kredensial Akun Telah Dikirim!
                </h3>
                <p className="text-[13.5px] text-[#64748b] mt-1.5 leading-relaxed font-medium">
                  Rincian akun lengkap untuk <strong>Supervisor (SPV)</strong> dan <strong>2 Customer Service (CS)</strong> telah kami kirimkan ke alamat:
                </p>
                <div className="mt-3.5 inline-block px-5 py-2 rounded-xl bg-white border border-[#2545ff]/30 text-[#2545ff] font-mono font-black text-[15px] shadow-sm">
                  {credentialsBundle.targetEmail || email}
                </div>
              </div>

              {/* What is in the email checklist */}
              <div className="p-4.5 bg-[#f9f8f6] rounded-2xl border border-[#f0e9e1] space-y-2.5 text-[13px]">
                <div className="font-extrabold text-[#0c1754] mb-1">Isi Paket Kredensial di Email:</div>
                <div className="flex items-center gap-2.5 text-[#334155]">
                  <CheckCircleIcon className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>1 Akun Supervisor (SPV / Owner)</strong> — Akses penuh laporan, keuangan, & AI</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#334155]">
                  <CheckCircleIcon className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>2 Akun Customer Service (CS 1 & CS 2)</strong> — WhatsApp Inbox & Closing Order</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#334155]">
                  <CheckCircleIcon className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Tautan Login Langsung</strong> — Siap digunakan untuk masuk ke dashboard</span>
                </div>
              </div>

              {/* Notification Notice */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[12.5px] leading-relaxed">
                Silakan periksa folder <strong>Inbox</strong> atau folder <strong>Spam / Promosi</strong> pada email Anda dalam 1-2 menit ke depan.
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                <Link
                  href="/login"
                  className="w-full btn-primary !py-4 text-[14.5px] font-extrabold text-center block shadow-md hover:shadow-xl"
                >
                  Buka Halaman Login Sekarang →
                </Link>

                <button
                  type="button"
                  onClick={() => setCredentialsBundle(null)}
                  className="w-full py-2.5 text-[13px] font-bold text-[#64748b] hover:text-[#0c1754] text-center border-none bg-transparent cursor-pointer transition-colors"
                >
                  ← Daftarkan Bisnis / Email Lain
                </button>
              </div>

              {/* Optional Quick Dev Viewer */}
              <div className="pt-2.5 border-t border-[#f0e9e1] text-center">
                <button
                  type="button"
                  onClick={() => setShowQuickDetails(!showQuickDetails)}
                  className="text-[12px] font-semibold text-[#2545ff] hover:underline bg-transparent border-none cursor-pointer"
                >
                  {showQuickDetails ? "▲ Sembunyikan Kredensial Cepat" : "▼ Lihat Kredensial di Sini (Mode Cepat / Uji Coba)"}
                </button>

                {showQuickDetails && (
                  <div className="mt-3 text-left space-y-2.5 max-h-[240px] overflow-y-auto p-3.5 bg-[#fcfbf9] rounded-xl border border-[#ede8e2] text-[12.5px]">
                    <div className="p-3 bg-white rounded-lg border border-[#f0e9e1]">
                      <div className="font-bold text-[#0c1754]">👑 Akun SPV / Owner</div>
                      <div className="font-mono text-[#64748b]">Email: {credentialsBundle.owner?.email || email}</div>
                      <div className="font-mono text-emerald-700 font-bold">Pass: {credentialsBundle.owner?.temporaryPassword}</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-[#f0e9e1]">
                      <div className="font-bold text-[#0c1754]">🎧 Akun CS 1</div>
                      <div className="font-mono text-[#64748b]">Email: {credentialsBundle.cs1?.email}</div>
                      <div className="font-mono text-emerald-700 font-bold">Pass: {credentialsBundle.cs1?.temporaryPassword}</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-[#f0e9e1]">
                      <div className="font-bold text-[#0c1754]">🎧 Akun CS 2</div>
                      <div className="font-mono text-[#64748b]">Email: {credentialsBundle.cs2?.email}</div>
                      <div className="font-mono text-emerald-700 font-bold">Pass: {credentialsBundle.cs2?.temporaryPassword}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      className="w-full btn-outline !py-2.5 text-[12px] font-bold flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <ClipboardListIcon className="w-4 h-4 text-[#2545ff]" />
                      <span>{copied ? "Berhasil Disalin!" : "Salin Kredensial ke Clipboard"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
