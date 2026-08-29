"use client";
import { XCircleIcon, CheckCircleIcon, ArrowRightIcon } from "@/components/icons";
import Link from "next/link";

const comparisons = [
  {
    problem: "Pembeli batal beli karena malas mengetik nomor rekening dan malas upload bukti transfer.",
    solution: "Kode QRIS otomatis muncul di chat dengan total harga yang pas. Pembeli tinggal scan dan bayar.",
  },
  {
    problem: "Banyak toko rugi jutaan rupiah karena menerima bukti transfer palsu editan Canva / Photoshop.",
    solution: "AI memeriksa pixel struk dan mencocokkan mutasi bank secara otomatis. Barang tidak akan dikirim sebelum uang masuk.",
  },
  {
    problem: "Pelanggan suka kirim pesan suara (Voice Note) yang bikin CS repot mendengarkan satu per satu.",
    solution: "AI langsung memahami isi pesan suara pelanggan dan membalasnya dengan suara audio yang ramah.",
  },
  {
    problem: "Orderan malam hari terabaikan karena CS sudah tidur, padahal pembeli siap bayar saat itu juga.",
    solution: "Asisten AI melayani pertanyaan produk, cek stok, dan menerbitkan invoice pembayaran otomatis 24 jam nonstop.",
  },
  {
    problem: "Pasang iklan Facebook & Instagram (Click-to-WhatsApp) tapi tidak tahu iklan mana yang menghasilkan closing.",
    solution: "Data iklan otomatis terhubung dengan invoice penjualan, sehingga Anda tahu pasti iklan mana yang benar-benar untung.",
  },
];

export default function ProblemSolution() {
  return (
    <section id="solusi" className="py-20 md:py-28 bg-[#f4f1ea] border-b border-[#e8e3d9]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-[760px] mx-auto mb-14 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2545ff]/10 border border-[#2545ff]/20 text-[#2545ff] text-[12px] font-bold tracking-wide uppercase mb-3">
            <span>Perbandingan Solusi Nyata</span>
          </div>
          <h2 className="editorial-headline text-[28px] sm:text-[38px] md:text-[44px] mt-1 mb-4">
            Mengapa cara jualan WhatsApp manual{" "}
            <span className="editorial-italic">membuat Anda kehilangan omzet</span>?
          </h2>
          <p className="text-[16px] sm:text-[17px] text-[#334155] leading-relaxed">
            Lihat bagaimana Klozer mengubah masalah operasional harian yang melelahkan menjadi mesin penjualan otomatis.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-[1100px] mx-auto mb-12">
          
          {/* Column 1: Cara Lama */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-red-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-red-600 font-bold text-[17px] mb-6 pb-4 border-b border-red-100">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                <span>Cara Lama yang Melelahkan</span>
              </div>

              <ul className="flex flex-col gap-4">
                {comparisons.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[14px] leading-relaxed text-[#334155]">
                    <span className="w-5 h-5 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[12px]">
                      ✕
                    </span>
                    <span>{item.problem}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-red-100 text-[13px] font-bold text-red-600 text-center">
              Hasil: Biaya CS membengkak & banyak chat batal beli
            </div>
          </div>

          {/* Column 2: Bersama Klozer */}
          <div className="bg-[#080e2b] text-white rounded-2xl p-6 sm:p-8 border-2 border-[#2545ff] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-[17px] mb-6 pb-4 border-b border-white/15">
                <CheckCircleIcon className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>Bersama Klozer (Serba Otomatis)</span>
              </div>

              <ul className="flex flex-col gap-4">
                {comparisons.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[14px] leading-relaxed text-[#eef2ff]/90">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[12px]">
                      ✓
                    </span>
                    <span>{item.solution}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-white/15 text-[13px] font-bold text-emerald-400 text-center">
              Hasil: Closing meningkat pesat & hemat waktu hingga 80%
            </div>
          </div>

        </div>

        {/* Banner CTA */}
        <div className="text-center">
          <Link href="/dashboard" className="btn-primary !py-3.5 !px-8 text-[15px] inline-flex">
            <span>Ubah Cara Jualan Anda Sekarang</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
