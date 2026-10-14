"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, QrIcon, TruckIcon, CheckIcon } from "@/components/icons";

const stepsData = {
  1: {
    title: "Dapatkan data pesanan yang",
    italic: "akurat & otomatis",
    desc: "Klozer menangkap detail produk, varian, dan alamat pengiriman langsung dari percakapan WhatsApp tanpa input manual.",
    points: [
      "Deteksi instan varian produk dan alamat pembeli",
      "Pengecekan stok gudang real-time cegah salah kirim",
      "Mendukung teks dan voice note bahasa Indonesia",
    ],
    badgeText: "Ada Pesanan Masuk!",
    cardHeader: "Pertanyaan Produk Pembeli:",
    cardBody: '"Halo min, apakah kemeja batik modern warna navy ukuran L masih ada? Mau kirim ke Surabaya."',
    statusText: "Status AI: Stok Ready (15 pcs)",
  },
  2: {
    title: "Terima pembayaran QRIS langsung",
    italic: "tanpa cek mutasi manual",
    desc: "Dynamic QRIS terbit otomatis dengan nominal presisi. Pembeli scan dan status order lunas seketika.",
    points: [
      "Standar QRIS Nasional (BCA, Mandiri, BRI, GoPay, OVO, Dana)",
      "Nominal presisi terkunci otomatis tanpa salah transfer",
      "Verifikasi mutasi rekening instan tanpa risiko struk palsu",
    ],
    badgeText: "Dynamic QRIS Diterbitkan",
    cardHeader: "Tagihan Pembayaran QRIS:",
    cardBody: "2x Kemeja Batik Navy L — Total: Rp 312.000 (Termasuk Ongkir)",
    statusText: "Batas Waktu: 15 Menit",
  },
  3: {
    title: "Cetak resi pengiriman &",
    italic: "booking kurir otomatis",
    desc: "Bandingkan ongkir terbaik, jadwalkan pickup kurir tanpa keluar rumah, dan kirim resi otomatis ke pembeli.",
    points: [
      "Multi-kurir: J&T, SiCepat, JNE, Lion Parcel, SAP Express",
      "Cashback ongkir hingga 25% langsung masuk saldo toko",
      "Resi dan invoice PDF otomatis terkirim ke WhatsApp pembeli",
    ],
    badgeText: "Paket Siap Dikirim ke Kurir",
    cardHeader: "Label Resi Otomatis (AWB):",
    cardBody: "J&T Express — Resi: JX1829482910\nTujuan: Tebet, Jakarta Selatan",
    statusText: "Jadwal Pick-up: Hari Ini 14.00 WIB",
  },
};

