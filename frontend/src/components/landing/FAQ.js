"use client";
import { useState } from "react";
import { ChevronDownIcon, MessageSquareIcon } from "@/components/icons";
import { faqItems } from "@/utils/legal/faq";
import { whatsappUrl } from "@/utils/legal/config";

// The landing page shows the questions buyers ask most; the full list is on /faq.
const LANDING_FAQ = [0, 1, 3, 5, 8, 10];
const faqs = LANDING_FAQ.map((i) => faqItems[i]).filter(Boolean);

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-20 md:py-28 bg-sand border-b border-line">
      <div className="container-page">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Sticky Title & WhatsApp Help */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <span className="eyebrow-label text-brand block mb-3">Tanya Jawab</span>
            <h2 className="section-title">
              Pertanyaan yang <span className="italic-signature">sering ditanyakan</span>
            </h2>
            <p className="section-lead mb-6">
              Masih ada hal yang ingin ditanyakan? Tim kami siap menjawab pertanyaan Anda secara langsung.
            </p>

            <a
              href={whatsappUrl() || "/kontak"}
              {...(whatsappUrl() ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="p-5 rounded-2xl bg-white border border-line shadow-sm flex items-center gap-4 hover:border-brand hover:-translate-y-1 transition-[color,background-color,border-color,box-shadow,opacity,transform] no-underline block"
            >
              <div className="w-12 h-12 rounded-xl bg-success-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <MessageSquareIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-body-sm font-semibold text-ink">Hubungi Tim Kami di WhatsApp</div>
                <div className="text-label text-fg-muted">Lihat kontak lengkap dan jam layanan</div>
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
                  className={`rounded-2xl transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 border overflow-hidden ${
                    isOpen
                      ? "bg-white border-brand/40 shadow-sm"
                      : "bg-white/80 border-line hover:bg-white hover:border-line-strong"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full flex items-center justify-between p-5 text-left gap-4 bg-transparent border-none cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-body font-semibold text-ink leading-snug">
                      {faq.q}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? "bg-brand text-white rotate-180" : "bg-brand-soft text-brand"
                      }`}
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </div>
                  </button>

                  <div
                    className={`transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-5 pb-5 pt-0">
                      <div className="pt-2.5 border-t border-line/60 text-body-sm leading-relaxed text-fg">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <a href="/faq" className="self-start mt-2 text-body-sm font-semibold text-brand hover:underline">
              Lihat semua pertanyaan
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
