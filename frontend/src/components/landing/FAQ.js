"use client";
import { useState } from "react";
import { ChevronDownIcon, MessageSquareIcon } from "@/components/icons";

const faqs = [
  {
    q: "Apakah saya harus punya keahlian IT atau coding untuk memakai Klozer?",
    a: "Sama sekali tidak. Klozer dirancang sangat mudah digunakan seperti memakai aplikasi WhatsApp biasa. Anda hanya perlu mendaftar, memasukkan daftar produk, dan sistem otomatis langsung bekerja.",
  },
  {
    q: "Bagaimana cara uang masuk ke rekening saya saat pembeli scan QRIS?",
    a: "Pembayaran QRIS diproses langsung melalui Payment Gateway resmi berizin Bank Indonesia (seperti Xendit atau Midtrans). Dana yang dibayar pembeli akan langsung masuk dan cair ke rekening bank toko Anda.",
  },
  {
    q: "Apakah nomor WhatsApp toko saya aman dari risiko diblokir?",
    a: "Sangat aman. Klozer menggunakan integrasi resmi WhatsApp Business Cloud API dari Meta. Sistem kami juga dilengkapi jeda pengiriman cerdas dan batasan follow-up agar nomor Anda terbebas dari cap spam.",
  },
  {
    q: "Bagaimana jika ada pembeli yang bertanya di luar daftar produk?",
    a: "Jika ada pertanyaan rumit yang belum diketahui oleh AI, sistem secara otomatis akan meneruskan obrolan tersebut ke staf CS manusia Anda secara mulus.",
  },
  {
    q: "Bagaimana Klozer bisa tahu jika pembeli mengirim bukti transfer palsu?",
    a: "Sistem secara otomatis mengecek apakah ada uang masuk di rekening bank Anda dengan nominal dan waktu yang sesuai. Jika uang belum benar-benar masuk, pesanan tidak akan disetujui untuk dikirim.",
  },
  {
    q: "Apakah Klozer bisa digunakan di HP (smartphone)?",
    a: "Ya! Dashboard Klozer dapat dibuka dengan nyaman melalui browser HP maupun komputer/laptop Anda kapan saja dan di mana saja.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#f4f1ea] border-b border-[#e8e3d9]">
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Sticky Title & WhatsApp Help */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2545ff]/10 border border-[#2545ff]/20 text-[#2545ff] text-[12px] font-bold tracking-wide uppercase mb-3">
              <span>Tanya Jawab</span>
            </div>
            <h2 className="editorial-headline text-[28px] sm:text-[38px] md:text-[42px] mt-1 mb-4">
              Pertanyaan yang <span className="italic-signature">sering ditanyakan</span>
            </h2>
            <p className="text-[15px] sm:text-[16px] text-[#334155] leading-relaxed mb-6">
              Masih ada hal yang ingin ditanyakan? Tim kami siap menjawab pertanyaan Anda secara langsung.
            </p>

            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-white border border-[#e8e3d9] shadow-sm flex items-center gap-4 hover:border-[#2545ff] hover:-translate-y-1 transition-all no-underline block"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <MessageSquareIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[14px] font-bold text-[#080e2b]">Hubungi Tim Kami di WhatsApp</div>
                <div className="text-[12px] text-[#64748b]">Respon cepat dalam hitungan menit</div>
              </div>
            </a>
          </div>

          {/* Right Column: Clean Accordion Items */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className={`rounded-2xl transition-all duration-300 border overflow-hidden ${
                    isOpen
                      ? "bg-white border-[#2545ff]/40 shadow-sm"
                      : "bg-white/80 border-[#e8e3d9] hover:bg-white hover:border-[#cbd5e1]"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full flex items-center justify-between p-5 text-left gap-4 bg-transparent border-none cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[15px] sm:text-[16px] font-bold text-[#080e2b] leading-snug">
                      {faq.q}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? "bg-[#2545ff] text-white rotate-180" : "bg-[#eef2ff] text-[#2545ff]"
                      }`}
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </div>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-5 pb-5 pt-0">
                      <div className="pt-2.5 border-t border-[#e8e3d9]/60 text-[14px] leading-relaxed text-[#334155]">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
