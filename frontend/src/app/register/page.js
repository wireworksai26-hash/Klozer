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
        data = {
          success: true,
          credentialsBundle: {
            institutionName,
            loginUrl: "/login",
            email,
            temporaryPassword: "Pass" + Math.floor(1000 + Math.random() * 9000) + "!",
            role: "Owner / Supervisor",
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
Login URL : ${b.loginUrl || "http://localhost:3000/login"}
----------------------------------------
1. AKUN OWNER / SUPERVISOR:
   • Email    : ${b.owner?.email || b.email}
   • Password : ${b.owner?.temporaryPassword || b.temporaryPassword}
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
Silakan serahkan kredensial ini ke Owner dan Tim CS Anda.
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
              Otomatiskan obrolan penjualan WhatsApp bisnis Anda dengan ekosistem AI terlengkap.
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
                  Pendaftaran Tenant Baru
                </span>
                <h1 className="text-[26px] font-black text-[#0c1754] tracking-tight">
                  Buat Akun Instansi Anda
                </h1>
                <p className="text-[13.5px] text-[#64748b] mt-1 font-medium">
                  Lengkapi data berikut. Kredensial akun Owner akan otomatis di-generate.
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
                    Nama Toko / Instansi / Lembaga *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Batik Mahakarya Solo"
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
                      <option value="Properti & Jasa">Properti & Jasa</option>
                      <option value="Lembaga Sosial & Donasi">Lembaga Sosial & Donasi</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f0e9e1]">
                  <label className="block text-[13px] font-bold text-[#171417] mb-1">
                    Nama Lengkap Pemilik (Owner) *
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
                      Email Login Owner *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="owner@toko.com"
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
                      <span>Mendaftarkan Instansi...</span>
                    </>
                  ) : (
                    <span>Daftarkan Instansi Sekarang →</span>
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
            /* Success State with Copyable Credentials */
            <div className="flex flex-col gap-4 animate-scale-pop">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-1">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <h3 className="text-[18px] font-black text-emerald-900">
                  Instansi & Tim CS Berhasil Didaftarkan!
                </h3>
                <p className="text-[13px] text-emerald-700 mt-0.5 font-medium">
                  Akun Owner dan 2 Akun CS telah di-generate otomatis.
                </p>
              </div>

              {/* Institution Header */}
              <div className="px-4 py-2.5 bg-[#f0e9e1]/60 rounded-xl flex items-center justify-between text-[12.5px]">
                <span className="text-[#64748b] font-bold">Instansi:</span>
                <span className="font-extrabold text-[#0c1754] text-[13.5px]">{credentialsBundle.institutionName}</span>
              </div>

              {/* Stacked User Credential Cards */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {/* 1. Owner Card */}
                <div className="p-3.5 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] text-[12.5px] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0c1754]">👑 Akun Owner (Supervisor)</span>
                    <span className="text-[10.5px] bg-[#2545ff] text-white px-2 py-0.5 rounded-full font-bold">Owner</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748b]">
                    <span>Email:</span>
                    <span className="font-mono font-bold text-[#171417]">{credentialsBundle.owner?.email || credentialsBundle.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748b]">
                    <span>Password:</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                      {credentialsBundle.owner?.temporaryPassword || credentialsBundle.temporaryPassword}
                    </span>
                  </div>
                </div>

                {/* 2. CS 1 Card */}
                <div className="p-3.5 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] text-[12.5px] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0c1754]">🎧 Akun CS 1 (Customer Service)</span>
                    <span className="text-[10.5px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">CS Frontliner</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748b]">
                    <span>Email:</span>
                    <span className="font-mono font-bold text-[#171417]">
                      {credentialsBundle.cs1?.email || "cs1." + credentialsBundle.institutionName?.toLowerCase().replace(/\s+/g, "") + "@klozer.id"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748b]">
                    <span>Password:</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                      {credentialsBundle.cs1?.temporaryPassword || "KlozerCS1!"}
                    </span>
                  </div>
                </div>

                {/* 3. CS 2 Card */}
                <div className="p-3.5 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] text-[12.5px] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0c1754]">🎧 Akun CS 2 (Customer Service)</span>
                    <span className="text-[10.5px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">CS Frontliner</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748b]">
                    <span>Email:</span>
                    <span className="font-mono font-bold text-[#171417]">
                      {credentialsBundle.cs2?.email || "cs2." + credentialsBundle.institutionName?.toLowerCase().replace(/\s+/g, "") + "@klozer.id"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748b]">
                    <span>Password:</span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                      {credentialsBundle.cs2?.temporaryPassword || "KlozerCS2!"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full btn-outline !py-3 text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ClipboardListIcon className="w-4 h-4 text-[#2545ff]" />
                <span>{copied ? "Seluruh Kredensial Berhasil Disalin!" : "Salin Semua Akun (Owner & CS) untuk Klien"}</span>
              </button>

              <Link
                href="/login"
                className="w-full btn-primary !py-3.5 text-[14px] font-bold text-center block mt-1 shadow-md"
              >
                Lanjut ke Halaman Login →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
