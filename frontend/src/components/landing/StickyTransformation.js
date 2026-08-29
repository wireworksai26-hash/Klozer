"use client";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckCircleIcon } from "@/components/icons";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stages = [
  {
    id: "masalah",
    navLabel: "1. Permasalahan",
    badge: "Kondisi Manual (Sebelum)",
    title: "Chat Menumpuk & Penipuan Struk Palsu",
    desc: "Ketika obrolan WhatsApp bisnis membludak, staf CS kewalahan membalas satu per satu. Pembeli kabur karena respon lambat, dan bisnis rentan tertipu bukti transfer editan.",
    bulletPoints: [
      "Pelanggan menunggu berjam-jam hanya untuk tanya total harga dan rekening",
      "CS sering salah catat varian produk atau alamat kirim pembeli",
      "Rentan tertipu struk palsu karena tidak sempat cek mutasi bank manual",
    ],
    cardTag: "Kondisi Manual (Sebelum)",
    cardContent: (
      <div className="flex flex-col gap-3">
        <div className="bg-red-50 p-3.5 sm:p-4 rounded-xl border border-red-200 text-red-800 text-[12.5px] sm:text-[13px]">
          <div className="font-bold mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>48 Chat Belum Dibalas (&gt;2 Jam)</span>
          </div>
          <div>Banyak calon pembeli yang beralih belanja ke toko kompetitor karena lambat respon.</div>
        </div>
        <div className="bg-[#f9f8f6] p-3 rounded-xl border border-[#f0e9e1] text-[11.5px] sm:text-[12px] text-[#64748b] flex items-center justify-between">
          <span className="font-bold text-red-600">Terdeteksi:</span>
          <span>Bukti transfer tidak tertera di mutasi bank.</span>
        </div>
      </div>
    ),
  },
  {
    id: "solusi",
    navLabel: "2. Solusi Cerdas",
    badge: "Sistem Otomatis Klozer",
    title: "Pendekatan Terpusat & QRIS Otomatis",
    desc: "Klozer mengintegrasikan seluruh alur transaksi: mulai dari tangkap pesanan, terbitkan QRIS instan di chat, transkripsi voice note, hingga cek mutasi bank otomatis tanpa jeda.",
    bulletPoints: [
      "AI menangkap nama barang, varian, dan alamat pengiriman seketika",
      "Dynamic QRIS langsung muncul di chat, pembeli tinggal scan dan bayar",
      "Voice Note AI memahami rekaman suara pelanggan bahasa Indonesia",
    ],
    cardTag: "Sistem Otomatis Klozer",
    cardContent: (
      <div className="flex flex-col gap-3">
        <div className="bg-[#eaebf8] p-3.5 sm:p-4 rounded-xl border border-[#2545ff]/20 text-[#0c1754] text-[12.5px] sm:text-[13px]">
          <div className="font-bold text-[#2545ff] mb-1">✦ QRIS Rp 312.000 Terbit Otomatis</div>
          <div>Kode QRIS langsung dikirim ke WhatsApp pembeli dengan batas waktu pembayaran 15 menit.</div>
        </div>
        <div className="bg-[#f9f8f6] p-3 rounded-xl border border-[#f0e9e1] text-[11.5px] sm:text-[12px] flex items-center justify-between">
          <span className="text-[#64748b]">Waktu Respon Chat:</span>
          <span className="font-bold text-emerald-600">1.8 Detik (Instan)</span>
        </div>
      </div>
    ),
  },
  {
    id: "hasil",
    navLabel: "3. Hasil Nyata",
    badge: "Pertumbuhan Bisnis",
    title: "Omzet Naik 2-3x Lipat Tanpa Beban CS",
    desc: "Toko Anda dapat melayani pesanan 24 jam nonstop bahkan saat tengah malam. Rekonsiliasi keuangan 100% akurat dan laporan omzet iklan Meta Ads terlacak presisi.",
    bulletPoints: [
      "Closing rate naik rata-rata hingga 82.4%",
      "Staf CS dapat fokus pada pelayanan VIP dan strategi promosi",
      "Cashback ongkir multi-kurir 15-25% langsung menambah profit toko",
    ],
    cardTag: "Pertumbuhan Bisnis Nyata",
    cardContent: (
      <div className="flex flex-col gap-3">
        <div className="bg-emerald-50 p-3.5 sm:p-4 rounded-xl border border-emerald-200 text-emerald-800 text-[12.5px] sm:text-[13px]">
          <div className="font-bold mb-1 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>64 Pesanan Lunas Hari Ini</span>
          </div>
          <div>Omzet Rp 18.750.000 tercapai secara otomatis tanpa kendala salah kirim.</div>
        </div>
        <div className="bg-[#f9f8f6] p-3 rounded-xl border border-[#f0e9e1] text-[11.5px] sm:text-[12px] flex items-center justify-between">
          <span className="text-[#64748b]">Akurasi Transaksi:</span>
          <span className="font-bold text-[#2545ff]">100% Real-Time Cocok</span>
        </div>
      </div>
    ),
  },
];

