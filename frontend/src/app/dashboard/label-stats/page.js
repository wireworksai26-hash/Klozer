"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  BarChartIcon,
  CrownIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  TagIcon,
  DollarSignIcon,
} from "@/components/icons";

export default function SupervisorLabelStatsPage() {
  const [timeRange, setTimeRange] = useState("bulan-ini");

  const labelData = [
    {
      label: "Pelanggan VIP",
      color: "bg-amber-500",
      totalRevenue: 68500000,
      sharePercent: "42.8%",
      orderCount: 84,
      avgBasket: "Rp 815,000",
    },
    {
      label: "Repeat Buyer",
      color: "bg-emerald-500",
      totalRevenue: 48200000,
      sharePercent: "30.1%",
      orderCount: 112,
      avgBasket: "Rp 430,000",
    },
    {
      label: "B2B / Grosir Seragam",
      color: "bg-purple-600",
      totalRevenue: 28900000,
      sharePercent: "18.0%",
      orderCount: 8,
      avgBasket: "Rp 3,612,500",
    },
    {
      label: "New Lead (First Buyer)",
      color: "bg-blue-500",
      totalRevenue: 14500000,
      sharePercent: "9.1%",
      orderCount: 45,
      avgBasket: "Rp 322,000",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <BarChartIcon className="w-3.5 h-3.5" />
              <span>Analitik Segmentasi Penjualan</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Statistik Pendapatan per Segmen Label
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Distribusi kontribusi omzet penjualan atau donasi berdasarkan tag segmen pelanggan (VIP, Repeat, B2B, New Buyer).
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-[#ede8e2] rounded-xl p-1 shadow-xs self-start sm:self-auto">
          {["7h", "bulan-ini", "kuartal-ini"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer transition-all ${
                timeRange === r
                  ? "bg-[#2545ff] text-white"
                  : "bg-transparent text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              {r === "7h" ? "7 Hari" : r === "bulan-ini" ? "Bulan Ini" : "Kuartal Ini"}
            </button>
          ))}
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {labelData.map((d) => (
          <div key={d.label} className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="badge badge-lavender text-[11px]">{d.label}</span>
                <span className="font-extrabold text-[#2545ff] text-[13px]">{d.sharePercent}</span>
              </div>
              <div className="text-[22px] font-extrabold text-[#1e2640]">
                Rp {(d.totalRevenue / 1000000).toFixed(1)} Juta
              </div>
            </div>

            <div className="pt-3 border-t border-[#ede8e2] flex items-center justify-between text-[12px]">
              <span className="text-[#8f95a8]">{d.orderCount} Transaksi</span>
              <span className="font-semibold text-[#5a6380]">Rata-rata: {d.avgBasket}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Rincian Kontribusi Finansial Tiap Segmen</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama Segmen Label</th>
                <th>Porsi Pendapatan</th>
                <th>Total Nominal Omzet</th>
                <th>Jumlah Pesanan</th>
                <th>Rata-Rata Nilai Belanja (AOV)</th>
              </tr>
            </thead>
            <tbody>
              {labelData.map((d) => (
                <tr key={d.label} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <span className="font-bold text-[#1e2640] text-[13.5px]">{d.label}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[#ede8e2] rounded-full overflow-hidden">
                        <div className={`h-full ${d.color}`} style={{ width: d.sharePercent }} />
                      </div>
                      <span className="font-bold text-[12.5px] text-[#1e2640]">{d.sharePercent}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-extrabold text-[#1e2640] text-[13.5px]">
                      Rp {d.totalRevenue.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td>
                    <span className="text-[13px] font-semibold text-[#5a6380]">{d.orderCount} Order</span>
                  </td>
                  <td>
                    <span className="font-bold text-purple-700 text-[13px]">{d.avgBasket}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
