"use client";
import { useState, useEffect } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  CalendarIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  BuildingIcon,
  DollarSignIcon,
  ZapIcon,
  SparklesIcon,
  XIcon,
  CreditCardIcon,
  UsersIcon,
  ShieldCheckIcon,
  RadioIcon,
} from "@/components/icons";

export default function SuperadminSubscriptionsPage() {
  const {
    institutions,
    subscriptions = [],
    setSubscriptions,
    extendSubscription,
  } = useDashboard();

  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedSubForExtend, setSelectedSubForExtend] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [showNewLicenseModal, setShowNewLicenseModal] = useState(false);

  // Form State inside Extend Modal
  const [durationMonths, setDurationMonths] = useState(1);
  const [additionalSeats, setAdditionalSeats] = useState(0);
  const [selectedTier, setSelectedTier] = useState("Pro Growth");
  const [selectedAiTokenAddon, setSelectedAiTokenAddon] = useState("0");
  const [selectedWaBroadcastAddon, setSelectedWaBroadcastAddon] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Transfer Bank BCA");
  const [transferRef, setTransferRef] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync new institutions into subscriptions list if not present
  useEffect(() => {
    if (Array.isArray(institutions) && institutions.length > 0 && typeof setSubscriptions === "function") {
      setSubscriptions((prev) => {
        const currentList = Array.isArray(prev) ? [...prev] : [];
        let changed = false;
        institutions.forEach((inst, idx) => {
          const exists = currentList.some(
            (s) =>
              s.institutionName?.toLowerCase() === inst.name?.toLowerCase() ||
              s.institutionId === inst.id
          );
          if (!exists) {
            currentList.push({
              id: `SUB-${200 + idx}`,
              institutionId: inst.id,
              institutionName: inst.name,
              plan: inst.tier || "Pro Growth",
              pricePerMonth: 999000,
              csSeats: 5,
              csSeatsUsed: 2,
              tokenQuota: "200,000 / bln",
              aiEngine: "NVIDIA NIM (Llama 3.3 70B)",
              startDate: inst.joinedDate || "Hari ini",
              expiryDate: "1 Tahun ke depan",
              daysLeft: 365,
              status: "active",
              billingCycle: "Bulanan",
            });
            changed = true;
          }
        });
        return changed ? currentList : prev;
      });
    }
  }, [institutions, setSubscriptions]);

  // When opening modal, initialize fields based on target tenant
  const openExtendModal = (sub) => {
    setSelectedSubForExtend(sub);
    setSelectedTier(sub.plan || "Pro Growth");
    setDurationMonths(1);
    setAdditionalSeats(0);
    setSelectedAiTokenAddon("0");
    setSelectedWaBroadcastAddon("0");
    setPaymentMethod("Transfer Bank BCA");
    setTransferRef(`TRX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`);
    setAdminNotes("");
  };

  // Tier pricing reference
  const tierPrices = {
    "Starter AI": 499000,
    "Pro Growth": 999000,
    "Enterprise Scale": 2499000,
    "NGO Social Plan": 499000,
  };

  const currentPlanPrice = tierPrices[selectedTier] || 999000;

  // Discounts based on duration
  const durationOptions = [
    { months: 1, label: "1 Bulan", discountPercent: 0, tag: "Normal" },
    { months: 3, label: "3 Bulan", discountPercent: 5, tag: "Hemat 5%" },
    { months: 6, label: "6 Bulan", discountPercent: 10, tag: "Hemat 10%" },
    { months: 12, label: "12 Bulan (1 Thn)", discountPercent: 20, tag: "Diskon 20% 🔥" },
  ];

  const currentDurationObj = durationOptions.find((d) => d.months === durationMonths) || durationOptions[0];

  // Token addon choices
  const tokenAddonList = [
    { id: "0", label: "Tidak Ada", tokens: 0, price: 0 },
    { id: "100k", label: "+100.000 Token", tokens: 100000, price: 50000 },
    { id: "500k", label: "+500.000 Token", tokens: 500000, price: 200000 },
    { id: "1m", label: "+1.000.000 Token", tokens: 1000000, price: 350000 },
    { id: "5m", label: "+5.000.000 Token", tokens: 5000000, price: 1200000 },
  ];
  const selectedTokenAddon = tokenAddonList.find((t) => t.id === selectedAiTokenAddon) || tokenAddonList[0];

  // WA broadcast credit choices
  const waAddonList = [
    { id: "0", label: "Tidak Ada", messages: 0, price: 0 },
    { id: "1k", label: "+1.000 Pesan WA", messages: 1000, price: 150000 },
    { id: "5k", label: "+5.000 Pesan WA", messages: 5000, price: 600000 },
    { id: "10k", label: "+10.000 Pesan WA", messages: 10000, price: 1100000 },
  ];
  const selectedWaAddon = waAddonList.find((w) => w.id === selectedWaBroadcastAddon) || waAddonList[0];

  // Calculations
  const grossBasePrice = currentPlanPrice * durationMonths;
  const discountAmount = Math.round(grossBasePrice * (currentDurationObj.discountPercent / 100));
  const netBasePrice = grossBasePrice - discountAmount;
  const seatsCost = additionalSeats * 99000 * durationMonths;
  const tokenCost = selectedTokenAddon.price;
  const waCost = selectedWaAddon.price;
  const grandTotal = netBasePrice + seatsCost + tokenCost + waCost;

  // Handle extension submission
  const handleConfirmExtension = () => {
    if (!selectedSubForExtend) return;
    setIsProcessing(true);

    setTimeout(() => {
      const daysToAdd = durationMonths * 30;

      // Extract existing token count if possible
      let currentTokenNumeric = 200000;
      const match = selectedSubForExtend.tokenQuota?.match(/([0-9,]+)/);
      if (match) {
        currentTokenNumeric = parseInt(match[1].replace(/,/g, "")) || 200000;
      }
      const newTokenTotal = currentTokenNumeric + selectedTokenAddon.tokens;
      const newTokenQuotaStr = `${newTokenTotal.toLocaleString()} / bln`;

      const cycleLabel =
        durationMonths === 12
          ? "Tahunan (Diskon 20%)"
          : durationMonths === 6
          ? "6 Bulan (Diskon 10%)"
          : durationMonths === 3
          ? "3 Bulan (Diskon 5%)"
          : "Bulanan";

      if (typeof extendSubscription === "function") {
        extendSubscription(selectedSubForExtend.id, {
          daysToAdd,
          additionalSeats,
          plan: selectedTier,
          pricePerMonth: currentPlanPrice,
          billingCycle: cycleLabel,
          newTokenQuota: newTokenQuotaStr,
          paymentMethod,
        });
      }

      setIsProcessing(false);
      const instName = selectedSubForExtend.institutionName;
      setSelectedSubForExtend(null);

      // Trigger modern toast
      setToast({
        show: true,
        message: `Paket ${instName} berhasil diperpanjang +${daysToAdd} hari (${durationMonths} bln)${additionalSeats > 0 ? `, +${additionalSeats} Kursi CS` : ""} & kuota telah aktif!`,
      });

      setTimeout(() => {
        setToast({ show: false, message: "" });
      }, 5000);
    }, 600);
  };

  // Metrics summary
  const totalMRR = subscriptions.reduce((acc, curr) => acc + (curr.pricePerMonth || 0), 0);
  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const expiringCount = subscriptions.filter((s) => s.daysLeft <= 7 || s.status === "expiring_soon").length;
  const totalSeats = subscriptions.reduce((acc, curr) => acc + (curr.csSeats || 0), 0);
  const usedSeats = subscriptions.reduce((acc, curr) => acc + (curr.csSeatsUsed || 0), 0);

  const filteredSubs = subscriptions.filter((s) => {
    if (selectedStatusFilter === "all") return true;
    if (selectedStatusFilter === "expiring_soon") return s.daysLeft <= 7 || s.status === "expiring_soon";
    return s.status === selectedStatusFilter;
  });

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Superadmin Master Operasional</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Langganan & Lisensi CS AI Platform
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Manajemen paket langganan tenant SaaS, aktivasi kursi CS, kuota token bulanan, dan perpanjangan masa aktif.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewLicenseModal(true)}
          className="btn-primary !py-2.5 !px-4 text-[13px] font-bold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>+</span>
          <span>Aktivasi Lisensi Baru</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>MRR (Monthly Revenue)</span>
            <DollarSignIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">
            Rp {(totalMRR / 1000000).toFixed(2)} Jt
          </div>
          <span className="text-[11.5px] font-bold text-emerald-600">+12% Dari Tenant Baru</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Tenant Aktif</span>
            <BuildingIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">
            {activeCount} / {subscriptions.length} Tenant
          </div>
          <span className="text-[11.5px] font-bold text-purple-600">
            {subscriptions.length > 0 ? Math.round((activeCount / subscriptions.length) * 100) : 0}% Retention Rate
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Segera Jatuh Tempo</span>
            <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[26px] font-extrabold text-amber-600 mt-2">
            {expiringCount} Tenant
          </div>
          <span className="text-[11.5px] font-bold text-amber-600">Perlu Reminder WhatsApp</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Total CS Seats Digunakan</span>
            <ZapIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">
            {usedSeats} / {totalSeats} Seats
          </div>
          <span className="text-[11.5px] font-bold text-emerald-600">
            {totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0}% Kapasitas Terisi
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#ede8e2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-[#8f95a8]">Filter Status:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("all")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedStatusFilter === "all"
                  ? "bg-[#2545ff] text-white"
                  : "bg-[#f5f4f2] text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("active")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedStatusFilter === "active"
                  ? "bg-emerald-600 text-white"
                  : "bg-[#f5f4f2] text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("expiring_soon")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedStatusFilter === "expiring_soon"
                  ? "bg-amber-600 text-white"
                  : "bg-[#f5f4f2] text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              Segera Habis (&lt;7 Hari)
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter("expired")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedStatusFilter === "expired"
                  ? "bg-rose-600 text-white"
                  : "bg-[#f5f4f2] text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              Expired
            </button>
          </div>
        </div>

        <span className="text-[12.5px] font-bold text-[#8f95a8]">
          Menampilkan {filteredSubs.length} Paket
        </span>
      </div>

      {/* Subscriptions Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tenant Instansi</th>
              <th>Paket & Biaya Bulanan</th>
              <th>Alokasi Kursi CS</th>
              <th>Model AI & Kuota Token</th>
              <th>Masa Berlaku</th>
              <th>Status & Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map((sub) => (
              <tr key={sub.id} className="hover:bg-[#fcfbf9] transition-colors">
                <td>
                  <div className="font-bold text-[#1e2640] text-[13.5px]">{sub.institutionName}</div>
                  <div className="text-[11.5px] text-[#8f95a8] font-mono">{sub.institutionId}</div>
                </td>
                <td>
                  <div className="font-extrabold text-[#2545ff] text-[13px]">{sub.plan}</div>
                  <div className="text-[12px] font-bold text-[#1e2640]">
                    Rp {(sub.pricePerMonth || 0).toLocaleString("id-ID")}/bln
                  </div>
                  <div className="text-[11px] text-[#8f95a8]">{sub.billingCycle}</div>
                </td>
                <td>
                  <div className="font-bold text-[#1e2640] text-[13px]">
                    {sub.csSeatsUsed} / {sub.csSeats} Kursi
                  </div>
                  <div className="w-24 h-1.5 bg-[#ede8e2] rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-[#2545ff] rounded-full"
                      style={{ width: `${Math.min(100, ((sub.csSeatsUsed || 0) / (sub.csSeats || 1)) * 100)}%` }}
                    />
                  </div>
                </td>
                <td>
                  <div className="text-[12.5px] font-semibold text-[#1e2640] flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3 text-purple-600" />
                    <span>{sub.aiEngine}</span>
                  </div>
                  <div className="text-[11.5px] text-[#8f95a8]">Kuota: {sub.tokenQuota}</div>
                </td>
                <td>
                  <div className="text-[12.5px] font-bold text-[#1e2640]">{sub.expiryDate}</div>
                  <div className="text-[11.5px] text-[#5a6380]">
                    {sub.status === "expired"
                      ? "Sudah Berakhir"
                      : `Sisa ${sub.daysLeft} Hari lagi`}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {sub.status === "active" && sub.daysLeft > 7 && (
                      <span className="badge badge-success text-[11px]">Aktif</span>
                    )}
                    {(sub.status === "expiring_soon" || (sub.status === "active" && sub.daysLeft <= 7)) && (
                      <span className="badge badge-warning text-[11px]">Habis {sub.daysLeft} Hari</span>
                    )}
                    {sub.status === "expired" && (
                      <span className="badge badge-danger text-[11px]">Non-Aktif</span>
                    )}

                    <button
                      type="button"
                      onClick={() => openExtendModal(sub)}
                      className="px-3 py-1.5 text-[11.5px] font-extrabold rounded-lg border border-[#2545ff] bg-blue-50 text-[#2545ff] hover:bg-[#2545ff] hover:text-white transition-all cursor-pointer shadow-xs"
                      title="Buka detail dan perpanjang paket tenant"
                    >
                      + Perpanjang
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ==================== INTERACTIVE DETAIL & EXTEND MODAL ==================== */}
      {selectedSubForExtend && (
        <div className="fixed inset-0 bg-[#0c1754]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-[760px] p-6 sm:p-7 shadow-2xl border border-[#ede8e2] my-8 animate-scale-pop">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#ede8e2]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-lavender text-[10.5px] font-extrabold uppercase tracking-wide">
                    Detail & Perpanjangan Langganan
                  </span>
                  <span className="text-[11px] font-mono text-[#8f95a8] bg-[#f5f4f2] px-2 py-0.5 rounded">
                    {selectedSubForExtend.institutionId}
                  </span>
                </div>
                <h2 className="text-[20px] font-extrabold text-[#0c1754]">
                  {selectedSubForExtend.institutionName}
                </h2>
                <p className="text-[12.5px] text-[#64748b]">
                  Sesuaikan durasi perpanjangan, kuota token AI, dan penambahan kursi CS frontliner.
                </p>
              </div>

              <button
                onClick={() => setSelectedSubForExtend(null)}
                className="w-8 h-8 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Current Active Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 p-3.5 bg-[#fcfbf9] rounded-xl border border-[#ede8e2]">
              <div>
                <span className="text-[11px] text-[#8f95a8] font-bold uppercase block">Paket Saat Ini</span>
                <span className="text-[13px] font-extrabold text-[#2545ff]">{selectedSubForExtend.plan}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#8f95a8] font-bold uppercase block">Masa Aktif</span>
                <span className="text-[13px] font-extrabold text-[#1e2640]">
                  Sisa {selectedSubForExtend.daysLeft} Hari
                </span>
                <span className="text-[10.5px] text-[#8f95a8] block">s/d {selectedSubForExtend.expiryDate}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#8f95a8] font-bold uppercase block">Alokasi Kursi CS</span>
                <span className="text-[13px] font-extrabold text-[#1e2640]">
                  {selectedSubForExtend.csSeatsUsed} / {selectedSubForExtend.csSeats} Kursi
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#8f95a8] font-bold uppercase block">Token AI Aktif</span>
                <span className="text-[13px] font-extrabold text-purple-700">{selectedSubForExtend.tokenQuota}</span>
              </div>
            </div>

            {/* Form Sections */}
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* 1. Durasi Perpanjangan */}
              <div>
                <label className="text-[13px] font-bold text-[#1e2640] block mb-2">
                  1. Pilih Durasi Perpanjangan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {durationOptions.map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => setDurationMonths(opt.months)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        durationMonths === opt.months
                          ? "border-[#2545ff] bg-blue-50/70 shadow-xs ring-1 ring-[#2545ff]"
                          : "border-[#ede8e2] bg-white hover:bg-[#fcfbf9]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[13.5px] text-[#0c1754]">{opt.label}</span>
                        <input
                          type="radio"
                          name="sub-duration"
                          checked={durationMonths === opt.months}
                          onChange={() => setDurationMonths(opt.months)}
                          className="accent-[#2545ff]"
                        />
                      </div>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        opt.discountPercent > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-[#64748b]"
                      }`}>
                        {opt.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Upgrade Paket Tier (Opsional) */}
              <div>
                <label className="text-[13px] font-bold text-[#1e2640] block mb-2">
                  2. Pilihan Paket Tier (Upgrade / Downgrade):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { name: "Starter AI", price: 499000, desc: "2 Kursi CS • 50k Token AI" },
                    { name: "Pro Growth", price: 999000, desc: "5 Kursi CS • 200k Token AI • Voice AI" },
                    { name: "Enterprise Scale", price: 2499000, desc: "15 Kursi CS • 500k Token AI • Multi Hub" },
                  ].map((tier) => (
                    <button
                      key={tier.name}
                      type="button"
                      onClick={() => setSelectedTier(tier.name)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedTier === tier.name
                          ? "border-[#2545ff] bg-blue-50/70 shadow-xs ring-1 ring-[#2545ff]"
                          : "border-[#ede8e2] bg-white hover:bg-[#fcfbf9]"
                      }`}
                    >
                      <div className="font-extrabold text-[13.5px] text-[#0c1754]">{tier.name}</div>
                      <div className="text-[12px] font-bold text-[#2545ff] my-0.5">
                        Rp {tier.price.toLocaleString("id-ID")}/bln
                      </div>
                      <div className="text-[11px] text-[#8f95a8]">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Add-on Tambahan Kursi CS */}
              <div className="p-4 bg-white rounded-xl border border-[#ede8e2]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-[13px] text-[#1e2640] flex items-center gap-1.5">
                      <UsersIcon className="w-4 h-4 text-[#2545ff]" />
                      <span>3. Tambah Kursi CS (Add-On Multi-Seat):</span>
                    </div>
                    <p className="text-[12px] text-[#8f95a8] mt-0.5">
                      Biaya per kursi tambahan: <strong>Rp 99.000 / bulan</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-[#ede8e2] rounded-xl overflow-hidden bg-[#f9f8f6]">
                      <button
                        type="button"
                        onClick={() => setAdditionalSeats(Math.max(0, additionalSeats - 1))}
                        className="w-9 h-9 flex items-center justify-center font-bold text-[#1e2640] hover:bg-[#ede8e2] border-none cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-extrabold text-[14px] text-[#0c1754]">
                        +{additionalSeats}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdditionalSeats(additionalSeats + 1)}
                        className="w-9 h-9 flex items-center justify-center font-bold text-[#1e2640] hover:bg-[#ede8e2] border-none cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-[12px] font-bold text-[#2545ff]">
                      Total: {(selectedSubForExtend.csSeats || 5) + additionalSeats} Kursi
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Top-up Kuota AI Token & Broadcast WA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* AI Token */}
                <div className="p-3.5 bg-white rounded-xl border border-[#ede8e2]">
                  <label className="font-bold text-[12.5px] text-[#1e2640] flex items-center gap-1.5 mb-2">
                    <SparklesIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Top-up Kuota AI Token:</span>
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {tokenAddonList.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-[12px] cursor-pointer ${
                          selectedAiTokenAddon === t.id
                            ? "border-purple-500 bg-purple-50/70 font-bold text-purple-900"
                            : "border-[#ede8e2] text-[#5a6380] hover:bg-[#fcfbf9]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="token-addon"
                            checked={selectedAiTokenAddon === t.id}
                            onChange={() => setSelectedAiTokenAddon(t.id)}
                            className="accent-purple-600"
                          />
                          <span>{t.label}</span>
                        </div>
                        <span>{t.price > 0 ? `+Rp ${t.price.toLocaleString("id-ID")}` : "Rp 0"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* WA Broadcast */}
                <div className="p-3.5 bg-white rounded-xl border border-[#ede8e2]">
                  <label className="font-bold text-[12.5px] text-[#1e2640] flex items-center gap-1.5 mb-2">
                    <RadioIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Top-up Kuota Broadcast WA:</span>
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {waAddonList.map((w) => (
                      <label
                        key={w.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-[12px] cursor-pointer ${
                          selectedWaBroadcastAddon === w.id
                            ? "border-emerald-500 bg-emerald-50/70 font-bold text-emerald-900"
                            : "border-[#ede8e2] text-[#5a6380] hover:bg-[#fcfbf9]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="wa-addon"
                            checked={selectedWaBroadcastAddon === w.id}
                            onChange={() => setSelectedWaBroadcastAddon(w.id)}
                            className="accent-emerald-600"
                          />
                          <span>{w.label}</span>
                        </div>
                        <span>{w.price > 0 ? `+Rp ${w.price.toLocaleString("id-ID")}` : "Rp 0"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Metode Pembayaran & Bukti Referensi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#fcfbf9] rounded-xl border border-[#ede8e2]">
                <div>
                  <label className="block text-[12px] font-bold text-[#1e2640] mb-1">
                    Metode Pembayaran Klien:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-[12.5px] rounded-xl border border-[#ede8e2] bg-white font-semibold"
                  >
                    <option value="Transfer Bank BCA">Transfer Bank BCA (Manual Verifikasi)</option>
                    <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                    <option value="QRIS Dinamis Instan">QRIS Dinamis 1-Klik</option>
                    <option value="Virtual Account Otomatis">Virtual Account Otomatis</option>
                    <option value="Kartu Kredit / Debit">Kartu Kredit / Debit Online</option>
                    <option value="Invoice Tempo / Termin">Invoice Tempo Korporat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#1e2640] mb-1">
                    No. Bukti / Referensi Transaksi:
                  </label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="Contoh: TRX-2026-BCA8810"
                    className="w-full px-3 py-2 text-[12.5px] rounded-xl border border-[#ede8e2] bg-white font-mono"
                  />
                </div>
              </div>

              {/* 6. Live Invoice Breakdown Summary */}
              <div className="p-4 bg-gradient-to-br from-[#0c1754] to-[#1a2d8a] rounded-2xl text-white shadow-md">
                <span className="text-[11px] uppercase tracking-wider text-white/70 font-bold block mb-2">
                  Rincian Kalkulator Tagihan (Invoice Breakdown)
                </span>

                <div className="flex flex-col gap-1.5 text-[12.5px] text-white/90">
                  <div className="flex justify-between">
                    <span>
                      {selectedTier} ({durationMonths} Bulan × Rp {currentPlanPrice.toLocaleString("id-ID")}):
                    </span>
                    <span className="font-bold">Rp {grossBasePrice.toLocaleString("id-ID")}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Diskon Durasi ({currentDurationObj.discountPercent}%):</span>
                      <span className="font-bold">- Rp {discountAmount.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  {seatsCost > 0 && (
                    <div className="flex justify-between text-blue-200">
                      <span>Tambahan {additionalSeats} Kursi CS ({durationMonths} Bulan):</span>
                      <span className="font-bold">+ Rp {seatsCost.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  {tokenCost > 0 && (
                    <div className="flex justify-between text-purple-200">
                      <span>Top-up AI Token ({selectedTokenAddon.label}):</span>
                      <span className="font-bold">+ Rp {tokenCost.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  {waCost > 0 && (
                    <div className="flex justify-between text-emerald-200">
                      <span>Top-up Kuota Broadcast ({selectedWaAddon.label}):</span>
                      <span className="font-bold">+ Rp {waCost.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  <div className="pt-2.5 mt-2 border-t border-white/20 flex justify-between items-center">
                    <span className="text-[14px] font-extrabold uppercase">Total Tagihan Final:</span>
                    <span className="text-[20px] font-black text-amber-300">
                      Rp {grandTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#ede8e2] mt-4">
              <button
                type="button"
                onClick={() => setSelectedSubForExtend(null)}
                className="btn-outline !py-2.5 !px-5 text-[13px]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmExtension}
                disabled={isProcessing}
                className="btn-primary !py-2.5 !px-6 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <CheckCircleIcon className="w-4 h-4 text-emerald-300" />
                <span>
                  {isProcessing
                    ? "Memperpanjang & Mengaktifkan..."
                    : "Konfirmasi & Aktifkan Paket Langganan"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== NEW LICENSE MODAL ==================== */}
      {showNewLicenseModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#0c1754]">Aktivasi Lisensi Baru</h3>
              <button
                onClick={() => setShowNewLicenseModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-[#64748b] mb-4">
              Lisensi langganan dibuat otomatis saat Anda mendaftarkan institusi baru di menu Master Data Instansi.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewLicenseModal(false)}
                className="btn-primary !py-2 !px-4 text-[13px]"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
