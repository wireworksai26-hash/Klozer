"use client";
import { useState } from "react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">Laporan & Analytics</h1>
          <p className="text-[14px] text-[#64748b]">Periode: 1 - 29 Agustus 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline !py-2 !px-4 text-[13px] font-bold flex items-center gap-2">
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
              { label: "Total Omzet", value: "Rp 487.5 Jt", sub: "+23% MoM", up: true },
              { label: "Total HPP", value: "Rp 195 Jt", sub: "40% omzet", up: false },
              { label: "Laba Kotor", value: "Rp 292.5 Jt", sub: "60% margin", up: true },
              { label: "Total Transaksi", value: "1.248", sub: "Avg 43/hari", up: true },
              { label: "AOV (Rata-rata)", value: "Rp 390.625", sub: "+8% bulan lalu", up: true },
            ].map((m) => (
              <div key={m.label} className="bg-white p-4 rounded-2xl border border-[#f0e9e1] shadow-sm flex flex-col justify-between">
                <span className="text-[12px] font-medium text-[#64748b]">{m.label}</span>
                <span className="text-[20px] sm:text-[22px] font-extrabold text-[#0c1754] tracking-tight my-1">{m.value}</span>
                <span className={`text-[11px] font-bold ${m.up ? "text-emerald-600" : "text-[#64748b]"}`}>{m.sub}</span>
              </div>
            ))}
          </div>

          {/* Daily Revenue Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f0e9e1]">
              <h3 className="text-[16px] font-bold text-[#0c1754]">Tren Omzet Harian (Agustus 2026)</h3>
              <span className="text-[12px] font-bold text-[#2545ff] bg-[#eaebf8] px-3 py-1 rounded-full">
                Rata-rata: Rp 16.8 Jt / hari
              </span>
            </div>
            
            <div className="flex items-end gap-1.5 sm:gap-2 h-[160px] pt-4 px-1">
              {Array.from({ length: 29 }, (_, i) => {
                const val = 12 + Math.sin(i * 0.6) * 6 + (i % 5 === 0 ? 5 : 0);
                const isHighlight = i === 28;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full bg-[#eaebf8] rounded-t h-[110px] flex items-end overflow-hidden">
                      <div
                        style={{ height: `${(val / 24) * 100}%` }}
                        className={`w-full rounded-t transition-all ${
                          isHighlight ? "bg-[#2545ff]" : "bg-[#2545ff]/50 group-hover:bg-[#2545ff]"
                        }`}
                      />
                    </div>
                    {(i % 7 === 0 || i === 28) && (
                      <span className="text-[9px] font-bold text-[#64748b]">{i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
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
                  { method: "QRIS Otomatis", pct: 45, amount: "Rp 219.4 Jt", color: "bg-[#2545ff]" },
                  { method: "Transfer Bank", pct: 30, amount: "Rp 146.3 Jt", color: "bg-[#0c1754]" },
                  { method: "COD (Bayar di Tempat)", pct: 15, amount: "Rp 73.1 Jt", color: "bg-amber-500" },
                  { method: "Virtual Account", pct: 10, amount: "Rp 48.8 Jt", color: "bg-purple-500" },
                ].map((m) => (
                  <div key={m.method}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-bold text-[#0c1754]">{m.method}</span>
                      <span className="font-semibold text-[#64748b]">{m.amount} ({m.pct}%)</span>
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
                Produk Terlaris Bulan Ini
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { name: "Kaos Hitam Polos Premium", sold: 312, revenue: "Rp 46.8 Jt" },
                  { name: "Hijab Segi Empat Voal", sold: 287, revenue: "Rp 21.5 Jt" },
                  { name: "Skincare Set Whitening", sold: 156, revenue: "Rp 89.7 Jt" },
                  { name: "Sepatu Running Sport", sold: 98, revenue: "Rp 44.1 Jt" },
                  { name: "Dress Batik Modern", sold: 84, revenue: "Rp 31.5 Jt" },
                ].map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f9f8f6]">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-[#eaebf8] text-[#2545ff] flex items-center justify-center font-bold text-[11px]">
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-[13px] font-bold text-[#0c1754]">{p.name}</div>
                        <div className="text-[11px] text-[#969696]">{p.sold} pcs terjual</div>
                      </div>
                    </div>
                    <span className="font-extrabold text-[13px] text-[#0c1754]">{p.revenue}</span>
                  </div>
                ))}
              </div>
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
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Chat Masuk</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Closing Lunas</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Closing Rate</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Waktu Respon (FRT)</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Total Omzet</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Estimasi Komisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9e1] text-[13px]">
                {[
                  { name: "Sarah A.", chats: 856, closings: 612, rate: "71.5%", frt: "28 dtk", revenue: "Rp 156.8 Jt", commission: "Rp 4.7 Jt" },
                  { name: "Dimas R.", chats: 743, closings: 565, rate: "76.0%", frt: "35 dtk", revenue: "Rp 142.3 Jt", commission: "Rp 4.3 Jt" },
                  { name: "Putri N.", chats: 691, closings: 414, rate: "59.9%", frt: "42 dtk", revenue: "Rp 108.5 Jt", commission: "Rp 3.3 Jt" },
                ].map((cs) => (
                  <tr key={cs.name} className="hover:bg-[#f9f8f6]">
                    <td className="py-4 px-5 font-bold text-[#0c1754] whitespace-nowrap">{cs.name}</td>
                    <td className="py-4 px-5 whitespace-nowrap">{cs.chats} chat</td>
                    <td className="py-4 px-5 font-bold text-emerald-600 whitespace-nowrap">{cs.closings}</td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                        {cs.rate}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-[#64748b] whitespace-nowrap">{cs.frt}</td>
                    <td className="py-4 px-5 font-extrabold text-[#0c1754] whitespace-nowrap">{cs.revenue}</td>
                    <td className="py-4 px-5 font-bold text-[#2545ff] whitespace-nowrap">{cs.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ads Tab */}
      {activeTab === "ads" && (
        <div className="bg-white rounded-2xl border border-[#f0e9e1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Nama Campaign Iklan</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Biaya Iklan</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Chat Masuk</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Closing</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Omzet Riil</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">ROAS</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Status CAPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9e1] text-[13px]">
                {[
                  { campaign: "Promo Lebaran 2026 (Broad)", spend: "Rp 8.5 Jt", chats: 312, closings: 187, revenue: "Rp 168.3 Jt", roas: "19.8x", capi: "Delivered" },
                  { campaign: "Flash Sale Weekend", spend: "Rp 5.2 Jt", chats: 198, closings: 124, revenue: "Rp 93.0 Jt", roas: "17.9x", capi: "Delivered" },
                  { campaign: "New Collection Launch", spend: "Rp 6.8 Jt", chats: 215, closings: 98, revenue: "Rp 117.6 Jt", roas: "17.3x", capi: "Delivered" },
                  { campaign: "Retargeting Abandoned Cart", spend: "Rp 4.9 Jt", chats: 122, closings: 89, revenue: "Rp 108.6 Jt", roas: "22.2x", capi: "Delivered" },
                ].map((c) => (
                  <tr key={c.campaign} className="hover:bg-[#f9f8f6]">
                    <td className="py-4 px-5 font-bold text-[#0c1754] whitespace-nowrap">{c.campaign}</td>
                    <td className="py-4 px-5 text-[#64748b] whitespace-nowrap">{c.spend}</td>
                    <td className="py-4 px-5 whitespace-nowrap">{c.chats} lead</td>
                    <td className="py-4 px-5 font-bold text-emerald-600 whitespace-nowrap">{c.closings}</td>
                    <td className="py-4 px-5 font-bold text-[#0c1754] whitespace-nowrap">{c.revenue}</td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700">
                        {c.roas}
                      </span>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="text-emerald-600 font-bold text-[12px]">✓ {c.capi}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
