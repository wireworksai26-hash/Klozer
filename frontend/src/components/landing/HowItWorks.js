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

      // Subtle Parallax float on scroll
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
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="cara-kerja" ref={containerRef} className="py-20 md:py-28 bg-[#f9f8f6] border-b border-[#f0e9e1] overflow-hidden">
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
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-[1100px] mx-auto relative mb-14">
          
          {/* Card 1: Tampung Pesanan */}
          <div className="step-workflow-card step-card-1 relative group">
            <div className="bg-[#0c1754] text-white rounded-[24px] p-6 sm:p-7 shadow-[0_12px_36px_rgba(12,23,84,0.14)] min-h-[360px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-2">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-8 h-8 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[13px] shadow-sm">
                    1
                  </span>
                  <span className="text-[12px] font-bold tracking-wider uppercase text-white/60">
                    Langkah 1
                  </span>
                </div>
                <h3 className="text-[22px] font-bold text-white mb-2 leading-snug">
                  Tampung Pesanan Tanpa Jeda
                </h3>
                <p className="text-[14px] text-white/80 leading-relaxed">
                  AI otomatis menyapa pembeli, mencatat varian produk yang dipesan, dan menghitung total harga beserta ongkir.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-between text-[12px] text-white/70">
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
            <div className="bg-[#2545ff] text-white rounded-[24px] p-6 sm:p-7 shadow-[0_12px_36px_rgba(37,69,255,0.22)] min-h-[360px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-2">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-white text-[#2545ff] flex items-center justify-center font-bold text-[13px] shadow-sm">
                      2
                    </span>
                    <span className="text-[12px] font-bold tracking-wider uppercase text-white/80">
                      Langkah 2
                    </span>
                  </div>
                  {/* Highlight pill */}
                  <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    Populer
                  </span>
                </div>
                <h3 className="text-[22px] font-bold text-white mb-2 leading-snug">
                  Bayar Instan Tanpa Repot
                </h3>
                <p className="text-[14px] text-white/90 leading-relaxed">
                  Kode Dynamic QRIS langsung dikirim ke WhatsApp pembeli. Pelanggan tinggal scan dari aplikasi m-banking atau e-wallet mana saja.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-4 border-t border-white/20 flex items-center justify-between text-[12px] text-white/85 font-medium">
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
            <div className="bg-[#0c1754] text-white rounded-[24px] p-6 sm:p-7 shadow-[0_12px_36px_rgba(12,23,84,0.14)] min-h-[360px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-2">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-8 h-8 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[13px] shadow-sm">
                    3
                  </span>
                  <span className="text-[12px] font-bold tracking-wider uppercase text-white/60">
                    Langkah 3
                  </span>
                </div>
                <h3 className="text-[22px] font-bold text-white mb-2 leading-snug">
                  Cetak Resi & Kirim Otomatis
                </h3>
                <p className="text-[14px] text-white/80 leading-relaxed">
                  Begitu pembayaran terverifikasi, label resi pengiriman otomatis tercetak dan kurir ekspedisi di-request untuk pickup barang.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-between text-[12px] text-white/70">
                <span>Multi-Ekspedisi</span>
                <span className="text-emerald-400 font-bold">Auto Request Pickup</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
