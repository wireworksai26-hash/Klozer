"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { QrIcon, MicIcon, ShieldCheckIcon, SparklesIcon } from "@/components/icons";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Hero() {
  const containerRef = useRef(null);
  const headlineRef = useRef(null);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const cardRef = useRef(null);
  const textColRef = useRef(null);

  const [activeMetric, setActiveMetric] = useState("qris");
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      // Entrance Timeline
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        headlineRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 }
      )
        .fromTo(
          subRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(
          ctaRef.current,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          "-=0.3"
        )
        .fromTo(
          cardRef.current,
          { y: 35, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.9 },
          "-=0.4"
        );

      // Score counter animation
      const obj = { val: 0 };
      gsap.to(obj, {
        val: 9.2,
        duration: 1.5,
        delay: 0.3,
        ease: "power2.out",
        onUpdate: () => {
          setScore(Number(obj.val.toFixed(1)));
        },
      });

      // Subtle Scroll Parallax Effect ("Scroll Effect Tipis-Tipis")
      gsap.to(textColRef.current, {
        y: 45,
        opacity: 0.9,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });

      gsap.to(cardRef.current, {
        y: -40,
        rotate: -1.5,
        scale: 0.98,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="pt-32 pb-16 md:pt-40 md:pb-24 bg-[#f9f8f6] relative overflow-hidden">
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Editorial Headline & Actions */}
          <div ref={textColRef} className="lg:col-span-7 flex flex-col gap-6 sm:gap-7 text-left will-change-transform">
            
            {/* Eyebrow Label */}
            <div className="flex items-center gap-2">
              <span className="eyebrow-label text-[#171417] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2545ff] animate-pulse-glow" />
                OTOMATISASI WHATSAPP & SMART CRM
              </span>
            </div>

            {/* Headline with Signature Serif Italic */}
            <h1
              ref={headlineRef}
              className="text-display-headline text-[42px] sm:text-[54px] md:text-[62px] lg:text-[68px] xl:text-[76px] leading-[1.06] text-[#171417] tracking-tight"
            >
              Omzet tidak akan naik jika Anda{" "}
              <span className="italic-signature">
                masih balas chat manual
              </span>
            </h1>

            {/* Body Copy */}
            <p
              ref={subRef}
              className="text-[18px] sm:text-[20px] leading-[1.65] text-[#171417] max-w-[640px] font-normal"
            >
              Otomatiskan pembayaran <strong>Dynamic QRIS di chat</strong>, transkripsi <strong>AI Voice Note</strong> bahasa Indonesia, dan deteksi bukti transfer palsu. Mengubah obrolan menjadi transaksi lunas 24 jam nonstop.
            </p>

            {/* Action Buttons: Coba Gratis & Masuk Berdampingan */}
            <div ref={ctaRef} className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link href="/register" className="btn-primary text-[16px] !py-3.5 !px-8 font-bold group shadow-lg hover:shadow-2xl hover:scale-102 transition-all">
                <span>Coba Gratis 14 Hari</span>
                <span className="transition-transform group-hover:translate-x-1.5">→</span>
              </Link>
              <Link href="/login" className="px-6 py-3.5 rounded-full border border-[#ede8e2] bg-white hover:bg-[#f5f4f2] text-[15px] font-bold text-[#171417] hover:text-[#2545ff] transition-all no-underline shadow-xs">
                <span>Masuk ke Akun</span>
              </Link>
            </div>

          </div>

          {/* Right Column: Product Dashboard Report Card */}
          <div ref={cardRef} className="lg:col-span-5 flex justify-center lg:justify-end relative will-change-transform">
            <div className="relative w-full max-w-[560px]">
              
              {/* Tilted Decorative Layer Behind with gentle float (Solid Ink Navy) */}
              <div className="absolute -top-3.5 -right-3.5 w-full h-full bg-[#0c1754] rounded-[28px] rotate-2 opacity-95 -z-10 animate-float-subtle" />

              {/* Main Report Card (Officevibe style) */}
              <div className="bg-white rounded-[24px] p-7 sm:p-8 shadow-[0_16px_40px_rgba(12,23,84,0.12)] border border-[#ede8e2] transition-all hover:shadow-[0_24px_60px_rgba(12,23,84,0.18)]">
                
                {/* Header row */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[16.5px] font-extrabold text-[#171417]">Laporan Penjualan WhatsApp</span>
                  <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#2545ff] bg-[#eaebf8] px-3.5 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#2545ff] animate-ping" />
                    <span>88% Tingkat Lunas</span>
                  </div>
                </div>

                {/* Gauge & Chart Area */}
                <div className="grid grid-cols-12 gap-5 items-center pb-6 border-b border-[#ede8e2]">
                  
                  {/* Animated Circular Gauge Score Box */}
                  <div className="col-span-5 flex flex-col items-center justify-center text-center p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#ede8e2] hover:border-[#2545ff]/40 transition-colors">
                    <div className="relative w-22 h-22 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[#eaebf8]"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#2545ff] transition-all duration-1000 ease-out"
                          strokeDasharray={`${(score / 10) * 100}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-[22px] font-black text-[#171417] leading-none">
                          {score.toFixed(1)}
                        </span>
                        <span className="text-[10.5px] font-bold text-[#969696]">dari 10</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#171417] mt-1.5">Sangat Efisien!</span>
                    <span className="text-[11px] font-bold text-emerald-600">↑ 2.4x omzet bulan ini</span>
                  </div>

                  {/* Clean Blue Wave Chart (Solid Flat Fill) */}
                  <div className="col-span-7 flex flex-col justify-between h-full pl-2">
                    <div className="flex justify-between text-[12px] text-[#969696] mb-1 font-semibold">
                      <span>Tren Omzet Mingguan</span>
                      <span className="font-extrabold text-[#2545ff]">Rp 18.5 Jt / hr</span>
                    </div>
                    {/* SVG Area Chart */}
                    <div className="h-22 w-full relative overflow-hidden rounded-xl">
                      <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                        <path
                          d="M0,60 Q40,45 80,50 T160,20 T200,10 L200,80 L0,80 Z"
                          fill="#eaebf8"
                        />
                        <path
                          d="M0,60 Q40,45 80,50 T160,20 T200,10"
                          fill="none"
                          stroke="#2545ff"
                          strokeWidth="2.5"
                          className="transition-all duration-700"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-[#969696] mt-1.5">
                      <span>Sen</span>
                      <span>Rab</span>
                      <span>Jum</span>
                      <span>Min</span>
                    </div>
                  </div>

                </div>

                {/* Focus metrics row with interactive hover highlight */}
                <div className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#969696]">
                      Metrik Keunggulan Toko
                    </span>
                    <span className="text-[11.5px] text-[#2545ff] font-bold">Klik untuk filter</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => setActiveMetric("qris")}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        activeMetric === "qris"
                          ? "bg-[#eaebf8] border-[#2545ff] shadow-sm"
                          : "bg-[#fcfbf9] border-[#ede8e2] hover:border-[#2545ff]/40"
                      }`}
                    >
                      <span className="text-[13.5px] font-extrabold text-[#171417] flex items-center gap-1.5">
                        <QrIcon className="w-4 h-4 text-[#2545ff]" />
                        <span>9.8 QRIS</span>
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold block mt-1">↑ 1.2s bayar</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveMetric("voice")}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        activeMetric === "voice"
                          ? "bg-[#eaebf8] border-[#2545ff] shadow-sm"
                          : "bg-[#fcfbf9] border-[#ede8e2] hover:border-[#2545ff]/40"
                      }`}
                    >
                      <span className="text-[13.5px] font-extrabold text-[#171417] flex items-center gap-1.5">
                        <MicIcon className="w-4 h-4 text-[#2545ff]" />
                        <span>8.9 Voice</span>
                      </span>
                      <span className="text-[11px] text-[#969696] font-semibold block mt-1">AI Bahasa Indo</span>
                    </button>

                    <button
                      onClick={() => setActiveMetric("fraud")}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        activeMetric === "fraud"
                          ? "bg-[#eaebf8] border-[#2545ff] shadow-sm"
                          : "bg-[#fcfbf9] border-[#ede8e2] hover:border-[#2545ff]/40"
                      }`}
                    >
                      <span className="text-[13.5px] font-extrabold text-[#171417] flex items-center gap-1.5">
                        <ShieldCheckIcon className="w-4 h-4 text-[#2545ff]" />
                        <span>100% Aman</span>
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold block mt-1">Mutasi cocok</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Hand-drawn arrow pointing to pill action button with floating animation */}
              <div className="mt-5 flex items-center gap-3 animate-float-subtle max-w-full">
                <svg className="w-7 h-7 sm:w-9 sm:h-9 text-[#0c1754] -rotate-12 transition-transform hover:rotate-0 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 19c6-2 10-7 12-14M17 5l-5 2M17 5l-2 5" />
                </svg>
                <div className="bg-[#0c1754] hover:bg-[#15236b] transition-colors text-white px-4 sm:px-5 py-2.5 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-2 shadow-md cursor-pointer max-w-full truncate">
                  <SparklesIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">Analisis performa closing WhatsApp otomatis</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
