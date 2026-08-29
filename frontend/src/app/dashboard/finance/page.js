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
  const [activeTab, setActiveTab] = useState("all");

  const transactions = [
    {
      id: "FIN-701",
      orderId: "ORD-8801",
      customer: "Fauzan Hadi",
      method: "QRIS Dinamis (Xendit)",
      gross: 1300000,
      fee: 9100,
      net: 1290900,
      date: "29 Agu 2026, 17:42",
      status: "settled",
    },
    {
      id: "FIN-702",
      orderId: "ORD-8802",
      customer: "Clarissa Putri",
      method: "BCA Virtual Account",
      gross: 450000,
      fee: 4000,
      net: 446000,
      date: "29 Agu 2026, 16:30",
      status: "settled",
    },
    {
      id: "FIN-703",
      orderId: "ORD-8803",
      customer: "Dimas Anggara",
      method: "Transfer Bank BCA (Manual)",
      gross: 185000,
      fee: 0,
      net: 185000,
      date: "29 Agu 2026, 14:05",
      status: "verified_manual",
    },
  ];

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
            Rekapitulasi seluruh uang masuk dari QRIS, Virtual Account, transfer manual terverifikasi, dan pencairan dana toko.
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
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Pemasukan Bulan Ini</div>
          <div className="text-[28px] font-extrabold text-emerald-700">Rp 160.1 Jt</div>
          <span className="text-[11.5px] font-bold text-emerald-600">+18.4% vs Bulan Lalu</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Saldo Siap Dicairkan (Payout)</div>
          <div className="text-[28px] font-extrabold text-[#2545ff]">Rp 14.8 Jt</div>
          <span className="text-[11.5px] font-bold text-[#2545ff]">Rekening Tujuan: BCA 8809123847</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Otomasi Rekonsiliasi AI</div>
          <div className="text-[28px] font-extrabold text-purple-700">99.8%</div>
          <span className="text-[11.5px] font-bold text-purple-600">Pengecekan Mutasi Real-Time</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Riwayat Mutasi Transaksi Masuk</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID Transaksi & Order</th>
                <th>Pelanggan</th>
                <th>Metode Bayar</th>
                <th>Nominal Kotor (Gross)</th>
                <th>Biaya Gateway</th>
                <th>Penerimaan Bersih (Net)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13.5px]">{t.id}</div>
                    <div className="text-[11px] text-[#8f95a8] font-mono">{t.orderId} • {t.date}</div>
                  </td>
                  <td>
                    <span className="font-bold text-[#1e2640] text-[13px]">{t.customer}</span>
                  </td>
                  <td>
                    <span className="text-[12.5px] font-semibold text-[#5a6380]">{t.method}</span>
                  </td>
                  <td>
                    <span className="font-extrabold text-[#1e2640] text-[13.5px]">
                      Rp {t.gross.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td>
                    <span className="text-[12px] text-purple-700 font-bold">
                      {t.fee > 0 ? `Rp ${t.fee.toLocaleString("id-ID")}` : "Rp 0 (Gratis)"}
                    </span>
                  </td>
                  <td>
                    <span className="font-extrabold text-emerald-700 text-[13.5px]">
                      Rp {t.net.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success text-[11px] flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>Settled</span>
                    </span>
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
