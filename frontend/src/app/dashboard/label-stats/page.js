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
  const { currentUser, activeInstitution, orders = [] } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [timeRange, setTimeRange] = useState("bulan-ini");

  const paidOrders = orders.filter((o) => o && (o.status === "paid" || o.paymentStatus === "paid"));
  const totalRev = paidOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  const labelData = isDefaultDemo
    ? [
        {
          label: "Pelanggan VIP",
          color: "bg-warning-500",
          totalRevenue: 68500000,
          sharePercent: "42.8%",
          orderCount: 84,
          avgBasket: "Rp 815,000",
        },
        {
          label: "Repeat Buyer",
          color: "bg-success-500",
          totalRevenue: 48200000,
          sharePercent: "30.1%",
          orderCount: 112,
          avgBasket: "Rp 430,000",
        },
        {
          label: "B2B / Grosir Seragam",
          color: "bg-accent-600",
          totalRevenue: 28900000,
          sharePercent: "18.0%",
          orderCount: 8,
          avgBasket: "Rp 3,612,500",
        },
        {
          label: "New Lead (First Buyer)",
          color: "bg-brand",
          totalRevenue: 14500000,
          sharePercent: "9.1%",
          orderCount: 45,
          avgBasket: "Rp 322,000",
        },
      ]
    : [
        {
          label: "Pelanggan VIP",
          color: "bg-warning-500",
          totalRevenue: 0,
          sharePercent: "0%",
          orderCount: 0,
          avgBasket: "Rp 0",
        },
        {
          label: "Repeat Buyer",
          color: "bg-success-500",
          totalRevenue: 0,
          sharePercent: "0%",
          orderCount: 0,
          avgBasket: "Rp 0",
        },
        {
          label: "B2B / Grosir",
          color: "bg-accent-600",
          totalRevenue: 0,
          sharePercent: "0%",
          orderCount: 0,
          avgBasket: "Rp 0",
        },
        {
          label: "New Lead (First Buyer)",
          color: "bg-brand",
          totalRevenue: totalRev,
          sharePercent: totalRev > 0 ? "100%" : "0%",
          orderCount: paidOrders.length,
          avgBasket: paidOrders.length > 0 ? `Rp ${Math.round(totalRev / paidOrders.length).toLocaleString("id-ID")}` : "Rp 0",
        },
      ];

  const overallRev = labelData.reduce((acc, d) => acc + (Number(d.totalRevenue) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-micro font-bold uppercase tracking-wider bg-accent-100 text-accent-800 px-2.5 py-0.5 rounded-full border border-accent-200 flex items-center gap-1.5">
              <BarChartIcon className="w-3.5 h-3.5" />
              <span>Analitik Segmentasi Penjualan</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Statistik Pendapatan per Segmen Label
          </h1>
          <p className="text-label text-fg-muted">
            Distribusi kontribusi omzet penjualan atau donasi berdasarkan tag segmen pelanggan (VIP, Repeat, B2B, New Buyer).
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-line rounded-xl p-1 shadow-xs self-start sm:self-auto">
          {["minggu-ini", "bulan-ini", "tahun-ini"].map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeRange(tab)}
              className={`px-3 py-1.5 rounded-lg text-caption font-bold border-none cursor-pointer capitalize transition-all ${
                timeRange === tab ? "bg-brand text-white" : "bg-transparent text-fg-subtle hover:text-fg"
              }`}
            >
              {tab.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bars Overview */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-body font-bold text-fg">Pangsa Omzet per Segmen Label</h2>
          <span className="text-label font-bold text-brand">
            Total Omzet: Rp {overallRev.toLocaleString("id-ID")}
          </span>
        </div>

        {/* Stacked Bar */}
        <div className="h-4 w-full bg-sunken rounded-full overflow-hidden flex gap-0.5 mb-6">
          {overallRev === 0 ? (
            <div className="w-full h-full bg-line" />
          ) : (
            labelData.map((d) => (
              <div
                key={d.label}
                className={`h-full ${d.color}`}
                style={{ width: d.sharePercent }}
                title={`${d.label}: ${d.sharePercent}`}
              />
            ))
          )}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-line">
          {labelData.map((d) => (
            <div key={d.label} className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                <span className="text-caption font-bold text-fg">{d.label}</span>
              </div>
              <div className="text-title font-bold text-fg">
                Rp {d.totalRevenue > 0 ? (d.totalRevenue / 1000000).toFixed(1) + " Jt" : "0"}
              </div>
              <span className="text-micro font-semibold text-fg-subtle">{d.sharePercent} Total Omzet</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs">
        <h2 className="text-body font-bold text-fg mb-4">Rincian Performa per Tag Label</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-label">
            <thead>
              <tr className="bg-canvas border-b border-line text-caption font-bold uppercase text-fg-muted">
                <th className="py-3 px-4">Nama Segmen Tag</th>
                <th className="py-3 px-4">Total Omzet Tercipta</th>
                <th className="py-3 px-4">Persentase Kontribusi</th>
                <th className="py-3 px-4">Jumlah Transaksi</th>
                <th className="py-3 px-4">Rata-Rata Keranjang (AOV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {labelData.map((d) => (
                <tr key={d.label} className="hover:bg-soft transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                      <span className="font-bold text-fg">{d.label}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-fg">
                      Rp {Number(d.totalRevenue || 0).toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-brand">{d.sharePercent}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-fg">{d.orderCount} Transaksi</span>
                  </td>
                  <td className="py-3.5 px-4 text-fg-muted font-semibold">{d.avgBasket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
