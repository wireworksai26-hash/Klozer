"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, QrIcon, TruckIcon, CheckIcon } from "@/components/icons";

const stepsData = {
  1: {
    title: "Dapatkan data pesanan yang",
    italic: "akurat & otomatis",
    desc: "Ketahui apa yang diinginkan pembeli secara instan. Sistem Klozer menangkap detail produk, varian ukuran, dan lokasi pengiriman langsung dari obrolan WhatsApp tanpa repot input manual.",
    points: [
      "Deteksi otomatis varian produk, jumlah, dan alamat pembeli",
      "Pengecekan sisa stok gudang secara real-time agar tidak salah kirim",
      "Paham pesan teks & pesan suara (voice note) bahasa Indonesia santai",
    ],
    badgeText: "Ada Pesanan Masuk!",
    cardHeader: "Pertanyaan Produk Pembeli:",
    cardBody: '"Halo min, apakah kemeja batik modern warna navy ukuran L masih ada? Mau kirim ke Surabaya."',
    statusText: "Status AI: Stok Ready (15 pcs)",
  },
  2: {
    title: "Terima pembayaran QRIS langsung",
    italic: "tanpa cek mutasi manual",
    desc: "Kode QRIS otomatis terbit dengan nominal presisi termasuk ongkir. Pembeli tinggal scan via m-banking atau e-wallet, dan status pesanan langsung berubah lunas dalam 2 detik.",
    points: [
      "QRIS berstandar EMVCo Nasional (BCA Mobile, GoPay, OVO, ShopeePay, Dana)",
      "Nominal terkunci otomatis, pembeli tidak perlu mengetik manual",
      "Sistem anti-struk palsu & auto-reconcile mutasi rekening bank resmi",
    ],
    badgeText: "Dynamic QRIS Diterbitkan",
    cardHeader: "Tagihan Pembayaran QRIS:",
    cardBody: "2x Kemeja Batik Navy L — Total: Rp 312.000 (Termasuk Ongkir)",
    statusText: "Batas Waktu: 15 Menit",
  },
  3: {
    title: "Cetak resi pengiriman &",
    italic: "booking kurir otomatis",
    desc: "Bandingkan ongkir semua ekspedisi dalam 1 layar, pesan kurir untuk jemput paket tanpa perlu keluar rumah, dan kirim nomor resi otomatis ke WhatsApp pembeli.",
    points: [
      "Terhubung multi-ekspedisi: J&T, SiCepat, JNE, Lion Parcel, SAP Express",
      "Cashback ongkir 15-25% langsung masuk ke saldo akun toko Anda",
      "Resi pengiriman & invoice PDF terkirim otomatis ke WhatsApp pembeli",
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
    <section id="solusi" className="py-20 md:py-28 bg-[#f9f8f6] border-b border-[#f0e9e1]">
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        
        {/* Step Indicator Tabs */}
        <div className="flex items-center gap-4 sm:gap-8 mb-12 border-b border-[#f0e9e1] pb-4 overflow-x-auto">
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
                className={`text-[14px] sm:text-[15px] font-semibold flex items-center gap-2.5 pb-2 transition-all border-none bg-transparent cursor-pointer whitespace-nowrap relative ${
                  isActive ? "text-[#2545ff]" : "text-[#969696] hover:text-[#171417]"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isActive ? "bg-[#2545ff] scale-125 ring-4 ring-[#2545ff]/20" : "bg-[#cccccc]"
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2545ff] transition-all" />
                )}
              </button>
            );
          })}
        </div>

        {/* 2-Column Split: Content Left & Royal Blue Container Right */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column with Smooth Tab Transition */}
          <div key={`text-${activeStep}`} className="lg:col-span-6 flex flex-col gap-6 animate-scale-pop">
            <h2 className="text-display-headline text-[32px] sm:text-[42px] md:text-[46px] text-[#171417] leading-[1.12]">
              {current.title}{" "}
              <span className="italic-signature">{current.italic}</span>
            </h2>

            <p className="text-[17px] leading-[1.65] text-[#171417]">
              {current.desc}
            </p>

            {/* Blue Checkmark Checklist */}
            <ul className="flex flex-col gap-3.5 my-2">
              {current.points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-[15px] text-[#171417]">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[#2545ff] mt-0.5">
                    <CheckCircleIcon className="w-5 h-5" />
                  </div>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
              <Link href="/dashboard" className="btn-primary text-[15px] !py-3.5 !px-8 font-medium text-center">
                Coba Gratis Sekarang
              </Link>
              <a href="#harga" className="btn-outline text-[15px] !py-3.5 !px-7 font-medium text-center">
                Lihat Paket Harga
              </a>
            </div>
          </div>

          {/* Right Column: Royal Blue Card Container */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[480px] bg-[#1a38db] rounded-[24px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(26,56,219,0.3)] text-white relative transition-all duration-300">
              
              {/* WhatsApp Pulse Notification Badge */}
              <div className="bg-white text-[#171417] rounded-xl p-3 shadow-md inline-flex items-center gap-2.5 mb-5 animate-pulse-glow">
                <div className="w-6 h-6 rounded-md bg-[#2545ff] text-white flex items-center justify-center font-bold text-[11px]">
                  WA
                </div>
                <span className="text-[13px] font-bold">{current.badgeText}</span>
              </div>

              {/* Chat Container Card with Pop Animation on tab switch */}
              <div key={`card-${activeStep}`} className="bg-white text-[#171417] rounded-2xl p-5 shadow-lg animate-scale-pop">
                <div className="text-[13px] font-bold text-[#171417] mb-2">
                  {current.cardHeader}
                </div>
                
                {/* Step 1: Chat content */}
                {activeStep === 1 && (
                  <div className="p-3.5 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] text-[13px] text-[#171417] mb-4 leading-relaxed">
                    {current.cardBody}
                  </div>
                )}

                {/* Step 2: QRIS preview content */}
                {activeStep === 2 && (
                  <div className="p-3.5 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] mb-4 text-center">
                    {paidStep2 ? (
                      <div className="py-2 animate-scale-pop">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1.5 font-bold">
                          <CheckIcon className="w-5 h-5" />
                        </div>
                        <div className="text-[14px] font-bold text-emerald-700">Pembayaran Rp 312.000 Lunas!</div>
                        <div className="text-[11px] text-[#969696]">Mutasi rekening BCA cocok 100%</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-white p-2 rounded-xl border border-[#f0e9e1] flex items-center justify-center mb-2 shadow-sm">
                          <QrIcon className="w-16 h-16 text-[#0c1754]" />
                        </div>
                        <span className="text-[13px] font-bold text-[#0c1754]">Rp 312.000</span>
                        <span className="text-[10px] text-[#969696]">Scan via BCA, GoPay, OVO, ShopeePay</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Courier Resi preview content */}
                {activeStep === 3 && (
                  <div className="p-3.5 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] mb-4">
                    {printedStep3 ? (
                      <div className="py-2 text-center animate-scale-pop">
                        <div className="text-[14px] font-bold text-emerald-700">Resi Berhasil Dicetak & Dikirim ke WA</div>
                        <div className="text-[11px] text-[#969696] mt-1">Kurir J&T dijadwalkan pick-up jam 14.00 WIB</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center flex-shrink-0">
                          <TruckIcon className="w-6 h-6" />
                        </div>
                        <div className="text-[12px] text-[#171417]">
                          <div className="font-bold text-[#0c1754]">J&T Express (Cashback 20%)</div>
                          <div className="text-[#969696]">Resi: <span className="font-mono font-bold text-[#171417]">JX1829482910</span></div>
                          <div className="text-[#969696]">Penerima: Budi (Tebet, Jaksel)</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#f0e9e1] text-[12px]">
                  <span className="text-[#969696] font-medium">{current.statusText}</span>
                  
                  {activeStep === 1 && (
                    <button
                      onClick={() => setActiveStep(2)}
                      className="bg-[#2545ff] text-white px-4 py-1.5 rounded-full font-semibold text-[12px] border-none cursor-pointer hover:bg-[#1a35dd] transition-colors"
                    >
                      Lanjut ke QRIS →
                    </button>
                  )}

                  {activeStep === 2 && (
                    <button
                      onClick={paidStep2 ? () => setPaidStep2(false) : handleSimulatePayment}
                      disabled={isProcessing}
                      className="bg-[#2545ff] text-white px-4 py-1.5 rounded-full font-semibold text-[12px] border-none cursor-pointer hover:bg-[#1a35dd] transition-colors"
                    >
                      {isProcessing ? "Memproses..." : paidStep2 ? "Ulangi" : "Klik Simulasi Bayar"}
                    </button>
                  )}

                  {activeStep === 3 && (
                    <button
                      onClick={printedStep3 ? () => setPrintedStep3(false) : handlePrintAwb}
                      disabled={isProcessing}
                      className="bg-[#2545ff] text-white px-4 py-1.5 rounded-full font-semibold text-[12px] border-none cursor-pointer hover:bg-[#1a35dd] transition-colors"
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
