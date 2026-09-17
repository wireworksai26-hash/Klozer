"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HowItWorks() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      // Subtle staggered reveal with gentle micro-tilt on scroll
      gsap.fromTo(
        ".step-workflow-card",
        { y: 50, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.9,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
          },
        }
      );

      // Desktop-Only Parallax float (Disabled on Mobile to keep uniform vertical spacing)
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        gsap.to(".step-card-1", {
          y: -20,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          },
        });

        gsap.to(".step-card-3", {
          y: 20,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="cara-kerja" ref={containerRef} className="py-14 sm:py-18 md:py-24 bg-[#f9f8f6] border-b border-[#f0e9e1] overflow-hidden">
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        
        {/* Section Headline */}
        <div className="text-center max-w-[800px] mx-auto mb-16 md:mb-20">
          <span className="eyebrow-label text-[#2545ff] block mb-2">ALUR KERJA TERPADU</span>
          <h2 className="text-display-headline text-[32px] sm:text-[42px] md:text-[48px] text-[#171417] leading-[1.15]">
            Solusi praktis. Arah yang jelas.<br />
            Penjualan otomatis dalam 3 langkah mudah.
          </h2>
        </div>

        {/* 3 Step Cards with connecting arrows */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-7 max-w-[1100px] mx-auto relative mb-10">
          
          {/* Card 1: Tampung Pesanan */}
          <div className="step-workflow-card step-card-1 relative group">
            <div className="bg-[#0c1754] text-white rounded-[22px] p-6 sm:p-7 shadow-[0_12px_36px_rgba(12,23,84,0.14)] min-h-[230px] sm:min-h-[280px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-1.5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[12px] shadow-sm">
                    1
                  </span>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-white/60">
                    Langkah 1
                  </span>
                </div>
                <h3 className="text-[20px] font-bold text-white mb-2 leading-snug">
                  Tangkap Pesanan Otomatis
                </h3>
                <p className="text-[13.5px] text-white/80 leading-relaxed">
                  AI menyapa pembeli 24/7, mencatat varian produk, dan menghitung total harga beserta ongkir seketika.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[11.5px] text-white/70">
                <span>Respon &lt; 2 detik</span>
                <span className="text-[#8ba2ff] font-bold">24 Jam Aktif</span>
              </div>
            </div>

            {/* Curved arrow to card 2 (desktop only) */}
            <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-[#2545ff]">
                <path d="M2 12C12 4 28 4 38 12M38 12L30 6M38 12L30 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3"/>
              </svg>
            </div>
          </div>

          {/* Card 2: Bayar Instan QRIS */}
          <div className="step-workflow-card relative group">
            <div className="bg-[#2545ff] text-white rounded-[22px] p-6 sm:p-7 shadow-[0_12px_36px_rgba(37,69,255,0.22)] min-h-[230px] sm:min-h-[280px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-1.5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-white text-[#2545ff] flex items-center justify-center font-bold text-[12px] shadow-sm">
                      2
                    </span>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-white/80">
                      Langkah 2
                    </span>
                  </div>
                  <span className="text-[10.5px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    Instan
                  </span>
                </div>
                <h3 className="text-[20px] font-bold text-white mb-2 leading-snug">
                  Kirim Dynamic QRIS
                </h3>
                <p className="text-[13.5px] text-white/90 leading-relaxed">
                  QRIS dengan nominal presisi langsung muncul di WhatsApp. Pembeli tinggal scan dari m-banking atau e-wallet mana saja.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-3 border-t border-white/20 flex items-center justify-between text-[11.5px] text-white/85 font-medium">
                <span>Semua Bank & e-Wallet</span>
                <span className="bg-white text-[#2545ff] px-2 py-0.5 rounded font-bold">QRIS Resmi</span>
              </div>
            </div>

            {/* Curved arrow to card 3 (desktop only) */}
            <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-[#2545ff]">
                <path d="M2 12C12 4 28 4 38 12M38 12L30 6M38 12L30 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3"/>
              </svg>
            </div>
          </div>

          {/* Card 3: Otomatisasi Gudang & Resi */}
          <div className="step-workflow-card step-card-3 relative group">
            <div className="bg-[#0c1754] text-white rounded-[22px] p-6 sm:p-7 shadow-[0_12px_36px_rgba(12,23,84,0.14)] min-h-[230px] sm:min-h-[280px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-1.5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[12px] shadow-sm">
                    3
                  </span>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-white/60">
                    Langkah 3
                  </span>
                </div>
                <h3 className="text-[20px] font-bold text-white mb-2 leading-snug">
                  Cetak Resi & Kirim
                </h3>
                <p className="text-[13.5px] text-white/80 leading-relaxed">
                  Begitu lunas, label resi terbit otomatis dan notifikasi penjemputan paket langsung dikirim ke pihak ekspedisi.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[11.5px] text-white/70">
                <span>Multi-Ekspedisi</span>
                <span className="text-emerald-400 font-bold">Auto Pickup</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
