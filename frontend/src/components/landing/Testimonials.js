"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const testimonials = [
  {
    bg: "bg-[#EAE8FD]", // Lavender
    score: "5.0",
    quote: "Dulu CS kami sering begadang cuma buat kirim nomor rekening. Sejak pakai QRIS otomatis Klozer, pembeli langsung bayar dan omzet naik 40%.",
    author: "Rendra Pratama",
    role: "Owner Toko Fashion Pria",
    date: "Agustus 2026",
  },
  {
    bg: "bg-[#DDF7F6]", // Mint
    score: "5.0",
    quote: "Fitur deteksi struk palsunya benar-benar penyelamat. Pernah ada yang kirim bukti transfer editan, langsung ketahuan sama AI Klozer.",
    author: "Nadia Maharani",
    role: "Founder Brand Skincare",
    date: "Juli 2026",
  },
  {
    bg: "bg-[#FEEBB3]", // Warm Yellow
    score: "4.9",
    quote: "Banyak pelanggan kami yang malas ngetik dan lebih suka kirim voice note. AI Klozer bisa paham dan balas pakai suara ramah.",
    author: "Hendra Wijaya",
    role: "Distributor Retail",
    date: "Agustus 2026",
  },
  {
    bg: "bg-[#FCDDEC]", // Soft Pink
    score: "5.0",
    quote: "Sangat membantu untuk rekap donasi dan infak. Donatur senang karena langsung dapat tanda terima resmi di chat WhatsApp.",
    author: "Ustadz Firdaus",
    role: "Pengurus Lembaga ZISWAF",
    date: "Agustus 2026",
  },
];

export default function Testimonials() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      // Entrance reveal
      gsap.fromTo(
        ".pastel-card-item",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
          },
        }
      );

      // Subtle Alternating Scroll Parallax
      gsap.to(".pastel-card-0, .pastel-card-2", {
        y: -22,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });

      gsap.to(".pastel-card-1, .pastel-card-3", {
        y: 22,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="testimoni" ref={containerRef} className="py-20 md:py-28 bg-[#f9f8f6] border-b border-[#f0e9e1] overflow-hidden">
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        
        {/* Section Headline */}
        <div className="text-center max-w-[840px] mx-auto mb-14 md:mb-16">
          <span className="eyebrow-label text-[#2545ff] block mb-2">BUKTI KEPUASAN PENGGUNA</span>
          <h2 className="text-display-headline text-[32px] sm:text-[42px] md:text-[46px] text-[#171417] leading-[1.15]">
            <span className="italic-signature">Pemilik bisnis di Indonesia</span>{" "}
            memilih Klozer untuk meningkatkan omzet WhatsApp mereka
          </h2>
        </div>

        {/* 4 Pastel Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className={`pastel-card-item pastel-card-${idx} ${t.bg} rounded-[22px] p-6 sm:p-7 flex flex-col justify-between shadow-sm min-h-[310px] transition-all duration-300 hover:-translate-y-2 hover:shadow-md cursor-default will-change-transform`}
            >
              <div>
                {/* Rating score header */}
                <div className="flex items-center gap-1.5 font-bold text-[14px] text-[#171417] mb-4">
                  <span className="text-amber-600">★</span>
                  <span>{t.score}</span>
                </div>

                {/* Quote */}
                <p className="text-[14px] leading-[1.65] text-[#171417] font-normal mb-6">
                  "{t.quote}"
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-4 border-t border-black/10">
                <div className="text-[13px] font-bold text-[#171417]">
                  — {t.author}
                </div>
                <div className="text-[11px] text-[#171417]/70 mt-0.5">
                  {t.role} · {t.date}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
