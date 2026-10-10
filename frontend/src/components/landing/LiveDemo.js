"use client";
import { useState } from "react";
import { QrIcon, ShieldCheckIcon, MicIcon, CheckCircleIcon, RefreshCwIcon, DollarSignIcon } from "@/components/icons";

export default function LiveDemo() {
  const [activeSimulator, setActiveSimulator] = useState("qris");
  
  // QRIS state
  const [qrisAmount, setQrisAmount] = useState(150000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Fraud state
  const [fraudScore, setFraudScore] = useState(98);
  const [analyzing, setAnalyzing] = useState(false);

  const triggerQrisSimulation = () => {
    setIsGenerating(true);
    setIsPaid(false);
    setTimeout(() => {
      setIsGenerating(false);
    }, 400);
  };

  const triggerPaymentSuccess = () => {
    setIsPaid(true);
  };

  const triggerFraudScan = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setFraudScore(99);
    }, 700);
  };

  return (
    <section id="demo" className="py-20 md:py-28 bg-sand border-b border-line relative">
      <div className="container-page">
        
        {/* Section Header */}
        <div className="text-center max-w-[720px] mx-auto mb-12">
          <span className="eyebrow-label text-brand block mb-3">Simulasi Interaktif</span>
          <h2 className="section-title">
            Coba langsung <span className="italic-signature">kemudahan fitur</span> Klozer
          </h2>
          <p className="section-lead">
            Pilih simulasi di bawah untuk melihat bagaimana sistem Klozer bekerja dalam hitungan detik.
          </p>

          {/* Simulator switcher tabs */}
          <div className="inline-flex flex-wrap justify-center p-1.5 rounded-full bg-white border border-line shadow-sm mt-6 gap-1">
            {[
              { id: "qris", label: "QRIS Otomatis di Chat", icon: <QrIcon className="w-4 h-4" /> },
              { id: "fraud", label: "Deteksi Struk Palsu", icon: <ShieldCheckIcon className="w-4 h-4" /> },
              { id: "voice", label: "Paham Pesan Suara", icon: <MicIcon className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSimulator(tab.id)}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-body-sm font-bold transition-all cursor-pointer border-none flex items-center gap-2 ${
                  activeSimulator === tab.id
                    ? "bg-brand text-white shadow-md"
                    : "bg-transparent text-fg hover:text-ink"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sandbox Content Container */}
        <div className="max-w-[960px] mx-auto">
          
          {/* 1. Dynamic QRIS Sandbox */}
          {activeSimulator === "qris" && (
            <div className="bg-white rounded-2xl p-6 sm:p-9 border border-line shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-label font-bold text-brand uppercase tracking-wider mb-2">
                  Fitur Pembayaran Instan
                </div>
                <h3 className="text-subheading font-bold text-ink mb-3">
                  Simulasi Bayar QRIS Otomatis
                </h3>
                <p className="text-body-sm text-fg leading-relaxed mb-5">
                  Saat pembeli setuju memesan, QRIS dengan total harga yang tepat langsung muncul di WhatsApp. Pembeli tidak perlu mengetik angka atau upload struk.
                </p>

                <div className="mb-5">
                  <label className="text-body-sm font-bold text-fg block mb-2">
                    Pilih Contoh Nominal Belanja:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[150000, 275000, 450000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          setQrisAmount(amt);
                          setIsPaid(false);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-body-sm font-semibold border transition-all cursor-pointer ${
                          qrisAmount === amt
                            ? "bg-brand text-white border-brand"
                            : "bg-canvas text-fg border-line hover:border-brand"
                        }`}
                      >
                        Rp {amt.toLocaleString("id-ID")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {!isPaid && (
                    <button
                      onClick={triggerPaymentSuccess}
                      className="btn-primary !py-3 !text-body-sm text-center w-full justify-center"
                    >
                      <DollarSignIcon className="w-4 h-4" />
                      <span>Simulasikan Pembeli Scan & Bayar</span>
                    </button>
                  )}
                  {isPaid && (
                    <button
                      onClick={() => setIsPaid(false)}
                      className="btn-secondary !py-2.5 !text-body-sm text-center w-full justify-center"
                    >
                      <RefreshCwIcon className="w-4 h-4" />
                      <span>Ulangi Simulasi</span>
                    </button>
                  )}
                </div>
              </div>

              {/* QR Preview Widget */}
              <div className="bg-canvas p-6 rounded-2xl border border-line flex flex-col items-center justify-center text-center">
                {isPaid ? (
                  <div className="py-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                      <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <div className="text-title font-bold text-emerald-700 mb-1">
                      Pembayaran Rp {qrisAmount.toLocaleString("id-ID")} LUNAS!
                    </div>
                    <p className="text-body-sm text-fg">
                      Pesanan otomatis berstatus <strong>Lunas</strong>. Invoice PDF terkirim detik itu juga ke pembeli.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-caption font-bold text-fg-muted uppercase tracking-wider mb-1">
                      QRIS Berlaku 15 Menit
                    </div>
                    <div className="text-subheading font-bold text-ink mb-3">
                      Rp {qrisAmount.toLocaleString("id-ID")}
                    </div>
                    
                    <div className="w-44 h-44 bg-white p-3 rounded-2xl shadow-sm border border-line mx-auto flex items-center justify-center">
                      <QrIcon className="w-32 h-32 text-ink" />
                    </div>
                    <span className="text-caption text-fg-muted mt-2 block">
                      Dapat di-scan semua aplikasi m-Banking & e-Wallet
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Fraud Scanner Sandbox */}
          {activeSimulator === "fraud" && (
            <div className="bg-white rounded-2xl p-6 sm:p-9 border border-line shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-label font-bold text-red-600 uppercase tracking-wider mb-2">
                  Proteksi Bukti Transfer Palsu
                </div>
                <h3 className="text-subheading font-bold text-ink mb-3">
                  Verifikasi Keaslian Struk Otomatis
                </h3>
                <p className="text-body-sm text-fg leading-relaxed mb-5">
                  Setiap kali ada pelanggan yang mengirim foto bukti transfer manual, AI memeriksa keaslian font dan mencocokkan nominal dengan mutasi rekening bank secara otomatis.
                </p>

                <button
                  onClick={triggerFraudScan}
                  disabled={analyzing}
                  className="btn-primary w-full text-center !py-3 !text-body-sm justify-center"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>{analyzing ? "Memeriksa Mutasi Bank..." : "Uji Cek Keabsahan Struk Transfer"}</span>
                </button>
              </div>

              <div className="bg-canvas p-6 rounded-2xl border border-line flex flex-col items-center justify-center text-center">
                <div className="w-full bg-white rounded-xl p-4 border border-line mb-4">
                  <div className="text-caption font-bold text-fg-muted uppercase mb-1">Status Verifikasi Rekening</div>
                  <div className="text-heading font-bold text-emerald-600 leading-tight">
                    {analyzing ? "..." : "Terverifikasi Asli"}
                  </div>
                  <div className="text-label font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mt-2">
                    Uang Masuk di Bank BCA Rp 312.000 Cocok
                  </div>
                </div>

                <div className="text-label text-fg text-left w-full space-y-1 bg-white p-3 rounded-lg border border-line">
                  <div><strong>Bank Tujuan:</strong> BCA - Rekening Utama Toko</div>
                  <div><strong>Status:</strong> Uang sudah masuk rekening</div>
                  <div><strong>Tindakan:</strong> Pesanan aman untuk dikirim</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Voice AI Sandbox */}
          {activeSimulator === "voice" && (
            <div className="bg-white rounded-2xl p-6 sm:p-9 border border-line shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-label font-bold text-brand uppercase tracking-wider mb-2">
                  Teknologi Suara AI
                </div>
                <h3 className="text-subheading font-bold text-ink mb-3">
                  Transkripsi Voice Note Bahasa Indonesia
                </h3>
                <p className="text-body-sm text-fg leading-relaxed mb-4">
                  AI mendengarkan pesan suara pembeli dan langsung mengenali maksudnya. CS tidak perlu membuang waktu mendengarkan rekaman suara panjang.
                </p>
                <div className="p-3 bg-canvas rounded-xl border border-line text-body-sm text-fg">
                  <strong>Contoh Pesan Suara Masuk:</strong><br />
                  &quot;Kak kaos polos hitam ukuran XL masih ada ga ya? Mau ambil dua pcs kirim ke Jakarta.&quot;
                </div>
              </div>

              <div className="bg-canvas p-6 rounded-2xl border border-line">
                <div className="text-caption font-bold text-brand uppercase mb-2">
                  Balasan Otomatis AI (Teks & Suara):
                </div>
                <div className="bg-white p-4 rounded-xl border border-line text-body-sm text-fg leading-relaxed">
                  &quot;Halo kak! Kaos Hitam XL masih ready stok 142 pcs. Total untuk 2 pcs adalah Rp 300.000 + ongkir Rp 12.000. Mau dibantu kirim dengan QRIS instan kak?&quot;
                </div>
                <div className="flex justify-between items-center text-caption text-fg-muted mt-3">
                  <span>Waktu Balas: 1.4 detik</span>
                  <span className="text-emerald-700 font-bold">Siap Closing</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
