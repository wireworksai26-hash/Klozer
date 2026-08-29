"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircleIcon } from "@/components/icons";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      badge: "UKM & Toko Baru",
      price: isAnnual ? "159.000" : "199.000",
      period: "/bulan",
      subPeriod: isAnnual ? "Ditagih tahunan (Hemat 20%)" : "Ditagih bulanan",
      desc: "Sangat cocok untuk toko online yang ingin mulai menerima pembayaran QRIS otomatis di WhatsApp.",
      features: [
        "1 Nomor WhatsApp Resmi Bisnis (Cloud API)",
        "2 Akun Customer Service (CS)",
        "Pembayaran QRIS Otomatis Langsung di Chat",
        "Asisten AI Pintar Balas Chat Teks",
        "Katalog Produk & Pengurangan Stok Otomatis",
        "Laporan Penjualan & Rekap Omzet Harian",
      ],
      highlight: false,
      cta: "Pilih Paket Starter",
    },
    {
      name: "Pro",
      badge: "Paling Populer · Rekomendasi",
      price: isAnnual ? "399.000" : "499.000",
      period: "/bulan",
      subPeriod: isAnnual ? "Ditagih tahunan (Hemat 20%)" : "Ditagih bulanan",
      desc: "Pilihan terbaik untuk brand & toko yang ingin otomatisasi penuh dengan AI Suara & Proteksi Struk Palsu.",
      features: [
        "Semua fitur di Paket Starter",
        "5 Akun Customer Service (CS) + Hitung Komisi",
        "AI Memahami & Membalas Pesan Suara (Voice Note)",
        "Deteksi Otomatis Bukti Transfer Palsu",
        "Pencocokan Mutasi Bank Otomatis (BCA/Mandiri/BRI)",
        "Follow-Up Otomatis Calon Pembeli yang Ghosting",
        "Cek Ongkir Semua Kurir & Cetak Resi 1-Klik",
        "Pelacakan Omzet Iklan Facebook & Instagram",
      ],
      highlight: true,
      cta: "Pilih Paket Pro Sekarang",
    },
    {
      name: "Enterprise",
      badge: "Bisnis Besar & Lembaga Sosial",
      price: "Kustom",
      period: "",
      subPeriod: "Sesuai kebutuhan transaksi",
      desc: "Kustomisasi penuh untuk volume transaksi tinggi, multi-cabang, atau lembaga donasi & zakat.",
      features: [
        "Semua fitur di Paket Pro",
        "Akun CS Tanpa Batas (Unlimited Multi-Seat)",
        "Mode Khusus Lembaga Sosial (Zakat & Donasi)",
        "Pembacaan Doa Donatur Otomatis via Suara AI",
        "Integrasi Sistem Gudang & ERP Toko Anda",
        "Pendampingan Setup & Layanan Prioritas 24/7",
      ],
      highlight: false,
      cta: "Hubungi Tim Penjualan",
    },
  ];

  return (
    <section id="harga" className="py-20 md:py-28 bg-[#faf9f6] border-b border-[#e8e3d9]">
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        
        {/* Section Header */}
        <div className="text-center max-w-[720px] mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2545ff]/10 border border-[#2545ff]/20 text-[#2545ff] text-[12px] font-bold tracking-wide uppercase mb-3">
            <span>Investasi Bisnis yang Terjangkau</span>
          </div>
          <h2 className="editorial-headline text-[28px] sm:text-[38px] md:text-[44px] mt-1 mb-4">
            Pilihan paket hemat yang{" "}
            <span className="editorial-italic">langsung menghasilkan omzet</span>
          </h2>
          <p className="text-[16px] sm:text-[17px] text-[#334155] leading-relaxed">
            Tidak ada biaya tersembunyi. Anda bisa beralih paket kapan saja sesuai perkembangan bisnis Anda.
          </p>

          {/* Interactive Monthly / Annual Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-white border border-[#e8e3d9] shadow-sm mt-6">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all border-none cursor-pointer ${
                !isAnnual
                  ? "bg-[#2545ff] text-white shadow-sm"
                  : "bg-transparent text-[#334155] hover:text-[#080e2b]"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                isAnnual
                  ? "bg-[#2545ff] text-white shadow-sm"
                  : "bg-transparent text-[#334155] hover:text-[#080e2b]"
              }`}
            >
              <span>Tahunan</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                Hemat 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch max-w-[1180px] mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 ${
                plan.highlight
                  ? "bg-[#0c1754] text-white border-2 border-[#2545ff] shadow-[0_20px_50px_rgba(37,69,255,0.2)] lg:-translate-y-2"
                  : "bg-white text-[#0f172a] border border-[#e8e3d9] shadow-sm hover:shadow-md"
              }`}
            >
              
              {/* Plan Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    plan.highlight 
                      ? "bg-[#2545ff] text-white" 
                      : "bg-[#eef2ff] text-[#2545ff]"
                  }`}>
                    {plan.badge}
                  </span>
                </div>

                <h3 className={`text-[22px] font-bold mb-2 ${plan.highlight ? "text-white" : "text-[#080e2b]"}`}>
                  {plan.name}
                </h3>

                <p className={`text-[13px] sm:text-[14px] leading-relaxed mb-6 ${
                  plan.highlight ? "text-[#cbd5e1]" : "text-[#64748b]"
                }`}>
                  {plan.desc}
                </p>

                {/* Price Display with Smooth Number Update */}
                <div className={`flex flex-col py-4 border-y border-dashed mb-6 ${
                  plan.highlight ? "border-white/15" : "border-[#e8e3d9]"
                }`}>
                  <div className="flex items-baseline gap-1">
                    {plan.price !== "Kustom" && (
                      <span className={`text-[16px] font-bold ${plan.highlight ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                        Rp
                      </span>
                    )}
                    <span className={`text-[36px] sm:text-[42px] font-extrabold tracking-tight leading-none transition-all duration-300 ${
                      plan.highlight ? "text-white" : "text-[#080e2b]"
                    }`}>
                      {plan.price}
                    </span>
                    <span className={`text-[14px] font-medium ml-1 ${plan.highlight ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold mt-1.5 ${
                    plan.highlight ? "text-emerald-400" : "text-emerald-700"
                  }`}>
                    {plan.subPeriod}
                  </span>
                </div>

                {/* Feature Checklist */}
                <ul className="flex flex-col gap-3.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[13px] sm:text-[14px] leading-snug">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.highlight ? "text-[#4866ff]" : "text-[#2545ff]"
                      }`}>
                        <CheckCircleIcon className="w-4 h-4" />
                      </div>
                      <span className={plan.highlight ? "text-[#eef2ff]/90" : "text-[#334155]"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  href="/register"
                  className={`w-full text-center py-3.5 px-6 rounded-full font-bold text-[14px] sm:text-[15px] transition-all no-underline block justify-center ${
                    plan.highlight
                      ? "btn-primary !shadow-[0_8px_25px_rgba(37,69,255,0.45)]"
                      : "btn-secondary hover:!bg-[#2545ff] hover:!text-white hover:!border-[#2545ff]"
                  }`}
                >
                  <span>{plan.cta}</span>
                </Link>
              </div>

            </div>
          ))}
        </div>

        {/* Add-on Summary Card */}
        <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-white border border-[#e8e3d9] max-w-[800px] mx-auto text-center shadow-sm">
          <div className="text-[13px] font-bold text-[#080e2b] uppercase tracking-wider mb-2">
            Biaya Transaksi Payment Gateway Resmi
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-[13px] sm:text-[14px] text-[#334155]">
            <div>
              <span className="text-[#64748b]">Biaya QRIS:</span>{" "}
              <strong className="text-[#2545ff]">Rp 750 / transaksi</strong>
            </div>
            <span className="text-[#cbd5e1] hidden sm:inline">•</span>
            <div>
              <span className="text-[#64748b]">Virtual Account:</span>{" "}
              <strong className="text-[#2545ff]">Rp 2.500 / transaksi</strong>
            </div>
            <span className="text-[#cbd5e1] hidden sm:inline">•</span>
            <div>
              <span className="text-[#64748b]">Tambah Akun CS:</span>{" "}
              <strong className="text-[#2545ff]">Rp 75.000 / seat / bln</strong>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
