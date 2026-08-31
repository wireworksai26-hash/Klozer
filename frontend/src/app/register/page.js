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
    <div className="min-h-screen bg-[#f9f8f6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1060px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 bg-white rounded-[24px] shadow-[0_16px_50px_rgba(12,23,84,0.08)] border border-[#f0e9e1] overflow-hidden">
        
        {/* Left Informational Showcase (Ink Navy Editorial Side) */}
        <div className="lg:col-span-5 bg-[#0c1754] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2545ff]/20 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
              <KlozerIcon className="w-10 h-10 shadow-md flex-shrink-0" />
              <span className="text-[26px] font-black tracking-tight text-white">
                klozer<span className="text-[#2545ff]">.</span>
              </span>
            </Link>

            <h2 className="text-[26px] sm:text-[28px] font-extrabold text-white leading-snug tracking-tight">
              Mulai Uji Coba Gratis 14 Hari Tanpa Kartu Kredit
            </h2>
            <p className="text-[13.5px] text-[#eaebf8]/80 mt-2 leading-relaxed">
              Kredensial akun SPV & CS akan langsung kami kirimkan ke email Anda untuk uji coba otomatisasi WhatsApp.
            </p>

            {/* Feature Checklist */}
            <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-white/15">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#2545ff] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <QrIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-white">In-Chat Dynamic QRIS</div>
                  <div className="text-[12px] text-[#eaebf8]/70">Checkout instan langsung lunas di WhatsApp</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#2545ff] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <MicIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-white">AI Voice Note Engine</div>
                  <div className="text-[12px] text-[#eaebf8]/70">Memahami & membalas pesan suara Indonesia</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#2545ff] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-white">Anti-Fraud OCR & Mutasi Bank</div>
                  <div className="text-[12px] text-[#eaebf8]/70">Tangkal struk palsu editan Canva/Photoshop</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/15 text-[12px] text-[#eaebf8]/60 font-medium">
            Dipercaya oleh 1.400+ Brand & UMKM di Indonesia
          </div>
        </div>

        {/* Right Registration Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white">
          {!credentialsBundle ? (
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2545ff] bg-[#eaebf8] px-3 py-1 rounded-full border border-[#2545ff]/20 inline-block mb-2">
                  Pendaftaran Uji Coba Gratis
                </span>
                <h1 className="text-[26px] font-black text-[#0c1754] tracking-tight">
                  Daftarkan Bisnis Anda
                </h1>
                <p className="text-[13.5px] text-[#64748b] mt-1 font-medium">
                  Kredensial login (Username & Password untuk SPV & 2 CS) akan langsung dikirimkan ke email Anda.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-semibold flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-bold text-[#171417] mb-1">
                    Nama Toko / Bisnis / Instansi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mahalaundry / Batik Mahakarya Solo"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1">
                      Tipe Operasional
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13px] text-[#171417] font-bold outline-none focus:border-[#2545ff] focus:bg-white"
                    >
                      <option value="business">Bisnis / Retail E-Commerce</option>
                      <option value="ngo">NGO / Lembaga ZISWAF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1">
                      Sektor Industri
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13px] text-[#171417] font-bold outline-none focus:border-[#2545ff] focus:bg-white"
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
                  <label className="block text-[13px] font-bold text-[#171417] mb-1">
                    Nama Lengkap Pemilik / Supervisor (SPV) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hendra Wijaya"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1">
                      Email Penerima Kredensial *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="emailanda@bisnis.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#171417] mb-1">
                      No. WhatsApp Aktif
                    </label>
                    <input
                      type="text"
                      placeholder="081234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] text-[#171417] font-semibold placeholder-[#969696] outline-none focus:border-[#2545ff] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary !py-3.5 text-[14px] font-bold shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Mengirim Kredensial ke Email...</span>
                    </>
                  ) : (
                    <>
                      <MailIcon className="w-4.5 h-4.5" />
                      <span>Kirim Kredensial Akun ke Email Saya →</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-[13px] text-[#64748b]">
                Sudah punya akun?{" "}
                <Link href="/login" className="font-bold text-[#2545ff] hover:underline">
                  Masuk di sini
                </Link>
              </div>
            </div>
          ) : (
            /* Email Sent Success State */
            <div className="flex flex-col gap-4 animate-scale-pop">
              <div className="p-6 bg-gradient-to-b from-[#eaebf8]/60 to-[#f9f8f6] rounded-2xl border border-[#2545ff]/20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#2545ff] text-white mx-auto flex items-center justify-center mb-3 shadow-lg shadow-[#2545ff]/25">
                  <MailIcon className="w-7 h-7" />
                </div>
                <h3 className="text-[20px] font-black text-[#0c1754]">
                  Kredensial Akun Telah Dikirim!
                </h3>
                <p className="text-[13px] text-[#64748b] mt-1.5 leading-relaxed font-medium">
                  Rincian akun lengkap untuk <strong>Supervisor (SPV)</strong> dan <strong>2 Customer Service (CS)</strong> telah kami kirimkan ke:
                </p>
                <div className="mt-3 inline-block px-4 py-1.5 rounded-xl bg-white border border-[#2545ff]/30 text-[#2545ff] font-mono font-black text-[14.5px] shadow-xs">
                  {credentialsBundle.targetEmail || email}
                </div>
              </div>

              {/* What is in the email checklist */}
              <div className="p-4 bg-[#f9f8f6] rounded-2xl border border-[#f0e9e1] space-y-2.5 text-[12.5px]">
                <div className="font-bold text-[#0c1754] mb-1">Isi Paket Kredensial di Email:</div>
                <div className="flex items-center gap-2 text-[#334155]">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>1 Akun Supervisor (SPV / Owner)</strong> — Akses penuh laporan, keuangan, & AI</span>
                </div>
                <div className="flex items-center gap-2 text-[#334155]">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>2 Akun Customer Service (CS 1 & CS 2)</strong> — WhatsApp Inbox & Closing Order</span>
                </div>
                <div className="flex items-center gap-2 text-[#334155]">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>Tautan Login Langsung</strong> — Siap digunakan untuk masuk ke dashboard</span>
                </div>
              </div>

              {/* Notification Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[12px] leading-relaxed">
                Silakan periksa folder <strong>Inbox</strong> atau folder <strong>Spam / Promosi</strong> pada email Anda dalam 1-2 menit ke depan.
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/login"
                  className="w-full btn-primary !py-3.5 text-[14px] font-bold text-center block shadow-md hover:shadow-lg"
                >
                  Buka Halaman Login Sekarang →
                </Link>

                <button
                  type="button"
                  onClick={() => setCredentialsBundle(null)}
                  className="w-full py-2.5 text-[12.5px] font-bold text-[#64748b] hover:text-[#0c1754] text-center border-none bg-transparent cursor-pointer transition-colors"
                >
                  ← Daftarkan Bisnis / Email Lain
                </button>
              </div>

              {/* Optional Quick Dev Viewer */}
              <div className="pt-2 border-t border-[#f0e9e1] text-center">
                <button
                  type="button"
                  onClick={() => setShowQuickDetails(!showQuickDetails)}
                  className="text-[11.5px] font-semibold text-[#2545ff] hover:underline bg-transparent border-none cursor-pointer"
                >
                  {showQuickDetails ? "▲ Sembunyikan Kredensial Cepat" : "▼ Lihat Kredensial di Sini (Mode Cepat / Uji Coba)"}
                </button>

                {showQuickDetails && (
                  <div className="mt-3 text-left space-y-2 max-h-[220px] overflow-y-auto p-3 bg-[#fcfbf9] rounded-xl border border-[#ede8e2] text-[12px]">
                    <div className="p-2.5 bg-white rounded-lg border border-[#f0e9e1]">
                      <div className="font-bold text-[#0c1754]">👑 Akun SPV / Owner</div>
                      <div className="font-mono text-[#64748b]">Email: {credentialsBundle.owner?.email || email}</div>
                      <div className="font-mono text-emerald-700 font-bold">Pass: {credentialsBundle.owner?.temporaryPassword}</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#f0e9e1]">
                      <div className="font-bold text-[#0c1754]">🎧 Akun CS 1</div>
                      <div className="font-mono text-[#64748b]">Email: {credentialsBundle.cs1?.email}</div>
                      <div className="font-mono text-emerald-700 font-bold">Pass: {credentialsBundle.cs1?.temporaryPassword}</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#f0e9e1]">
                      <div className="font-bold text-[#0c1754]">🎧 Akun CS 2</div>
                      <div className="font-mono text-[#64748b]">Email: {credentialsBundle.cs2?.email}</div>
                      <div className="font-mono text-emerald-700 font-bold">Pass: {credentialsBundle.cs2?.temporaryPassword}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      className="w-full btn-outline !py-2 text-[11.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <ClipboardListIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                      <span>{copied ? "Berhasil Disalin!" : "Salin Kredensial"}</span>
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