export default function StickyTransformation() {
  const sectionRef = useRef(null);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (!sectionRef.current || typeof window === "undefined") return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=1800",
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress;
          let idx = 0;
          if (p < 0.35) {
            idx = 0;
          } else if (p < 0.7) {
            idx = 1;
          } else {
            idx = 2;
          }
          setActiveStage((prev) => (prev !== idx ? idx : prev));
        },
      });
    });

    return () => mm.revert();
  }, []);

  const current = stages[activeStage];

  return (
    <section
      ref={sectionRef}
      className="min-h-screen bg-[#f9f8f6] border-b border-[#f0e9e1] flex flex-col justify-center py-12 md:py-16 relative overflow-hidden"
    >
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        
        {/* Section Headline */}
        <div className="mb-8 md:mb-10 text-left">
          <span className="eyebrow-label text-[#2545ff] block mb-1.5 sm:mb-2">
            TRANSFORMASI PENJUALAN
          </span>
          <h2 className="text-display-headline text-[28px] sm:text-[38px] md:text-[48px] text-[#171417] leading-[1.12]">
            Masalah Transformasi{" "}
            <span className="italic-signature">Penjualan Komunikasi</span>
          </h2>
        </div>

        {/* 2-Column Split: Responsive Left & Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-14 items-center">
          
          {/* Left Column / Mobile Top Tabs: Vertical on desktop, horizontal scrollable pills on mobile */}
          <div className="lg:col-span-4 flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {stages.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(idx)}
                  className={`text-left p-3 sm:p-4 rounded-2xl transition-all duration-300 border cursor-pointer flex items-center gap-2.5 sm:gap-3.5 whitespace-nowrap flex-shrink-0 lg:flex-shrink ${
                    isActive
                      ? "bg-white text-[#0c1754] font-extrabold border-[#f0e9e1] shadow-md scale-102"
                      : "bg-transparent text-[#969696] hover:text-[#0c1754] font-medium border-transparent hover:bg-white/50"
                  }`}
                >
                  <span
                    className={`w-1.5 sm:w-2 h-6 sm:h-8 rounded-full transition-all duration-300 ${
                      isActive ? "bg-[#2545ff]" : "bg-[#e8e3d9]"
                    }`}
                  />
                  <div>
                    <span className="text-[14px] sm:text-[17px] block">{stage.navLabel}</span>
                    <span className="text-[10px] sm:text-[11px] text-[#969696] font-normal hidden sm:block">{stage.badge}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Dynamic Stage Content */}
          <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6">
            
            {/* Title & Desc with smooth scale pop */}
            <div key={`text-${activeStage}`} className="animate-scale-pop">
              <h3 className="text-[20px] sm:text-[26px] md:text-[30px] font-bold text-[#0c1754] mb-2 sm:mb-3">
                {current.title}
              </h3>
              <p className="text-[14px] sm:text-[16px] text-[#64748b] leading-relaxed mb-4 sm:mb-6">
                {current.desc}
              </p>

              {/* Bullet points */}
              <ul className="flex flex-col gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                {current.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 sm:gap-3 text-[13.5px] sm:text-[15px] text-[#171417]">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[#2545ff] mt-0.5 flex-shrink-0">
                      <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactive Preview Card Container */}
            <div
              key={`card-${activeStage}`}
              className="bg-white rounded-2xl p-5 sm:p-7 border border-[#f0e9e1] shadow-[0_8px_30px_rgba(12,23,84,0.08)] animate-scale-pop"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-3 sm:mb-4">
                <span className="text-[12px] sm:text-[13px] font-bold text-[#0c1754]">{current.cardTag}</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#2545ff] bg-[#eaebf8] px-2.5 py-0.5 sm:py-1 rounded-full">
                  Tahap {activeStage + 1} dari 3
                </span>
              </div>

              {current.cardContent}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
