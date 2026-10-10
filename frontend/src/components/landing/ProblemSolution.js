"use client";
import { XCircleIcon, CheckCircleIcon, ArrowRightIcon, CheckIcon, XIcon } from "@/components/icons";
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
    <section id="solusi" className="py-20 md:py-28 bg-sand border-b border-line">
      <div className="container-page">
        
        {/* Section Header */}
        <div className="text-center max-w-[760px] mx-auto mb-14 md:mb-16">
          <span className="eyebrow-label text-brand block mb-3">Perbandingan Solusi Nyata</span>
          <h2 className="section-title">
            Mengapa cara jualan WhatsApp manual{" "}
            <span className="italic-signature">membuat Anda kehilangan omzet</span>?
          </h2>
          <p className="section-lead">
            Lihat bagaimana Klozer mengubah masalah operasional harian yang melelahkan menjadi mesin penjualan otomatis.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[1100px] mx-auto mb-12">
          
          {/* Column 1: Cara Lama */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-red-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-red-600 font-bold text-title mb-6 pb-4 border-b border-red-100">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                <span>Cara Lama yang Melelahkan</span>
              </div>

              <ul className="flex flex-col gap-4">
                {comparisons.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-body-sm leading-relaxed text-fg">
                    <span className="w-5 h-5 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <XIcon className="w-3 h-3" />
                    </span>
                    <span>{item.problem}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-red-100 text-body-sm font-bold text-red-600 text-center">
              Hasil: Biaya CS membengkak & banyak chat batal beli
            </div>
          </div>

          {/* Column 2: Bersama Klozer */}
          <div className="bg-ink text-white rounded-2xl p-6 sm:p-8 border-2 border-brand shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-title mb-6 pb-4 border-b border-white/15">
                <CheckCircleIcon className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>Bersama Klozer (Serba Otomatis)</span>
              </div>

              <ul className="flex flex-col gap-4">
                {comparisons.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-body-sm leading-relaxed text-brand-soft/90">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span>{item.solution}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-white/15 text-body-sm font-bold text-emerald-400 text-center">
              Hasil: Closing meningkat pesat & hemat waktu hingga 80%
            </div>
          </div>

        </div>

        {/* Banner CTA */}
        <div className="text-center">
          <Link href="/dashboard" className="btn-primary !py-3.5 !px-8 text-body inline-flex">
            <span>Ubah Cara Jualan Anda Sekarang</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
