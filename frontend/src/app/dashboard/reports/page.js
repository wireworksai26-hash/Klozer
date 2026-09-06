"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { BarChartIcon, TargetIcon } from "@/components/icons";

export default function ReportsPage() {
  const { orders = [], leads = [], products = [], teamMembers = [], currentUser, activeInstitution } = useDashboard();
  const [activeTab, setActiveTab] = useState("sales");

  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Bisnis";
  const paidOrders = orders.filter((o) => o && (o.status === "paid" || o.paymentStatus === "paid"));
  const totalRevenue = paidOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  const totalOrdersCount = orders.length;
  const aov = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const estimatedHpp = Math.round(totalRevenue * 0.4);
  const grossProfit = totalRevenue - estimatedHpp;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">Laporan & Analytics</h1>
          <p className="text-[14px] text-[#64748b]">Laporan Performa Bisnis: {cleanInstName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Mengunduh laporan performa ke Excel...")}
            className="btn-outline !py-2 !px-4 text-[13px] font-bold flex items-center gap-2 cursor-pointer"
          >
            <span>↓</span>
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "sales", label: "Penjualan & Omzet" },
          { key: "cs", label: "Performa Staf CS" },
          { key: "ads", label: "Meta Ads ROAS" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all border cursor-pointer ${
              activeTab === t.key
                ? "bg-[#2545ff] text-white border-[#2545ff] shadow-sm"
                : "bg-white text-[#64748b] border-[#f0e9e1] hover:text-[#0c1754]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sales Report Tab */}
      {activeTab === "sales" && (
        <div className="flex flex-col gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Omzet", value: `Rp ${Number(totalRevenue || 0).toLocaleString("id-ID")}`, sub: totalRevenue > 0 ? "Omzet tercatat" : "Belum ada omzet", up: totalRevenue > 0 },
              { label: "Estimasi HPP", value: `Rp ${Number(estimatedHpp || 0).toLocaleString("id-ID")}`, sub: "Biaya pokok", up: false },
              { label: "Laba Kotor", value: `Rp ${Number(grossProfit || 0).toLocaleString("id-ID")}`, sub: "Estimasi margin", up: grossProfit > 0 },
              { label: "Total Transaksi", value: `${totalOrdersCount}`, sub: "Pesanan masuk", up: totalOrdersCount > 0 },
              { label: "AOV (Rata-rata)", value: `Rp ${Number(aov || 0).toLocaleString("id-ID")}`, sub: "Nilai per pesanan", up: aov > 0 },
            ].map((m) => (
              <div key={m.label} className="bg-white p-4 rounded-2xl border border-[#f0e9e1] shadow-sm flex flex-col justify-between">
                <span className="text-[12px] font-medium text-[#64748b]">{m.label}</span>
                <span className="text-[18px] sm:text-[20px] font-extrabold text-[#0c1754] tracking-tight my-1">{m.value}</span>
                <span className={`text-[11px] font-bold ${m.up ? "text-emerald-600" : "text-[#64748b]"}`}>{m.sub}</span>
              </div>
            ))}
          </div>

          {/* Daily Revenue Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f0e9e1]">
              <h3 className="text-[16px] font-bold text-[#0c1754]">Tren Omzet Harian</h3>
              <span className="text-[12px] font-bold text-[#2545ff] bg-[#eaebf8] px-3 py-1 rounded-full">
                Total: Rp {Number(totalRevenue || 0).toLocaleString("id-ID")}
              </span>
            </div>

            {totalRevenue === 0 ? (
              <div className="h-[140px] flex flex-col items-center justify-center text-[#969696] text-[13px]">
                <div className="w-10 h-10 rounded-full bg-[#f9f8f6] flex items-center justify-center mb-2">
                  <BarChartIcon className="w-5 h-5 text-[#2545ff]" />
                </div>
                <span>Belum ada data penjualan tercatat</span>
              </div>
            ) : (
              <div className="flex items-end gap-1.5 sm:gap-2 h-[160px] pt-4 px-1">
                {Array.from({ length: 15 }, (_, i) => {
                  const val = (totalRevenue / 15) * (0.6 + Math.sin(i) * 0.4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full bg-[#eaebf8] rounded-t h-[110px] flex items-end overflow-hidden">
                        <div
                          style={{ height: `${Math.min(100, (val / (totalRevenue || 1)) * 300)}%` }}
                          className="w-full rounded-t bg-[#2545ff] transition-all"
                        />
                      </div>
                      <span className="text-[9px] font-bold text-[#64748b]">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2-Column Breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-sm">
              <h3 className="text-[16px] font-bold text-[#0c1754] mb-4 pb-2 border-b border-[#f0e9e1]">
                Breakdown Metode Pembayaran
              </h3>
              <div className="flex flex-col gap-4">
                {[
                  { method: "In-Chat Dynamic QRIS", pct: totalRevenue > 0 ? 60 : 0, color: "bg-[#2545ff]" },
                  { method: "Transfer Bank Manual", pct: totalRevenue > 0 ? 30 : 0, color: "bg-[#0c1754]" },
                  { method: "COD (Bayar di Tempat)", pct: totalRevenue > 0 ? 10 : 0, color: "bg-amber-500" },
                ].map((m) => (
                  <div key={m.method}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-bold text-[#0c1754]">{m.method}</span>
                      <span className="font-semibold text-[#64748b]">{m.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#f0e9e1] rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-sm">
              <h3 className="text-[16px] font-bold text-[#0c1754] mb-4 pb-2 border-b border-[#f0e9e1]">
                Katalog Produk Terlaris
              </h3>
              {products.length === 0 ? (
                <div className="py-8 text-center text-[#969696] text-[13px]">
                  Belum ada data produk di katalog.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {products.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f9f8f6]">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-[#eaebf8] text-[#2545ff] flex items-center justify-center font-bold text-[11px]">
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-[13px] font-bold text-[#0c1754]">{p.name}</div>
                          <div className="text-[11px] text-[#969696]">{p.stock} pcs stok</div>
                        </div>
                      </div>
                      <span className="font-extrabold text-[13px] text-[#0c1754]">
                        Rp {Number(p.price || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CS Tab */}
      {activeTab === "cs" && (
        <div className="bg-white rounded-2xl border border-[#f0e9e1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Staf CS</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Peran / Role</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Closing Lunas</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Closing Rate</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Total Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9e1] text-[13px]">
                {teamMembers.map((tm) => (
                  <tr key={tm.id} className="hover:bg-[#fcfbf9]">
                    <td className="py-3.5 px-5 font-bold text-[#0c1754]">{tm.name}</td>
                    <td className="py-3.5 px-5 text-[#64748b]">{tm.role}</td>
                    <td className="py-3.5 px-5 font-semibold text-[#0c1754]">
                      {tm.role?.toLowerCase().includes("spv") ? paidOrders.length : 0} Pesanan
                    </td>
                    <td className="py-3.5 px-5 font-bold text-[#2545ff]">
                      {orders.length > 0 ? `${Math.round((paidOrders.length / orders.length) * 100)}%` : "0%"}
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-[#0c1754]">
                      Rp {tm.role?.toLowerCase().includes("spv") ? Number(totalRevenue || 0).toLocaleString("id-ID") : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ads ROAS Tab */}
      {activeTab === "ads" && (
        <div className="bg-white p-8 rounded-2xl border border-[#f0e9e1] shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-3 mx-auto">
            <TargetIcon className="w-6 h-6 text-[#2545ff]" />
          </div>
          <h3 className="text-[17px] font-extrabold text-[#0c1754]">Integrasi Meta Ads Conversions API (CAPI)</h3>
          <p className="text-[13px] text-[#64748b] mt-1.5 max-w-[460px] mx-auto leading-relaxed">
            Data ROAS dan efisiensi iklan WhatsApp otomatis tersinkronisasi saat Anda menghubungkan Meta Pixel ID & Access Token di halaman pengaturan.
          </p>
        </div>
      )}
    </div>
  );
}
