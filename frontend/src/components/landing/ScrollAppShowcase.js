"use client";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageSquareIcon, SparklesIcon, ShieldCheckIcon, TrendingUpIcon, CheckCircleIcon, CheckIcon } from "@/components/icons";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const tabList = ["whatsapp", "ai", "fraud", "analytics"];

export default function ScrollAppShowcase() {
  const sectionRef = useRef(null);
  const mockupRef = useRef(null);
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (!sectionRef.current || typeof window === "undefined") return;

    // Use ScrollTrigger matchMedia for perfect mobile & desktop adaptability
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      // Desktop / Tablet: Sticky Pin with Smooth Scroll Transitions
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=2200",
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const p = self.progress;
          setScrollProgress(p);

          let idx = 0;
          if (p < 0.28) {
            idx = 0;
          } else if (p < 0.55) {
            idx = 1;
          } else if (p < 0.8) {
            idx = 2;
          } else {
            idx = 3;
          }

          const targetTab = tabList[idx];
          setActiveTab((prev) => (prev !== targetTab ? targetTab : prev));
        },
      });

      gsap.fromTo(
        mockupRef.current,
        { rotateX: 10, scale: 0.96, transformPerspective: 1200 },
        {
          rotateX: 0,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            end: "top top",
            scrub: 1,
          },
        }
      );
    });

    return () => mm.revert();
  }, []);

  const tabs = [
    { id: "whatsapp", label: "WhatsApp Auto-Sales", icon: <MessageSquareIcon className="w-4 h-4" /> },
    { id: "ai", label: "Voice & Text AI Agent", icon: <SparklesIcon className="w-4 h-4" /> },
    { id: "fraud", label: "Anti-Struk Palsu", icon: <ShieldCheckIcon className="w-4 h-4" /> },
    { id: "analytics", label: "CRM Analytics", icon: <TrendingUpIcon className="w-4 h-4" /> },
  ];

  return (
    <section
      ref={sectionRef}
      className="min-h-screen bg-[#f4f1ea] border-b border-[#e8e3d9] flex flex-col justify-center py-12 md:py-16 relative overflow-hidden"
    >
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 flex flex-col justify-center">
        
        {/* Section Header */}
        <div className="text-center max-w-[800px] mx-auto mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2545ff]/10 border border-[#2545ff]/20 text-[#2545ff] text-[12px] font-bold tracking-wide uppercase mb-2">
            <span>Satu Aplikasi Terpadu</span>
          </div>
          <h2 className="text-display-headline text-[28px] sm:text-[38px] md:text-[46px] text-[#171417] leading-[1.15]">
            Kendalikan seluruh penjualan WhatsApp dalam{" "}
            <span className="italic-signature">satu layar pintar</span>
          </h2>
          <p className="text-[14px] sm:text-[16px] text-[#64748b] mt-2 max-w-[640px] mx-auto">
            Pantau performa staf CS, terbitkan QRIS instan, dan lacak konversi iklan secara real-time.
          </p>
        </div>

        {/* Tab Switcher with Mobile Horizontal Scrollable Pills */}
        <div className="flex flex-col items-center justify-center mb-6 w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-white rounded-full border border-[#e8e3d9] shadow-sm max-w-full overflow-x-auto scrollbar-none px-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[12px] sm:text-[14px] font-bold transition-all duration-300 border-none cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#2545ff] text-white shadow-md scale-102"
                      : "bg-transparent text-[#64748b] hover:text-[#0c1754] hover:bg-[#f9f8f6]"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-[#969696]"}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Scroll Progress Line (Desktop only) */}
          <div className="hidden md:block w-48 h-1 bg-[#e8e3d9] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[#2545ff] rounded-full transition-all duration-150"
              style={{ width: `${Math.min(100, Math.max(10, scrollProgress * 100))}%` }}
            />
          </div>
        </div>

        {/* Full-Screen Immersive App Window */}
        <div
          ref={mockupRef}
          className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#e8e3d9] shadow-[0_15px_50px_rgba(12,23,84,0.1)] overflow-hidden transition-all duration-300 w-full"
        >
          {/* Browser / App Header Bar */}
          <div className="bg-[#f9f8f6] px-4 sm:px-6 py-3 border-b border-[#e8e3d9] flex items-center justify-between">
            {/* Mac Window Dots */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#ff5f56] inline-block" />
              <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#ffbd2e] inline-block" />
              <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#27c93f] inline-block" />
            </div>

            {/* URL Search Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-3 sm:px-5 py-1 rounded-full border border-[#e8e3d9] text-[11px] sm:text-[12px] text-[#64748b] font-mono shadow-xs truncate max-w-[180px] sm:max-w-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>app.klozer.id / {activeTab}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Live Cloud Active</span>
              <span className="sm:hidden">Live</span>
            </div>
          </div>

          {/* Dynamic App Content Body */}
          <div className="p-4 sm:p-6 md:p-8 min-h-[380px] bg-white">
            
            {/* TAB 1: WhatsApp Auto-Sales */}
            {activeTab === "whatsapp" && (
              <div key="tab-wa" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center animate-scale-pop">
                <div className="lg:col-span-6 flex flex-col gap-3 sm:gap-4">
                  <span className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-wider text-[#2545ff]">
                    Tahap 1: Otomatisasi Chat & Kasir WhatsApp
                  </span>
                  <h3 className="text-[20px] sm:text-[24px] md:text-[28px] font-extrabold text-[#0c1754] leading-tight">
                    Balas ratusan chat pembeli dalam hitungan detik
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#64748b] leading-relaxed">
                    AI Klozer secara otomatis menangkap nama barang, ukuran varian, dan langsung menerbitkan tagihan lengkap dengan ongkos kirim.
                  </p>
                  <ul className="flex flex-col gap-2 text-[13px] sm:text-[14px] text-[#171417]">
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-[#2545ff] flex-shrink-0" />
                      <span>Katalog produk terintegrasi langsung di chat WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-[#2545ff] flex-shrink-0" />
                      <span>Pengurangan stok gudang otomatis saat status lunas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-[#2545ff] flex-shrink-0" />
                      <span>Invoice PDF berstempel resmi dikirim otomatis</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-6 bg-[#f9f8f6] p-4 sm:p-5 rounded-2xl border border-[#f0e9e1] shadow-inner">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#f0e9e1] mb-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[11px] sm:text-[12px]">
                      WA
                    </div>
                    <div>
                      <div className="text-[12px] sm:text-[13px] font-bold text-[#0c1754]">WhatsApp Business CS</div>
                      <div className="text-[10px] sm:text-[11px] text-emerald-600">● Online 24 Jam Nonstop</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-[12px] sm:text-[13px]">
                    <div className="bg-white p-3 rounded-xl max-w-[90%] border border-[#f0e9e1] text-[#171417] shadow-xs">
                      "Halo kak, mau order Kaos Polos Hitam XL 2 pcs kirim ke Bandung."
                    </div>
                    <div className="bg-[#eaebf8] text-[#0c1754] p-3 rounded-xl max-w-[95%] self-end border border-[#2545ff]/20 shadow-xs">
                      <div className="font-bold mb-1 flex items-center gap-1.5 text-emerald-700">
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>Pesanan Terkonfirmasi:</span>
                      </div>
                      <div>• 2x Kaos Polos Hitam XL (Rp 150.000)</div>
                      <div>• Ongkir J&T Express ke Bandung (Rp 12.000)</div>
                      <div className="font-extrabold text-[#2545ff] mt-1.5 pt-1.5 border-t border-black/10">
                        Total: Rp 312.000
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Voice & Text AI Agent */}
            {activeTab === "ai" && (
              <div key="tab-ai" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center animate-scale-pop">
                <div className="lg:col-span-6 flex flex-col gap-3 sm:gap-4">
                  <span className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-wider text-[#2545ff]">
                    Tahap 2: Speech-To-Text & Audio AI
                  </span>
                  <h3 className="text-[20px] sm:text-[24px] md:text-[28px] font-extrabold text-[#0c1754] leading-tight">
                    Paham pesan suara pelanggan dalam bahasa Indonesia
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#64748b] leading-relaxed">
                    Banyak pembeli yang malas mengetik dan memilih mengirim voice note. AI Klozer mampu mentranskripsi pesan suara dengan akurasi tinggi dan membalasnya dengan audio natural.
                  </p>
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-[12px] sm:text-[13px] font-medium border border-emerald-200 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Mendukung logat daerah, bahasa santai, dan istilah belanja online Indonesia.</span>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#f9f8f6] p-4 sm:p-5 rounded-2xl border border-[#f0e9e1]">
                  <div className="text-[12px] sm:text-[13px] font-bold text-[#0c1754] mb-2.5">Simulasi Audio Voice Note Masuk:</div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#f0e9e1] flex items-center gap-3 shadow-sm mb-3">
                    <button className="w-9 h-9 rounded-full bg-[#2545ff] text-white flex items-center justify-center border-none cursor-pointer hover:bg-[#1a35dd] flex-shrink-0">
                      ▶
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 h-5 sm:h-6">
                        {[40, 70, 90, 50, 80, 100, 60, 90, 40, 60, 80, 50, 30, 70, 85].map((h, i) => (
                          <div key={i} style={{ height: `${h}%` }} className="w-1 bg-[#2545ff] rounded-full" />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-[11px] text-[#969696] mt-1">
                        <span>Pesan Suara (0:14)</span>
                        <span>Transkripsi Instan</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#eaebf8] p-3 rounded-xl text-[12px] text-[#0c1754] leading-relaxed">
                    <span className="font-bold">Hasil Transkripsi AI:</span> "Mbak, saya mau pesan gamis warna maroon size M satu buah, bisa COD ke Surabaya?"
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Anti-Struk Palsu */}
            {activeTab === "fraud" && (
              <div key="tab-fraud" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center animate-scale-pop">
                <div className="lg:col-span-6 flex flex-col gap-3 sm:gap-4">
                  <span className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-wider text-[#2545ff]">
                    Tahap 3: Proteksi Penipuan & Auto Reconcile
                  </span>
                  <h3 className="text-[20px] sm:text-[24px] md:text-[28px] font-extrabold text-[#0c1754] leading-tight">
                    Cegah kerugian akibat bukti transfer editan
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#64748b] leading-relaxed">
                    AI mendeteksi manipulasi gambar pada struk transfer dan mencocokkan mutasi bank secara real-time. Barang hanya disetujui kirim jika uang sudah 100% masuk ke rekening Anda.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-white rounded-xl border border-[#f0e9e1]">
                      <div className="text-[15px] sm:text-[16px] font-extrabold text-emerald-600">100%</div>
                      <div className="text-[11px] sm:text-[12px] text-[#64748b]">Mutasi Bank Valid</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#f0e9e1]">
                      <div className="text-[15px] sm:text-[16px] font-extrabold text-[#2545ff]">0 Detik</div>
                      <div className="text-[11px] sm:text-[12px] text-[#64748b]">Verifikasi Otomatis</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#f9f8f6] p-4 sm:p-5 rounded-2xl border border-[#f0e9e1]">
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-emerald-500 shadow-md">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#f0e9e1] mb-2.5">
                      <span className="text-[12px] sm:text-[13px] font-bold text-[#0c1754]">Audit Keamanan</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                        <CheckIcon className="w-3 h-3" />
                        <span>Terverifikasi Asli</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-[11px] sm:text-[12px] text-[#171417]">
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Nominal Mutasi:</span>
                        <span className="font-bold text-[#0c1754]">Rp 450.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Bank Penerima:</span>
                        <span className="font-bold text-[#0c1754]">BCA (8921-xxxx)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Waktu Masuk:</span>
                        <span className="font-bold text-[#0c1754]">10:23:42 WIB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CRM Analytics */}
            {activeTab === "analytics" && (
              <div key="tab-analytics" className="flex flex-col gap-4 sm:gap-6 animate-scale-pop">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f9f8f6] border border-[#f0e9e1]">
                    <span className="text-[11px] sm:text-[12px] font-bold text-[#64748b]">Total Interaksi</span>
                    <div className="text-[22px] sm:text-[26px] font-extrabold text-[#0c1754] my-1">14,248</div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600">↑ 12.5% vs bulan lalu</span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f9f8f6] border border-[#f0e9e1]">
                    <span className="text-[11px] sm:text-[12px] font-bold text-[#64748b]">Closing Rate</span>
                    <div className="text-[22px] sm:text-[26px] font-extrabold text-[#0c1754] my-1">82.4%</div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600">↑ 4.2% dengan QRIS</span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f9f8f6] border border-[#f0e9e1]">
                    <span className="text-[11px] sm:text-[12px] font-bold text-[#64748b]">Real ROAS Iklan</span>
                    <div className="text-[22px] sm:text-[26px] font-extrabold text-[#0c1754] my-1">19.2x</div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600">Lacak via Meta CAPI</span>
                  </div>
                </div>

                {/* Volume Bar Chart */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#f9f8f6] border border-[#f0e9e1]">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[12px] sm:text-[13px] font-bold text-[#0c1754]">Volume Interaksi Harian</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#2545ff]">Aktif & Lunas</span>
                  </div>
                  <div className="flex items-end justify-between gap-2 sm:gap-3 h-[110px] sm:h-[130px] pt-3 px-1 sm:px-2">
                    {[
                      { d: "D1", val: 35 },
                      { d: "D2", val: 65 },
                      { d: "D3", val: 45 },
                      { d: "D4", val: 80 },
                      { d: "D5", val: 55 },
                      { d: "D6", val: 100, active: true },
                      { d: "D7", val: 75 },
                    ].map((bar) => (
                      <div key={bar.d} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-[#eaebf8] rounded-t-lg h-[80px] sm:h-[95px] flex items-end overflow-hidden">
                          <div
                            style={{ height: `${bar.val}%` }}
                            className={`w-full rounded-t-lg transition-all duration-500 ${
                              bar.active ? "bg-[#2545ff]" : "bg-[#2545ff]/40"
                            }`}
                          />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-[#64748b]">{bar.d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}
