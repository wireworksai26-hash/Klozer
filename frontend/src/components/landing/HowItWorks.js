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
    <section id="cara-kerja" ref={containerRef} className="py-20 md:py-28 bg-canvas border-b border-line overflow-hidden">
      <div className="container-page">
        
        {/* Section Headline */}
        <div className="text-center max-w-[800px] mx-auto mb-16 md:mb-20">
          <span className="eyebrow-label text-brand block mb-2">ALUR KERJA TERPADU</span>
          <h2 className="section-title">
            Solusi praktis. Arah yang jelas.<br />
            Penjualan otomatis dalam 3 langkah mudah.
          </h2>
        </div>

        {/* 3 Step Cards with connecting arrows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7 max-w-[1100px] mx-auto relative mb-10">
          
          {/* Card 1: Tampung Pesanan */}
          <div className="step-workflow-card step-card-1 relative group">
            <div className="bg-ink text-white rounded-3xl p-6 sm:p-7 shadow-lift min-h-[230px] sm:min-h-[280px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-1.5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-label shadow-sm">
                    1
                  </span>
                  <span className="text-caption font-bold tracking-wider uppercase text-white/60">
                    Langkah 1
                  </span>
                </div>
                <h3 className="text-subheading font-bold text-white mb-2 leading-snug">
                  Tangkap Pesanan Otomatis
                </h3>
                <p className="text-body-sm text-white/80 leading-relaxed">
                  AI menyapa pembeli 24/7, mencatat varian produk, dan menghitung total harga beserta ongkir seketika.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-caption text-white/70">
                <span>Respon &lt; 2 detik</span>
                <span className="text-brand-on-dark font-bold">24 Jam Aktif</span>
              </div>
            </div>

            {/* Curved arrow to card 2 (desktop only) */}
            <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-brand">
                <path d="M2 12C12 4 28 4 38 12M38 12L30 6M38 12L30 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3"/>
              </svg>
            </div>
          </div>

          {/* Card 2: Bayar Instan QRIS */}
          <div className="step-workflow-card relative group">
            <div className="bg-brand text-white rounded-3xl p-6 sm:p-7 shadow-brand-lg min-h-[230px] sm:min-h-[280px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-1.5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-white text-brand flex items-center justify-center font-bold text-label shadow-sm">
                      2
                    </span>
                    <span className="text-caption font-bold tracking-wider uppercase text-white/80">
                      Langkah 2
                    </span>
                  </div>
                  <span className="text-micro font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    Instan
                  </span>
                </div>
                <h3 className="text-subheading font-bold text-white mb-2 leading-snug">
                  Kirim Dynamic QRIS
                </h3>
                <p className="text-body-sm text-white/90 leading-relaxed">
                  QRIS dengan nominal presisi langsung muncul di WhatsApp. Pembeli tinggal scan dari m-banking atau e-wallet mana saja.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-3 border-t border-white/20 flex items-center justify-between text-caption text-white/85 font-medium">
                <span>Semua Bank & e-Wallet</span>
                <span className="bg-white text-brand px-2 py-0.5 rounded font-bold">QRIS Resmi</span>
              </div>
            </div>

            {/* Curved arrow to card 3 (desktop only) */}
            <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-brand">
                <path d="M2 12C12 4 28 4 38 12M38 12L30 6M38 12L30 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3"/>
              </svg>
            </div>
          </div>

          {/* Card 3: Otomatisasi Gudang & Resi */}
          <div className="step-workflow-card step-card-3 relative group">
            <div className="bg-ink text-white rounded-3xl p-6 sm:p-7 shadow-lift min-h-[230px] sm:min-h-[280px] flex flex-col justify-between transition-transform duration-500 group-hover:-translate-y-1.5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-label shadow-sm">
                    3
                  </span>
                  <span className="text-caption font-bold tracking-wider uppercase text-white/60">
                    Langkah 3
                  </span>
                </div>
                <h3 className="text-subheading font-bold text-white mb-2 leading-snug">
                  Cetak Resi & Kirim
                </h3>
                <p className="text-body-sm text-white/80 leading-relaxed">
                  Begitu lunas, label resi terbit otomatis dan notifikasi penjemputan paket langsung dikirim ke pihak ekspedisi.
                </p>
              </div>

              {/* Card visual footer */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-caption text-white/70">
                <span>Multi-Ekspedisi</span>
                <span className="text-success-400 font-bold">Auto Pickup</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
