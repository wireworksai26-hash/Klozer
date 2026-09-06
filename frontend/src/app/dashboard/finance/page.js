"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  DollarSignIcon,
  CrownIcon,
  CheckCircleIcon,
  DownloadIcon,
  BuildingIcon,
  QrIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export default function SupervisorFinancePage() {
  const { orders = [], currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const [activeTab, setActiveTab] = useState("all");

  const paidOrders = orders.filter((o) => o && (o.status === "paid" || o.paymentStatus === "paid"));
  const totalGross = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalFee = Math.round(totalGross * 0.007); // MDR ~0.7%
  const netRevenue = totalGross - totalFee;

  const transactions = paidOrders.map((o) => {
    const gross = Number(o.total) || 0;
    const fee = Math.round(gross * 0.007);
    const net = gross - fee;
    return {
      id: `FIN-${String(o.id).padStart(3, "0")}`,
      orderId: `ORD-${o.id}`,
      customer: o.customer || "Pelanggan",
      method: o.paymentMethod || "In-Chat Dynamic QRIS",
      gross,
      fee,
      net,
      date: o.date || "Hari ini",
      status: "settled",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <DollarSignIcon className="w-3.5 h-3.5" />
              <span>Keuangan & Rekonsiliasi Kas</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Riwayat Finansial & Arus Kas Masuk
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Rekapitulasi seluruh uang masuk dari QRIS, Virtual Account, transfer manual terverifikasi, dan pencairan dana toko: {cleanInstName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Mengunduh Rekap Finansial Excel...")}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Export Laporan Kas</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Pemasukan Masuk</div>
          <div className="text-[28px] font-extrabold text-emerald-700">
            Rp {totalGross.toLocaleString("id-ID")}
          </div>
          <span className={`text-[11.5px] font-bold ${totalGross > 0 ? "text-emerald-600" : "text-[#8f95a8]"}`}>
            {totalGross > 0 ? "Penerimaan terverifikasi" : "Belum ada transaksi"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Saldo Siap Dicairkan (Payout)</div>
          <div className="text-[28px] font-extrabold text-[#2545ff]">
            Rp {netRevenue.toLocaleString("id-ID")}
          </div>
          <span className="text-[11.5px] font-bold text-[#2545ff]">Rekening Bisnis Terhubung</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Otomasi Rekonsiliasi AI</div>
          <div className="text-[28px] font-extrabold text-purple-700">100%</div>
          <span className="text-[11.5px] font-bold text-purple-600">Pengecekan Mutasi Real-Time</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Riwayat Mutasi Transaksi Masuk</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">ID Transaksi & Order</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4">Nominal Kotor (Gross)</th>
                <th className="py-3 px-4">Biaya Gateway</th>
                <th className="py-3 px-4">Penerimaan Bersih (Net)</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-2">
                        <DollarSignIcon className="w-5 h-5 text-[#2545ff]" />
                      </div>
                      <div className="font-extrabold text-[#0c1754] text-[14px]">Belum Ada Mutasi Transaksi</div>
                      <p className="text-[12px] text-[#64748b] mt-1">
                        Pembayaran pesanan atau QRIS yang berhasil akan otomatis terekonsiliasi dan tercatat di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e2640] text-[13.5px]">{t.id}</div>
                      <div className="text-[11px] text-[#8f95a8] font-mono">{t.orderId} • {t.date}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#1e2640] text-[13px]">{t.customer}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[12.5px] font-semibold text-[#5a6380]">{t.method}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-[#1e2640] text-[13.5px]">
                        Rp {t.gross.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[12px] text-purple-700 font-bold">
                        {t.fee > 0 ? `Rp ${t.fee.toLocaleString("id-ID")}` : "Rp 0 (Gratis)"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-emerald-700 text-[13.5px]">
                        Rp {t.net.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircleIcon className="w-3 h-3" />
                        <span>Settled</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