export default function DeepDive() {
  const [activeStep, setActiveStep] = useState(1);
  const [paidStep2, setPaidStep2] = useState(false);
  const [printedStep3, setPrintedStep3] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const current = stepsData[activeStep];

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaidStep2(true);
    }, 500);
  };

  const handlePrintAwb = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPrintedStep3(true);
    }, 500);
  };

  return (
    <section id="solusi" className="py-20 md:py-28 bg-canvas border-b border-line">
      <div className="container-page">
        
        {/* Step Indicator Tabs */}
        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-8 gap-y-3 mb-12 border-b border-line pb-4">
          {[
            { step: 1, label: "Langkah 1: Respon Cepat" },
            { step: 2, label: "Langkah 2: Pembayaran QRIS" },
            { step: 3, label: "Langkah 3: Kurir & Resi" },
          ].map((item) => {
            const isActive = activeStep === item.step;
            return (
              <button
                key={item.step}
                onClick={() => {
                  setActiveStep(item.step);
                  setPaidStep2(false);
                  setPrintedStep3(false);
                }}
                className={`text-body-sm sm:text-body font-semibold flex items-center gap-2.5 pb-2 transition-all border-none bg-transparent cursor-pointer whitespace-nowrap relative ${
                  isActive ? "text-brand" : "text-fg-subtle hover:text-charcoal"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isActive ? "bg-brand scale-125 ring-4 ring-brand/20" : "bg-line-strong"
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand transition-all" />
                )}
              </button>
            );
          })}
        </div>

        {/* 2-Column Split: Content Left & Royal Blue Container Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column with Smooth Tab Transition */}
          <div key={`text-${activeStep}`} className="lg:col-span-6 flex flex-col gap-6 animate-scale-pop">
            <h2 className="section-title">
              {current.title}{" "}
              <span className="italic-signature">{current.italic}</span>
            </h2>

            <p className="text-title leading-relaxed text-charcoal">
              {current.desc}
            </p>

            {/* Blue Checkmark Checklist */}
            <ul className="flex flex-col gap-3.5 my-2">
              {current.points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-body text-charcoal">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-brand mt-0.5">
                    <CheckCircleIcon className="w-5 h-5" />
                  </div>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
              <Link href="/dashboard" className="btn-primary text-body !py-3.5 !px-8 font-medium text-center">
                Coba Gratis Sekarang
              </Link>
              <a href="#harga" className="btn-outline text-body !py-3.5 !px-7 font-medium text-center">
                Lihat Paket Harga
              </a>
            </div>
          </div>

          {/* Right Column: Royal Blue Card Container */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[480px] bg-brand-hover rounded-3xl p-6 sm:p-8 shadow-brand-lg text-white relative transition-all duration-300">
              
              {/* WhatsApp Pulse Notification Badge */}
              <div className="bg-white text-charcoal rounded-xl p-3 shadow-md inline-flex items-center gap-2.5 mb-5 animate-pulse-glow">
                <div className="w-6 h-6 rounded-md bg-brand text-white flex items-center justify-center font-bold text-caption">
                  WA
                </div>
                <span className="text-body-sm font-bold">{current.badgeText}</span>
              </div>

              {/* Chat Container Card with Pop Animation on tab switch */}
              <div key={`card-${activeStep}`} className="bg-white text-charcoal rounded-2xl p-5 shadow-lg animate-scale-pop">
                <div className="text-body-sm font-bold text-charcoal mb-2">
                  {current.cardHeader}
                </div>
                
                {/* Step 1: Chat content */}
                {activeStep === 1 && (
                  <div className="p-3.5 bg-canvas rounded-xl border border-line text-body-sm text-charcoal mb-4 leading-relaxed">
                    {current.cardBody}
                  </div>
                )}

                {/* Step 2: QRIS preview content */}
                {activeStep === 2 && (
                  <div className="p-3.5 bg-canvas rounded-xl border border-line mb-4 text-center">
                    {paidStep2 ? (
                      <div className="py-2 animate-scale-pop">
                        <div className="w-10 h-10 rounded-full bg-success-100 text-success-600 flex items-center justify-center mx-auto mb-1.5 font-bold">
                          <CheckIcon className="w-5 h-5" />
                        </div>
                        <div className="text-body-sm font-bold text-success-700">Pembayaran Rp 312.000 Lunas!</div>
                        <div className="text-caption text-fg-subtle">Mutasi rekening BCA cocok 100%</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-white p-2 rounded-xl border border-line flex items-center justify-center mb-2 shadow-sm">
                          <QrIcon className="w-16 h-16 text-ink" />
                        </div>
                        <span className="text-body-sm font-bold text-ink">Rp 312.000</span>
                        <span className="text-micro text-fg-subtle">Scan via BCA, GoPay, OVO, ShopeePay</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Courier Resi preview content */}
                {activeStep === 3 && (
                  <div className="p-3.5 bg-canvas rounded-xl border border-line mb-4">
                    {printedStep3 ? (
                      <div className="py-2 text-center animate-scale-pop">
                        <div className="text-body-sm font-bold text-success-700">Resi Berhasil Dicetak & Dikirim ke WA</div>
                        <div className="text-caption text-fg-subtle mt-1">Kurir J&T dijadwalkan pick-up jam 14.00 WIB</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center flex-shrink-0">
                          <TruckIcon className="w-6 h-6" />
                        </div>
                        <div className="text-label text-charcoal">
                          <div className="font-bold text-ink">J&T Express (Cashback 20%)</div>
                          <div className="text-fg-subtle">Resi: <span className="font-mono font-bold text-charcoal">JX1829482910</span></div>
                          <div className="text-fg-subtle">Penerima: Budi (Tebet, Jaksel)</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex items-center justify-between pt-2 border-t border-line text-label">
                  <span className="text-fg-subtle font-medium">{current.statusText}</span>
                  
                  {activeStep === 1 && (
                    <button
                      onClick={() => setActiveStep(2)}
                      className="bg-brand text-white px-4 py-1.5 rounded-full font-semibold text-label border-none cursor-pointer hover:bg-brand-hover transition-colors"
                    >
                      Lanjut ke QRIS →
                    </button>
                  )}

                  {activeStep === 2 && (
                    <button
                      onClick={paidStep2 ? () => setPaidStep2(false) : handleSimulatePayment}
                      disabled={isProcessing}
                      className="bg-brand text-white px-4 py-1.5 rounded-full font-semibold text-label border-none cursor-pointer hover:bg-brand-hover transition-colors"
                    >
                      {isProcessing ? "Memproses..." : paidStep2 ? "Ulangi" : "Klik Simulasi Bayar"}
                    </button>
                  )}

                  {activeStep === 3 && (
                    <button
                      onClick={printedStep3 ? () => setPrintedStep3(false) : handlePrintAwb}
                      disabled={isProcessing}
                      className="bg-brand text-white px-4 py-1.5 rounded-full font-semibold text-label border-none cursor-pointer hover:bg-brand-hover transition-colors"
                    >
                      {isProcessing ? "Mencetak..." : printedStep3 ? "Reset" : "Cetak Label AWB"}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
