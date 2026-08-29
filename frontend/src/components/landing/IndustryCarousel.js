"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const industries = [
  {
    title: "UMKM & Retail",
    desc: "Kasir pintar WhatsApp yang otomatis menghitung total belanja, konfirmasi stok, dan cetak invoice resmi.",
    image: "/images/industries/retail.jpg",
    badge: "Otomatisasi Kasir",
  },
  {
    title: "Online Shop & Fashion",
    desc: "Tanya ukuran baju, cek varian warna, dan kirim QRIS presisi tanpa salah catat varian.",
    image: "/images/industries/fashion.jpg",
    badge: "Varian & Stok",
  },
  {
    title: "Skincare & Beauty Care",
    desc: "Pahami voice note konsultasi jenis kulit pelanggan dan tawarkan paket produk yang tepat.",
    image: "/images/industries/skincare.jpg",
    badge: "Voice AI Agent",
  },
  {
    title: "Kuliner & F&B Delivery",
    desc: "Rekap pesanan makanan, hitung ongkos kurir instan, dan terima bukti bayar lunas otomatis.",
    image: "/images/industries/culinary.jpg",
    badge: "Delivery & Ongkir",
  },
  {
    title: "Lembaga Donasi & ZISWAF",
    desc: "Terbitkan QRIS donasi resmi, kirim tanda terima terverifikasi, dan balasan doa via audio AI.",
    image: "/images/industries/charity.jpg",
    badge: "Donasi Resmi",
  },
  {
    title: "Properti & Jasa",
    desc: "Kualifikasi budget calon klien secara otomatis sebelum dihubungkan ke staf sales profesional.",
    image: "/images/industries/property.jpg",
    badge: "Lead Filtering",
  },
];

export default function IndustryCarousel() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current || !trackRef.current || typeof window === "undefined") return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const track = trackRef.current;
      const getScrollAmount = () => {
        const trackWidth = track.scrollWidth;
        return -(trackWidth - window.innerWidth + 80);
      };

      gsap.to(track, {
        x: getScrollAmount,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${Math.abs(getScrollAmount()) + 600}`,
          pin: true,
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => mm.revert();
  }, []);

  const handleManualScroll = (direction) => {
    if (!trackRef.current) return;
    const amount = direction === "left" ? 320 : -320;
    if (window.innerWidth < 768) {
      trackRef.current.scrollBy({ left: amount, behavior: "smooth" });
    } else {
      gsap.to(trackRef.current, {
        x: `+=${amount}`,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="min-h-screen bg-[#f9f8f6] border-b border-[#f0e9e1] flex flex-col justify-center py-12 md:py-16 overflow-hidden relative"
    >
      {/* Top Header Bar with Navigation Arrows */}
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 mb-6 md:mb-8 flex items-end justify-between">
        <div>
          <span className="eyebrow-label text-[#2545ff] block mb-1.5 sm:mb-2">
            SEKTOR INDUSTRI
          </span>
          <h2 className="text-display-headline text-[28px] sm:text-[38px] md:text-[48px] text-[#171417] leading-tight">
            Cocok untuk <span className="italic-signature">Berbagai Bisnis</span>
          </h2>
          <p className="text-[14px] sm:text-[16px] text-[#64748b] mt-1 sm:mt-2">
            Dirancang fleksibel untuk berbagai model bisnis transaksi chat di Indonesia.
          </p>
        </div>

        {/* Manual Arrow Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleManualScroll("left")}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border border-[#f0e9e1] flex items-center justify-center text-[#171417] hover:bg-[#eaebf8] hover:text-[#2545ff] transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            aria-label="Scroll left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            onClick={() => handleManualScroll("right")}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border border-[#f0e9e1] flex items-center justify-center text-[#171417] hover:bg-[#eaebf8] hover:text-[#2545ff] transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            aria-label="Scroll right"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontal Full-Screen Floating Track */}
      <div className="w-full px-4 sm:px-6 md:pl-12 overflow-x-auto md:overflow-visible scrollbar-none snap-x">
        <div
          ref={trackRef}
          className="flex gap-4 sm:gap-6 w-max py-2 sm:py-4 will-change-transform"
        >
          {industries.map((ind, idx) => (
            <div
              key={idx}
              className="w-[280px] sm:w-[340px] md:w-[360px] h-[450px] sm:h-[480px] rounded-[22px] sm:rounded-[24px] bg-white border border-[#f0e9e1] p-3.5 sm:p-4 flex flex-col justify-between shadow-[0_4px_24px_rgba(12,23,84,0.06)] hover:shadow-[0_12px_36px_rgba(12,23,84,0.12)] transition-all duration-300 group cursor-pointer flex-shrink-0 snap-start"
            >
              {/* Photo Area */}
              <div className="w-full h-[210px] sm:h-[230px] rounded-[16px] sm:rounded-[18px] overflow-hidden relative border border-[#f0e9e1]">
                <Image
                  src={ind.image}
                  alt={ind.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="340px"
                  priority={idx < 2}
                />
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-white/90 backdrop-blur-md text-[#0c1754] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-[#f0e9e1] shadow-xs">
                    {ind.badge}
                  </span>
                </div>
              </div>

              {/* Text Description Area */}
              <div className="p-1 sm:p-2 flex flex-col justify-between flex-1 mt-2.5 sm:mt-3">
                <div>
                  <h3 className="text-[18px] sm:text-[20px] font-bold text-[#0c1754] mb-1.5 sm:mb-2 leading-snug">
                    {ind.title}
                  </h3>
                  <p className="text-[12.5px] sm:text-[13.5px] text-[#64748b] leading-relaxed line-clamp-3">
                    {ind.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-[#f0e9e1] mt-2">
                  <span className="text-[12px] sm:text-[13px] font-bold text-[#2545ff] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <span>Pelajari Solusi</span>
                    <span>→</span>
                  </span>
                  <span className="text-[#969696] font-mono text-[10px] sm:text-[11px]">0{idx + 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
