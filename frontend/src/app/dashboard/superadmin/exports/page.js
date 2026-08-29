"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  DownloadIcon,
  CrownIcon,
  CheckCircleIcon,
  BuildingIcon,
  CalendarIcon,
  UsersIcon,
  DollarSignIcon,
  CpuIcon,
  RadioIcon,
} from "@/components/icons";

export default function SuperadminExportsPage() {
  const { institutions } = useDashboard();
  const [selectedModule, setSelectedModule] = useState("leads");
  const [selectedFormat, setSelectedFormat] = useState("xlsx");
  const [selectedTenant, setSelectedTenant] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const [history, setHistory] = useState([
    {
      id: "EXP-501",
      name: "Global_Leads_Report_Aug2026.xlsx",
      module: "Data Leads Global",
      tenant: "Semua Tenant",
      records: "18,429 baris",
      size: "2.4 MB",
      date: "29 Agu 2026, 17:15",
      status: "ready",
    },
    {
      id: "EXP-502",
      name: "Financial_Settlement_Q3_2026.csv",
      module: "Rekapitulasi Finansial & Fee",
      tenant: "Semua Tenant",
      records: "6,812 baris",
      size: "1.1 MB",
      date: "28 Agu 2026, 20:00",
      status: "ready",
    },
    {
      id: "EXP-503",
      name: "AI_Token_Consumption_Weekly.xlsx",
      module: "Log Pemakaian Token AI",
      tenant: "Batik Mahakarya Solo",
      records: "142,500 baris log",
      size: "8.7 MB",
      date: "27 Agu 2026, 11:30",
      status: "ready",
    },
  ]);

  const handleTriggerExport = (e) => {
    e.preventDefault();
    setIsExporting(true);
    setExportSuccess(false);

    setTimeout(() => {
      setIsExporting(false);
      setExportSuccess(true);
      const newFile = {
        id: `EXP-${Date.now().toString().slice(-3)}`,
        name: `${selectedModule.toUpperCase()}_Export_${Date.now().toString().slice(-4)}.${selectedFormat}`,
        module: selectedModule === "leads" ? "Data Leads Global" : selectedModule === "finance" ? "Rekap Transaksi" : "Log AI Token",
        tenant: selectedTenant === "all" ? "Semua Tenant" : "Selected Tenant",
        records: "Baru Di-generate",
        size: "1.8 MB",
        date: "Baru saja",
        status: "ready",
      };
      setHistory((prev) => [newFile, ...prev]);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Superadmin Keuangan & Audit</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Pusat Ekspor Data Platform
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Ekspor dataset transaksi, leads WhatsApp, konsumsi token LLM, dan kampanye broadcast ke format Excel (.xlsx) atau CSV.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#ede8e2]">
            <DownloadIcon className="w-5 h-5 text-[#2545ff]" />
            <h2 className="text-[17px] font-extrabold text-[#1e2640]">Buat Ekspor Baru</h2>
          </div>

          <form onSubmit={handleTriggerExport} className="flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Pilih Modul Data:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedModule("leads")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    selectedModule === "leads"
                      ? "border-[#2545ff] bg-[#edeffe] text-[#2545ff]"
                      : "border-[#ede8e2] bg-[#fcfbf9] text-[#5a6380]"
                  }`}
                >
                  <UsersIcon className="w-4 h-4" />
                  <span className="text-[12.5px] font-bold">Leads Kontak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModule("finance")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    selectedModule === "finance"
                      ? "border-[#2545ff] bg-[#edeffe] text-[#2545ff]"
                      : "border-[#ede8e2] bg-[#fcfbf9] text-[#5a6380]"
                  }`}
                >
                  <DollarSignIcon className="w-4 h-4" />
                  <span className="text-[12.5px] font-bold">Transaksi & Fee</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModule("tokens")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    selectedModule === "tokens"
                      ? "border-[#2545ff] bg-[#edeffe] text-[#2545ff]"
                      : "border-[#ede8e2] bg-[#fcfbf9] text-[#5a6380]"
                  }`}
                >
                  <CpuIcon className="w-4 h-4" />
                  <span className="text-[12.5px] font-bold">Token AI LLM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModule("blasting")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    selectedModule === "blasting"
                      ? "border-[#2545ff] bg-[#edeffe] text-[#2545ff]"
                      : "border-[#ede8e2] bg-[#fcfbf9] text-[#5a6380]"
                  }`}
                >
                  <RadioIcon className="w-4 h-4" />
                  <span className="text-[12.5px] font-bold">Broadcast Blasting</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Cakupan Tenant:
              </label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full text-[13px] font-medium bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none"
              >
                <option value="all">Semua Tenant (Universal Platform)</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Rentang Tanggal:
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full text-[13px] font-medium bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none"
              >
                <option value="7d">7 Hari Terakhir</option>
                <option value="30d">30 Hari Terakhir (Bulan Ini)</option>
                <option value="90d">Kuartal Ini (90 Hari)</option>
                <option value="all">Seluruh Riwayat (All Time)</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Format File:
              </label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[#ede8e2] cursor-pointer bg-[#fcfbf9] text-[13px] font-bold text-[#1e2640]">
                  <input
                    type="radio"
                    name="format"
                    checked={selectedFormat === "xlsx"}
                    onChange={() => setSelectedFormat("xlsx")}
                  />
                  <span>Excel (.xlsx)</span>
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[#ede8e2] cursor-pointer bg-[#fcfbf9] text-[13px] font-bold text-[#1e2640]">
                  <input
                    type="radio"
                    name="format"
                    checked={selectedFormat === "csv"}
                    onChange={() => setSelectedFormat("csv")}
                  />
                  <span>CSV File</span>
                </label>
              </div>
            </div>

            {exportSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-bold flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                <span>File siap diunduh di tabel riwayat!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isExporting}
              className="btn-primary !w-full !py-3 text-[13.5px] font-bold flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Memproses Data Platform...</span>
                </>
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4" />
                  <span>Generate File Ekspor</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Export History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2]">
            <div>
              <h2 className="text-[17px] font-extrabold text-[#1e2640]">Riwayat Unduhan File</h2>
              <p className="text-[12px] text-[#64748b]">Tersimpan di secure storage selama 14 hari.</p>
            </div>
            <span className="text-[12px] font-bold text-[#2545ff]">{history.length} File Tersedia</span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nama File & Modul</th>
                  <th>Tenant</th>
                  <th>Ukuran & Baris</th>
                  <th>Waktu Generate</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td>
                      <div className="font-bold text-[#1e2640] text-[13px]">{h.name}</div>
                      <div className="text-[11.5px] text-[#2545ff] font-semibold">{h.module}</div>
                    </td>
                    <td>
                      <span className="text-[12.5px] text-[#5a6380]">{h.tenant}</span>
                    </td>
                    <td>
                      <div className="text-[12.5px] font-bold text-[#1e2640]">{h.records}</div>
                      <div className="text-[11px] text-[#8f95a8]">{h.size}</div>
                    </td>
                    <td>
                      <span className="text-[11.5px] text-[#5a6380]">{h.date}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => alert(`Mengunduh file: ${h.name}`)}
                        className="px-3 py-1.5 text-[11.5px] font-bold rounded-lg border border-[#2545ff] bg-blue-50 text-[#2545ff] hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
