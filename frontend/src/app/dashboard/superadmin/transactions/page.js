"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  DollarSignIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DownloadIcon,
  BuildingIcon,
  QrIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export default function SuperadminTransactionsPage() {
  const { institutions } = useDashboard();
  const [selectedInst, setSelectedInst] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");

  const mockTransactions = [
    {
      id: "TRX-8801",
      orderNumber: "ORD-20260829-001",
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      customer: "Fauzan Hadi",
      items: "2x Kemeja Batik Tulis Sutra",
      grossAmount: 1300000,
      paymentMethod: "QRIS Dinamis (Xendit)",
      platformFee: 9100, // 0.7%
      netToTenant: 1290900,
      status: "settled",
      time: "29 Agu 2026, 17:42",
    },
    {
      id: "TRX-8802",
      orderNumber: "ORD-20260829-002",
      institutionId: "INST-002",
      institutionName: "Lumiere Skincare Official",
      customer: "Clarissa Putri",
      items: "1x Brightening Serum + Night Cream",
      grossAmount: 450000,
      paymentMethod: "BCA Virtual Account",
      platformFee: 4000, // Flat
      netToTenant: 446000,
      status: "settled",
      time: "29 Agu 2026, 16:30",
    },
    {
      id: "TRX-8803",
      orderNumber: "ORD-20260829-003",
      institutionId: "INST-003",
      institutionName: "Yayasan ZISWAF Peduli Umat",
      customer: "H. Sudirman",
      items: "Donasi Wakaf Sumur Bor Pedalaman",
      grossAmount: 2500000,
      paymentMethod: "QRIS Donasi (0% MDR)",
      platformFee: 0,
      netToTenant: 2500000,
      status: "settled",
      time: "29 Agu 2026, 15:10",
    },
    {
      id: "TRX-8804",
      orderNumber: "ORD-20260829-004",
      institutionId: "INST-004",
      institutionName: "Geprek Juara",
      customer: "Dimas Anggara",
      items: "2x Paket Juara 1 (Ayam Geprek + Es Teh)",
      grossAmount: 44000,
      paymentMethod: "QRIS Dinamis 1-Klik",
      platformFee: 308,
      netToTenant: 43692,
      status: "settled",
      time: "29 Agu 2026, 14:05",
    },
    {
      id: "TRX-8805",
      orderNumber: "ORD-20260829-005",
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      customer: "Hendro Wijaya",
      items: "1x Gamis Batik Silk",
      grossAmount: 520000,
      paymentMethod: "COD Terproteksi AI",
      platformFee: 15600, // 3%
      netToTenant: 504400,
      status: "in_escrow",
      time: "29 Agu 2026, 12:20",
    },
  ];

  const filteredTrx = mockTransactions.filter((t) => {
    const matchInst = selectedInst === "all" || t.institutionId === selectedInst;
    const matchPay = selectedPayment === "all" || t.paymentMethod.includes(selectedPayment);
    return matchInst && matchPay;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Superadmin Keuangan Global</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Rekapitulasi Transaksi Lintas Instansi
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Pusat audit settlement pembayaran QRIS, Virtual Account, dan COD seluruh tenant platform Klozer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Mengunduh Rekap Transaksi ke Excel/CSV...")}
          className="btn-primary !py-2.5 !px-4 text-[13px] font-bold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Export Rekap Excel</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Platform GMV (Gross)</span>
            <DollarSignIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">Rp 1.48 Miliar</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Bulan Berjalan (+18.4%)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Fee Platform Klozer</span>
            <CrownIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-extrabold text-purple-700 mt-2">Rp 28.7 Jt</div>
          <span className="text-[11.5px] font-bold text-purple-600">MDR & VA Settlement Fee</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Transaksi QRIS Dinamis</span>
            <QrIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">68.2%</div>
          <span className="text-[11.5px] font-bold text-[#2545ff]">Metode Pembayaran Terfavorit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Settlement Success Rate</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">99.8%</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Automated Webhook Match</span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#ede8e2] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-1.5">
            <BuildingIcon className="w-3.5 h-3.5 text-[#8f95a8]" />
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="bg-transparent text-[12.5px] font-bold text-[#1e2640] outline-none cursor-pointer"
            >
              <option value="all">Semua Tenant Instansi</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold uppercase text-[#8f95a8]">Metode:</span>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="bg-transparent text-[12.5px] font-bold text-[#1e2640] outline-none cursor-pointer"
            >
              <option value="all">Semua Metode Bayar</option>
              <option value="QRIS">QRIS Dinamis</option>
              <option value="Virtual Account">Virtual Account</option>
              <option value="COD">COD Terproteksi AI</option>
            </select>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-[#8f95a8]">
          Total Transaksi: <span className="text-[#2545ff]">{filteredTrx.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID & Order</th>
              <th>Tenant Instansi</th>
              <th>Pelanggan & Rincian</th>
              <th>Metode Bayar</th>
              <th>Gross Amount</th>
              <th>Platform Fee</th>
              <th>Status Settlement</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrx.map((trx) => (
              <tr key={trx.id} className="hover:bg-[#fcfbf9] transition-colors">
                <td>
                  <div className="font-bold text-[#1e2640] text-[13.5px]">{trx.id}</div>
                  <div className="text-[11.5px] text-[#8f95a8] font-mono">{trx.orderNumber}</div>
                  <div className="text-[10.5px] text-[#8f95a8]">{trx.time}</div>
                </td>
                <td>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                    <BuildingIcon className="w-3 h-3" />
                    <span>{trx.institutionName}</span>
                  </span>
                </td>
                <td>
                  <div className="font-bold text-[#1e2640] text-[13px]">{trx.customer}</div>
                  <div className="text-[11.5px] text-[#5a6380]">{trx.items}</div>
                </td>
                <td>
                  <div className="text-[12.5px] font-semibold text-[#1e2640]">{trx.paymentMethod}</div>
                </td>
                <td>
                  <div className="font-extrabold text-[#1e2640] text-[13.5px]">
                    Rp {trx.grossAmount.toLocaleString("id-ID")}
                  </div>
                </td>
                <td>
                  <div className="font-bold text-purple-700 text-[12.5px]">
                    Rp {trx.platformFee.toLocaleString("id-ID")}
                  </div>
                </td>
                <td>
                  {trx.status === "settled" && (
                    <span className="badge badge-success text-[11px] flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>Settled</span>
                    </span>
                  )}
                  {trx.status === "in_escrow" && (
                    <span className="badge badge-warning text-[11px] flex items-center gap-1">
                      <ShieldCheckIcon className="w-3 h-3" />
                      <span>Escrow Kurir</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
