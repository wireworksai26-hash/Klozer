"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  CrownIcon,
  CheckCircleIcon,
  CreditCardIcon,
  QrIcon,
  ZapIcon,
  UsersIcon,
  SparklesIcon,
  RadioIcon,
  CalendarIcon,
  BuildingIcon,
  AlertTriangleIcon,
  XIcon,
  DollarSignIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export default function StoreSubscriptionPage() {
  const {
    currentUser,
    activeInstitution,
    activeSubscription,
    extendSubscription,
  } = useDashboard();

  const storeName = currentUser?.institutionName || activeInstitution?.name || "Geprek Juara";
  const sub = activeSubscription || {
    id: "SUB-104",
    institutionName: storeName,
    plan: "Pro Growth",
    pricePerMonth: 999000,
    csSeats: 5,
    csSeatsUsed: 3,
    tokenQuota: "200,000 / bln",
    aiEngine: "NVIDIA NIM (Llama 3.3 70B)",
    startDate: "28 Agu 2026",
    expiryDate: "28 Agu 2027",
    daysLeft: 350,
    status: "active",
    billingCycle: "Tahunan",
  };

  // State for Renewal / Topup Modal
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1); // months
  const [selectedTier, setSelectedTier] = useState(sub.plan || "Pro Growth");
  const [additionalSeats, setAdditionalSeats] = useState(0);
  const [selectedTokenAddon, setSelectedTokenAddon] = useState("0");
  const [selectedWaAddon, setSelectedWaAddon] = useState("0");
  const [paymentMode, setPaymentMode] = useState("qris"); // 'qris' | 'va' | 'wa'
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  // Plan catalog pricing
  const planCatalog = [
    {
      name: "Starter AI",
      price: 499000,
      period: "/bulan",
      desc: "Solusi cerdas untuk toko online pemula yang baru merintis CS otomatis WhatsApp.",
      seats: 2,
      tokens: "50,000 / bln",
      features: [
        "2 Kursi Staf CS Terhubung",
        "50,000 AI Token / bln",
        "Live Chat Inbox WhatsApp",
        "Dynamic QRIS Statis",
        "Resep & BOM Produk Standar",
      ],
      recommended: false,
    },
    {
      name: "Pro Growth",
      price: 999000,
      period: "/bulan",
      desc: "Paket terpopuler untuk bisnis berkembang & F&B dengan volume transaksi harian tinggi.",
      seats: 5,
      tokens: "200,000 / bln",
      features: [
        "5 Kursi Staf CS Multi-Seat",
        "200,000 AI Token NVIDIA NIM / bln",
        "Anti-Fraud Deteksi Struk Palsu",
        "Voice Note AI & Whisper STT",
        "Smart WhatsApp Broadcast",
        "Integrasi Instagram Direct Message",
        "Cetak Tiket Dapur & Thermal Resi",
      ],
      recommended: true,
    },
    {
      name: "Enterprise Scale",
      price: 2499000,
      period: "/bulan",
      desc: "Skala enterprise dengan performa tanpa batas, dedicated server GPU & multi-gudang.",
      seats: 15,
      tokens: "500,000 / bln",
      features: [
        "15 Kursi Staf CS (Bisa Tambah Tanpa Batas)",
        "500,000 AI Token NVIDIA Dedicated",
        "Multi-Hub Gudang & Multi-Cabang",
        "Custom Persona & Fine-Tuned NLP",
        "Prioritas Server Uptime 99.99%",
        "Dedicated Account Manager 24/7",
      ],
      recommended: false,
    },
  ];

  // Duration options
  const durationOptions = [
    { months: 1, label: "1 Bulan", discountPercent: 0, tag: "Reguler" },
    { months: 3, label: "3 Bulan", discountPercent: 5, tag: "Hemat 5%" },
    { months: 6, label: "6 Bulan", discountPercent: 10, tag: "Hemat 10%" },
    { months: 12, label: "12 Bulan (1 Thn)", discountPercent: 20, tag: "Hemat 20% 🔥" },
  ];
  const currentDurationObj = durationOptions.find((d) => d.months === selectedDuration) || durationOptions[0];

  // Pricing math
  const targetPlan = planCatalog.find((p) => p.name === selectedTier) || planCatalog[1];
  const grossPlanPrice = targetPlan.price * selectedDuration;
  const discountVal = Math.round(grossPlanPrice * (currentDurationObj.discountPercent / 100));
  const netPlanPrice = grossPlanPrice - discountVal;

  const seatsPrice = additionalSeats * 99000 * selectedDuration;

  const tokenAddons = {
    "0": { label: "Tidak Ada", tokens: 0, price: 0 },
    "100k": { label: "+100k Token", tokens: 100000, price: 50000 },
    "500k": { label: "+500k Token", tokens: 500000, price: 200000 },
    "1m": { label: "+1M Token", tokens: 1000000, price: 350000 },
  };
  const tokenCost = tokenAddons[selectedTokenAddon]?.price || 0;

  const waAddons = {
    "0": { label: "Tidak Ada", msgs: 0, price: 0 },
    "1k": { label: "+1.000 Pesan WA", msgs: 1000, price: 150000 },
    "5k": { label: "+5.000 Pesan WA", msgs: 5000, price: 600000 },
  };
  const waCost = waAddons[selectedWaAddon]?.price || 0;

  const grandTotal = netPlanPrice + seatsPrice + tokenCost + waCost;

  // Open modal with specific target tier
  const handleOpenModal = (tierName) => {
    if (tierName) setSelectedTier(tierName);
    setShowRenewModal(true);
    setPaymentSuccess(false);
  };

  // Submit payment & renewal
  const handleExecutePayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const daysToAdd = selectedDuration * 30;
      const cycleLabel =
        selectedDuration === 12
          ? "Tahunan (Diskon 20%)"
          : selectedDuration === 6
          ? "6 Bulan (Diskon 10%)"
          : selectedDuration === 3
          ? "3 Bulan (Diskon 5%)"
          : "Bulanan";

      if (typeof extendSubscription === "function") {
        extendSubscription(sub.id || sub.institutionId, {
          daysToAdd,
          additionalSeats,
          plan: selectedTier,
          pricePerMonth: targetPlan.price,
          billingCycle: cycleLabel,
          paymentMethod: paymentMode === "qris" ? "Dynamic QRIS 1-Klik" : "BCA Virtual Account",
        });
      }

      setIsProcessing(false);
      setPaymentSuccess(true);

      setToast({
        show: true,
        message: `Pembayaran Berhasil! Paket ${storeName} diperpanjang +${daysToAdd} hari (${selectedDuration} bulan).`,
      });

      setTimeout(() => {
        setToast({ show: false, message: "" });
      }, 5000);
    }, 1200);
  };

  // Mock Invoice History
  const invoiceHistory = [
    {
      id: "INV-2026-0812",
      date: "28 Agustus 2026",
      desc: `Langganan Tahunan ${sub.plan} (${storeName})`,
      amount: sub.pricePerMonth * 12 * 0.8,
      method: "Dynamic QRIS",
      status: "LUNAS",
    },
    {
      id: "INV-2026-0701",
      date: "01 Juli 2026",
      desc: "Top-up Kuota Pesan Broadcast WA 5.000 Pesan",
      amount: 600000,
      method: "BCA Virtual Account",
      status: "LUNAS",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-slide-in">
          <CheckCircleIcon className="w-5 h-5 text-emerald-200 flex-shrink-0" />
          <span className="text-[13.5px] font-bold">{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: "" })}
            className="text-white/80 hover:text-white ml-2 bg-transparent border-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Lisensi & Masa Aktif Toko</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Paket Langganan & Kuota Toko
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kelola masa aktif lisensi toko {storeName}, kapasitas staf CS frontliner, dan lakukan perpanjangan instan via QRIS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal(sub.plan)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-md"
        >
          <CreditCardIcon className="w-4 h-4" />
          <span>+ Perpanjang & Upgrade Paket</span>
        </button>
      </div>

      {/* ==================== ACTIVE PLAN HERO CARD ==================== */}
      <div className="bg-gradient-to-br from-[#0c1754] via-[#16277a] to-[#2545ff] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-extrabold uppercase tracking-wider">
                ● Status Langganan Aktif
              </span>
              <span className="text-white/70 text-[12px] font-mono">
                {sub.id} • {storeName}
              </span>
            </div>

            <h2 className="text-[30px] sm:text-[34px] font-black tracking-tight flex items-center gap-3">
              <span>{sub.plan}</span>
              <span className="text-[15px] font-medium text-white/80 font-sans px-2.5 py-1 rounded-lg bg-white/10">
                {sub.billingCycle}
              </span>
            </h2>

            <p className="text-[13.5px] text-white/80 mt-1 max-w-[600px]">
              Lisensi aktif memberi Anda akses penuh ke seluruh modul AI, Multi-CS WhatsApp, dan verifikasi QRIS otomatis.
            </p>
          </div>

          {/* Sisa Hari Pill & Action */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 flex flex-col items-center sm:items-end justify-center">
            <span className="text-[11.5px] uppercase tracking-wider text-white/70 font-bold">Masa Berlaku Tersisa</span>
            <div className="text-[36px] font-black text-amber-300 font-mono my-0.5">
              {sub.daysLeft} <span className="text-[16px] font-sans font-normal text-white/80">Hari</span>
            </div>
            <span className="text-[12px] text-white/90">Kedaluwarsa: <strong>{sub.expiryDate}</strong></span>

            <button
              type="button"
              onClick={() => handleOpenModal(sub.plan)}
              className="mt-3 px-4 py-2 rounded-xl bg-white text-[#0c1754] hover:bg-white/90 font-extrabold text-[12.5px] border-none cursor-pointer transition-all shadow-sm"
            >
              Perpanjang Sekarang →
            </button>
          </div>
        </div>

        {/* 3 Resource Status Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[12px] text-white/80 mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <UsersIcon className="w-3.5 h-3.5 text-blue-200" />
                <span>Kursi Frontliner CS</span>
              </span>
              <span className="font-extrabold">{sub.csSeatsUsed} / {sub.csSeats} Kursi</span>
            </div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, (sub.csSeatsUsed / sub.csSeats) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-white/60 mt-1 block">
              Sisa {Math.max(0, sub.csSeats - sub.csSeatsUsed)} slot kursi staf tersedia
            </span>
          </div>

          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[12px] text-white/80 mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <SparklesIcon className="w-3.5 h-3.5 text-purple-300" />
                <span>Kuota AI Token (NVIDIA NIM)</span>
              </span>
              <span className="font-extrabold">{sub.tokenQuota}</span>
            </div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: "45%" }} />
            </div>
            <span className="text-[11px] text-white/60 mt-1 block">
              Model: {sub.aiEngine}
            </span>
          </div>

          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[12px] text-white/80 mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <RadioIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>Kuota Pesan WhatsApp</span>
              </span>
              <span className="font-extrabold">1,450 Pesan</span>
            </div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: "72%" }} />
            </div>
            <span className="text-[11px] text-white/60 mt-1 block">
              Rate Limiter Aman & Anti-Banned Aktif
            </span>
          </div>
        </div>
      </div>

      {/* ==================== PLAN COMPARISON MATRIX ==================== */}
      <div>
        <div className="mb-4">
          <h2 className="text-[20px] font-extrabold text-[#0c1754]">Pilihan Paket & Upgrade Toko</h2>
          <p className="text-[13px] text-[#64748b]">
            Tingkatkan kapasitas bisnis Anda kapan saja. Masa aktif tersisa akan dihitung secara proporsional.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {planCatalog.map((plan) => {
            const isCurrentPlan = (sub.plan || "").toLowerCase() === plan.name.toLowerCase();

            return (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between relative ${
                  plan.recommended
                    ? "border-[#2545ff] shadow-lg ring-2 ring-[#2545ff]/20"
                    : "border-[#ede8e2] shadow-xs hover:border-[#cbd5e1]"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2545ff] text-white text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-sm">
                    Rekomendasi Terbaik
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[18px] font-extrabold text-[#0c1754]">{plan.name}</h3>
                    {isCurrentPlan && (
                      <span className="badge badge-success text-[11px] font-extrabold">
                        Paket Aktif
                      </span>
                    )}
                  </div>

                  <p className="text-[12.5px] text-[#64748b] mb-4 min-h-[36px]">{plan.desc}</p>

                  <div className="flex items-baseline gap-1 pb-4 mb-4 border-b border-[#ede8e2]">
                    <span className="text-[28px] font-black text-[#0c1754]">
                      Rp {plan.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[12px] font-medium text-[#8f95a8]">{plan.period}</span>
                  </div>

                  <ul className="flex flex-col gap-2.5 mb-6 text-[12.5px] text-[#1e2640]">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenModal(plan.name)}
                  className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-[13px] border-none cursor-pointer transition-all ${
                    isCurrentPlan
                      ? "bg-blue-50 text-[#2545ff] hover:bg-blue-100"
                      : plan.recommended
                      ? "btn-primary !py-2.5"
                      : "bg-[#f5f4f2] text-[#1e2640] hover:bg-[#ede8e2]"
                  }`}
                >
                  {isCurrentPlan ? "Perpanjang Paket Ini" : `Upgrade ke ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== BILLING & INVOICE HISTORY ==================== */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
          <div>
            <h3 className="text-[16px] font-extrabold text-[#0c1754]">Riwayat Tagihan & Faktur Toko</h3>
            <p className="text-[12px] text-[#8f95a8]">Daftar transaksi perpanjangan paket dan bukti pembayaran resmi.</p>
          </div>
          <span className="badge badge-lavender text-[11px] font-bold">Pajak Otomatis (PPN 11%)</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>No. Faktur</th>
                <th>Tanggal Pembayaran</th>
                <th>Keterangan Transaksi</th>
                <th>Metode</th>
                <th>Total Bayar</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoiceHistory.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#fcfbf9]">
                  <td className="font-mono font-bold text-[13px] text-[#2545ff]">{inv.id}</td>
                  <td className="text-[12.5px] text-[#64748b]">{inv.date}</td>
                  <td className="text-[13px] font-semibold text-[#1e2640]">{inv.desc}</td>
                  <td className="text-[12px] text-[#64748b]">{inv.method}</td>
                  <td className="font-mono font-extrabold text-[13.5px] text-[#0c1754]">
                    Rp {inv.amount.toLocaleString("id-ID")}
                  </td>
                  <td>
                    <span className="badge badge-success text-[10.5px] font-extrabold">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== INTERACTIVE SPV RENEWAL MODAL ==================== */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-[#0c1754]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-[720px] p-6 sm:p-7 shadow-2xl border border-[#ede8e2] my-8 animate-scale-pop">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#ede8e2]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-lavender text-[10.5px] font-extrabold uppercase">
                    Perpanjangan & Top-Up Toko
                  </span>
                  <span className="text-[11px] font-mono text-[#8f95a8]">{storeName}</span>
                </div>
                <h2 className="text-[20px] font-extrabold text-[#0c1754]">
                  Checkout Perpanjangan Paket
                </h2>
                <p className="text-[12.5px] text-[#64748b]">
                  Pilih durasi dan add-on kuota, lalu selesaikan pembayaran via Dynamic QRIS instan.
                </p>
              </div>

              <button
                onClick={() => setShowRenewModal(false)}
                className="w-8 h-8 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {paymentSuccess ? (
              /* Success Screen */
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircleIcon className="w-9 h-9" />
                </div>
                <h3 className="text-[22px] font-extrabold text-[#0c1754]">Pembayaran Berhasil Dikonfirmasi!</h3>
                <p className="text-[13.5px] text-[#64748b] max-w-[440px] mt-1 mb-6">
                  Paket <strong>{selectedTier}</strong> untuk toko <strong>{storeName}</strong> telah berhasil diperpanjang +{selectedDuration * 30} hari. Kuota dan kursi staf langsung aktif otomatis.
                </p>

                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="btn-primary !py-2.5 !px-8 text-[13.5px] font-bold"
                >
                  Selesai & Kembali ke Dashboard
                </button>
              </div>
            ) : (
              /* Checkout Form */
              <div className="flex flex-col gap-4 max-h-[62vh] overflow-y-auto pr-1 mt-3">
                
                {/* 1. Durasi Perpanjangan */}
                <div>
                  <label className="text-[12.5px] font-bold text-[#1e2640] block mb-1.5">
                    1. Pilih Durasi Langganan:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {durationOptions.map((d) => (
                      <button
                        key={d.months}
                        type="button"
                        onClick={() => setSelectedDuration(d.months)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedDuration === d.months
                            ? "border-[#2545ff] bg-blue-50/70 ring-1 ring-[#2545ff]"
                            : "border-[#ede8e2] bg-white hover:bg-[#fcfbf9]"
                        }`}
                      >
                        <div className="font-extrabold text-[13px] text-[#0c1754]">{d.label}</div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${
                          d.discountPercent > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-[#64748b]"
                        }`}>
                          {d.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Pilih Tier Paket */}
                <div>
                  <label className="text-[12.5px] font-bold text-[#1e2640] block mb-1.5">
                    2. Paket yang Dipilih:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Starter AI", "Pro Growth", "Enterprise Scale"].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedTier === tier
                            ? "border-[#2545ff] bg-blue-50/70 ring-1 ring-[#2545ff]"
                            : "border-[#ede8e2] bg-white hover:bg-[#fcfbf9]"
                        }`}
                      >
                        <span className="font-bold text-[12.5px] text-[#0c1754] block">{tier}</span>
                        <span className="text-[11px] text-[#2545ff] font-extrabold">
                          Rp {(planCatalog.find((p) => p.name === tier)?.price || 0).toLocaleString("id-ID")}/bln
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Add-on Kursi CS */}
                <div className="p-3 bg-[#fcfbf9] rounded-xl border border-[#ede8e2] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[12.5px] text-[#1e2640] flex items-center gap-1.5">
                      <UsersIcon className="w-3.5 h-3.5 text-[#2545ff]" />
                      <span>Tambah Kursi Staf CS:</span>
                    </span>
                    <span className="text-[11px] text-[#8f95a8]">Rp 99.000 / kursi / bulan</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdditionalSeats(Math.max(0, additionalSeats - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-[#ede8e2] font-bold text-[#1e2640] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-extrabold text-[13.5px] text-[#0c1754]">
                      +{additionalSeats}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdditionalSeats(additionalSeats + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-[#ede8e2] font-bold text-[#1e2640] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Top-up AI & Broadcast Addons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border border-[#ede8e2] bg-white">
                    <span className="font-bold text-[12px] text-[#1e2640] block mb-1">Top-Up Kuota AI:</span>
                    <select
                      value={selectedTokenAddon}
                      onChange={(e) => setSelectedTokenAddon(e.target.value)}
                      className="w-full text-[12px] p-2 rounded-lg border border-[#ede8e2]"
                    >
                      <option value="0">Tidak Ada (Rp 0)</option>
                      <option value="100k">+100k Token (+Rp 50.000)</option>
                      <option value="500k">+500k Token (+Rp 200.000)</option>
                      <option value="1m">+1M Token (+Rp 350.000)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl border border-[#ede8e2] bg-white">
                    <span className="font-bold text-[12px] text-[#1e2640] block mb-1">Top-Up Broadcast WA:</span>
                    <select
                      value={selectedWaAddon}
                      onChange={(e) => setSelectedWaAddon(e.target.value)}
                      className="w-full text-[12px] p-2 rounded-lg border border-[#ede8e2]"
                    >
                      <option value="0">Tidak Ada (Rp 0)</option>
                      <option value="1k">+1.000 Pesan (+Rp 150.000)</option>
                      <option value="5k">+5.000 Pesan (+Rp 600.000)</option>
                    </select>
                  </div>
                </div>

                {/* 5. Payment Channel Selection */}
                <div>
                  <label className="text-[12.5px] font-bold text-[#1e2640] block mb-1.5">
                    3. Metode Pembayaran:
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMode("qris")}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMode === "qris"
                          ? "border-[#2545ff] bg-blue-50/70 text-[#2545ff] font-bold"
                          : "border-[#ede8e2] bg-white text-[#64748b]"
                      }`}
                    >
                      <QrIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-[11.5px]">Dynamic QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode("va")}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMode === "va"
                          ? "border-[#2545ff] bg-blue-50/70 text-[#2545ff] font-bold"
                          : "border-[#ede8e2] bg-white text-[#64748b]"
                      }`}
                    >
                      <CreditCardIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-[11.5px]">BCA Virtual Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode("wa")}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMode === "wa"
                          ? "border-[#2545ff] bg-blue-50/70 text-[#2545ff] font-bold"
                          : "border-[#ede8e2] bg-white text-[#64748b]"
                      }`}
                    >
                      <RadioIcon className="w-5 h-5 text-purple-600" />
                      <span className="text-[11.5px]">Invoice Superadmin</span>
                    </button>
                  </div>

                  {/* Payment Simulator Widget */}
                  {paymentMode === "qris" && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-24 h-24 bg-white p-1.5 rounded-xl border border-emerald-300 shadow-xs flex items-center justify-center flex-shrink-0">
                        <QrIcon className="w-20 h-20 text-emerald-800" />
                      </div>
                      <div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-800 block">
                          QRIS Siap Di-Scan (BCA, GoPay, OVO, ShopeePay)
                        </span>
                        <div className="text-[18px] font-black text-emerald-950 font-mono my-0.5">
                          Rp {grandTotal.toLocaleString("id-ID")}
                        </div>
                        <p className="text-[11.5px] text-emerald-800">
                          Klik tombol bayar di bawah untuk memvalidasi pembayaran instan dan memperpanjang masa aktif dalam 2 detik.
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentMode === "va" && (
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                      <span className="text-[11.5px] font-bold text-blue-900 block">Nomor Virtual Account BCA:</span>
                      <div className="text-[20px] font-black font-mono text-blue-950 my-1">
                        8001 2948 1029 4810
                      </div>
                      <span className="text-[11px] text-blue-700">Atas Nama: PT Klozer Solusi Digital ({storeName})</span>
                    </div>
                  )}

                  {paymentMode === "wa" && (
                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-[12px] text-purple-900">
                      <p>
                        Ingin bayar via transfer manual perusahaan atau split invoice? Hubungi langsung Billing Support Superadmin Klozer.
                      </p>
                      <a
                        href={`https://wa.me/6281234567890?text=Halo%20Billing%20Klozer,%20saya%20SPV%20dari%20${encodeURIComponent(storeName)}%20ingin%20perpanjang%20paket%20${encodeURIComponent(selectedTier)}%20sebesar%20Rp%20${grandTotal.toLocaleString("id-ID")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11.5px] no-underline"
                      >
                        Kirim Bukti Transfer ke WhatsApp Superadmin →
                      </a>
                    </div>
                  )}
                </div>

                {/* Total Box */}
                <div className="p-3.5 bg-gradient-to-br from-[#0c1754] to-[#1e2640] rounded-xl text-white flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-white/70 block">Total Pembayaran:</span>
                    <span className="text-[12px] text-white/80">
                      {selectedTier} ({selectedDuration} Bln) + Add-ons
                    </span>
                  </div>
                  <div className="text-[20px] font-black text-amber-300">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#ede8e2]">
                  <button
                    type="button"
                    onClick={() => setShowRenewModal(false)}
                    className="btn-outline !py-2 !px-4 text-[12.5px]"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleExecutePayment}
                    disabled={isProcessing}
                    className="btn-primary !py-2 !px-5 text-[13px] font-bold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <CheckCircleIcon className="w-4 h-4 text-emerald-300" />
                    <span>
                      {isProcessing
                        ? "Memverifikasi Pembayaran..."
                        : `Bayar & Aktifkan Paket (Rp ${grandTotal.toLocaleString("id-ID")})`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
