"use client";
import { useState } from "react";
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
} from "@/components/icons";

export default function SuperadminSubscriptionsPage() {
  const { institutions } = useDashboard();
  const [selectedPlan, setSelectedPlan] = useState("all");

  const [subscriptions, setSubscriptions] = useState([
    {
      id: "SUB-101",
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      plan: "Enterprise Scale",
      pricePerMonth: 2499000,
      csSeats: 15,
      csSeatsUsed: 8,
      tokenQuota: "500,000 / bln",
      aiEngine: "NVIDIA NIM (Llama 3.3 70B)",
      startDate: "12 Jan 2026",
      expiryDate: "12 Jan 2027",
      daysLeft: 136,
      status: "active",
      billingCycle: "Tahunan (Diskon 20%)",
    },
    {
      id: "SUB-102",
      institutionId: "INST-002",
      institutionName: "Lumiere Skincare Official",
      plan: "Pro Growth",
      pricePerMonth: 999000,
      csSeats: 5,
      csSeatsUsed: 4,
      tokenQuota: "200,000 / bln",
      aiEngine: "NVIDIA NIM (Llama 3.3 70B)",
      startDate: "01 Feb 2026",
      expiryDate: "01 Sep 2026",
      daysLeft: 3,
      status: "expiring_soon",
      billingCycle: "Bulanan",
    },
    {
      id: "SUB-103",
      institutionId: "INST-003",
      institutionName: "Kopi Kenangan Senja",
      plan: "Starter AI",
      pricePerMonth: 499000,
      csSeats: 2,
      csSeatsUsed: 2,
      tokenQuota: "50,000 / bln",
      aiEngine: "DeepSeek R1 / OpenAI",
      startDate: "15 Mar 2026",
      expiryDate: "15 Apr 2026",
      daysLeft: 0,
      status: "expired",
      billingCycle: "Bulanan",
    },
    {
      id: "SUB-104",
      institutionId: "INST-004",
      institutionName: "Yayasan Peduli Ummat",
      plan: "NGO Social Plan",
      pricePerMonth: 299000,
      csSeats: 10,
      csSeatsUsed: 5,
      tokenQuota: "300,000 / bln",
      aiEngine: "NVIDIA NIM Llama 3.3",
      startDate: "01 Jan 2026",
      expiryDate: "01 Jan 2027",
      daysLeft: 125,
      status: "active",
      billingCycle: "Tahunan",
    },
  ]);

  const handleExtend = (id) => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            status: "active",
            daysLeft: s.daysLeft + 30,
            expiryDate: "30 Hari Kedepan",
          };
        }
        return s;
      })
    );
    alert("Masa aktif langganan berhasil diperpanjang +30 hari.");
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (selectedPlan === "all") return true;
    return s.status === selectedPlan;
  });

  return (
    <div className="flex flex-col gap-6">
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
            Manajemen paket langganan tenant SaaS, aktivasi kursi CS, kuota token bulanan, dan masa jatuh tempo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Membuka dialog Tambah Lisensi Baru...")}
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
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">Rp 4.29 Jt</div>
          <span className="text-[11.5px] font-bold text-emerald-600">+12% Dari Tenant Baru</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Tenant Aktif</span>
            <BuildingIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">3 / 4 Tenant</div>
          <span className="text-[11.5px] font-bold text-purple-600">75% Retention Rate</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Segera Jatuh Tempo</span>
            <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[26px] font-extrabold text-amber-600 mt-2">1 Tenant</div>
          <span className="text-[11.5px] font-bold text-amber-600">Perlu Reminder WhatsApp</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Total CS Seats Digunakan</span>
            <ZapIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">19 / 32 Seats</div>
          <span className="text-[11.5px] font-bold text-emerald-600">59% Kapasitas Terisi</span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#ede8e2] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-[#8f95a8]">Filter Status:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedPlan("all")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedPlan === "all"
                  ? "bg-[#2545ff] text-white"
                  : "bg-[#f5f4f2] text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("active")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedPlan === "active"
                  ? "bg-emerald-600 text-white"
                  : "bg-[#f5f4f2] text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("expiring_soon")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedPlan === "expiring_soon"
                  ? "bg-amber-600 text-white"
                  : "bg-[#f5f4f2] text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              Segera Habis (&lt;7 Hari)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("expired")}
              className={`px-3 py-1 rounded-xl text-[12px] font-bold border-none cursor-pointer transition-all ${
                selectedPlan === "expired"
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
                    Rp {sub.pricePerMonth.toLocaleString("id-ID")}/bln
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
                      style={{ width: `${(sub.csSeatsUsed / sub.csSeats) * 100}%` }}
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
                    {sub.status === "active" && (
                      <span className="badge badge-success text-[11px]">Aktif</span>
                    )}
                    {sub.status === "expiring_soon" && (
                      <span className="badge badge-warning text-[11px]">Habis 3 Hari</span>
                    )}
                    {sub.status === "expired" && (
                      <span className="badge badge-danger text-[11px]">Non-Aktif</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleExtend(sub.id)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#2545ff] bg-blue-50 text-[#2545ff] hover:bg-blue-100 cursor-pointer"
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
    </div>
  );
}
