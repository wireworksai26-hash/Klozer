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
    <section id="harga" className="py-20 md:py-28 bg-canvas border-b border-line">
      <div className="container-page">
        
        {/* Section Header */}
        <div className="text-center max-w-[720px] mx-auto mb-12">
          <span className="eyebrow-label text-brand block mb-3">Investasi Bisnis yang Terjangkau</span>
          <h2 className="section-title">
            Pilihan paket hemat yang{" "}
            <span className="italic-signature">langsung menghasilkan omzet</span>
          </h2>
          <p className="section-lead">
            Tidak ada biaya tersembunyi. Anda bisa beralih paket kapan saja sesuai perkembangan bisnis Anda.
          </p>

          {/* Interactive Monthly / Annual Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-white border border-line shadow-sm mt-6">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-full text-body-sm font-bold transition-all border-none cursor-pointer ${
                !isAnnual
                  ? "bg-brand text-white shadow-sm"
                  : "bg-transparent text-fg hover:text-ink"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-full text-body-sm font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                isAnnual
                  ? "bg-brand text-white shadow-sm"
                  : "bg-transparent text-fg hover:text-ink"
              }`}
            >
              <span>Tahunan</span>
              <span className="text-micro bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                Hemat 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-[1180px] mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 ${
                plan.highlight
                  ? "bg-ink text-white border-2 border-brand shadow-[0_20px_50px_rgba(37,69,255,0.2)] lg:-translate-y-2"
                  : "bg-white text-fg border border-line shadow-sm hover:shadow-md"
              }`}
            >
              
              {/* Plan Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-caption font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    plan.highlight 
                      ? "bg-brand text-white" 
                      : "bg-brand-soft text-brand"
                  }`}>
                    {plan.badge}
                  </span>
                </div>

                <h3 className={`text-subheading font-bold mb-2 ${plan.highlight ? "text-white" : "text-ink"}`}>
                  {plan.name}
                </h3>

                <p className={`text-body-sm leading-relaxed mb-6 ${
                  plan.highlight ? "text-line-strong" : "text-fg-muted"
                }`}>
                  {plan.desc}
                </p>

                {/* Price Display with Smooth Number Update */}
                <div className={`flex flex-col py-4 border-y border-dashed mb-6 ${
                  plan.highlight ? "border-white/15" : "border-line"
                }`}>
                  <div className="flex items-baseline gap-1">
                    {plan.price !== "Kustom" && (
                      <span className={`text-body font-bold ${plan.highlight ? "text-line-strong" : "text-fg-muted"}`}>
                        Rp
                      </span>
                    )}
                    <span className={`text-heading-lg font-bold tracking-tight leading-none transition-all duration-300 ${
                      plan.highlight ? "text-white" : "text-ink"
                    }`}>
                      {plan.price}
                    </span>
                    <span className={`text-body-sm font-medium ml-1 ${plan.highlight ? "text-line-strong" : "text-fg-muted"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <span className={`text-caption font-semibold mt-1.5 ${
                    plan.highlight ? "text-emerald-400" : "text-emerald-700"
                  }`}>
                    {plan.subPeriod}
                  </span>
                </div>

                {/* Feature Checklist */}
                <ul className="flex flex-col gap-3.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-body-sm leading-snug">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.highlight ? "text-brand-light" : "text-brand"
                      }`}>
                        <CheckCircleIcon className="w-4 h-4" />
                      </div>
                      <span className={plan.highlight ? "text-brand-soft/90" : "text-fg"}>
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
                  className={`w-full text-center py-3.5 px-6 rounded-full font-bold text-body-sm sm:text-body transition-all no-underline block justify-center ${
                    plan.highlight
                      ? "btn-primary !shadow-[0_8px_25px_rgba(37,69,255,0.45)]"
                      : "btn-secondary hover:!bg-brand hover:!text-white hover:!border-brand"
                  }`}
                >
                  <span>{plan.cta}</span>
                </Link>
              </div>

            </div>
          ))}
        </div>

        {/* Add-on Summary Card */}
        <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-white border border-line max-w-[800px] mx-auto text-center shadow-sm">
          <div className="text-body-sm font-bold text-ink uppercase tracking-wider mb-2">
            Biaya Transaksi Payment Gateway Resmi
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-body-sm text-fg">
            <div>
              <span className="text-fg-muted">Biaya QRIS:</span>{" "}
              <strong className="text-brand">Rp 750 / transaksi</strong>
            </div>
            <span className="text-line-strong hidden sm:inline">•</span>
            <div>
              <span className="text-fg-muted">Virtual Account:</span>{" "}
              <strong className="text-brand">Rp 2.500 / transaksi</strong>
            </div>
            <span className="text-line-strong hidden sm:inline">•</span>
            <div>
              <span className="text-fg-muted">Tambah Akun CS:</span>{" "}
              <strong className="text-brand">Rp 75.000 / seat / bln</strong>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
