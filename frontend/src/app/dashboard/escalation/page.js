"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  MessageSquareIcon,
  SparklesIcon,
} from "@/components/icons";

export default function SupervisorEscalationPage() {
  const { teamMembers } = useDashboard();
  const [activeFilter, setActiveFilter] = useState("pending");

  const [escalations, setEscalations] = useState([
    {
      id: "ESC-101",
      customerName: "Budi Pratama",
      phone: "+62 812-9988-1122",
      reason: "Permintaan Khusus: Pembelian Grosir 100 Pcs Seragam Kantor",
      summary: "Pelanggan meminta surat penawaran resmi (invoice proforma) dan diskon khusus instansi BUMN.",
      urgency: "high",
      waitTime: "4 menit lalu",
      status: "pending",
      assignedCs: "Belum Ditugaskan",
    },
    {
      id: "ESC-102",
      customerName: "Siti Rahayu",
      phone: "+62 857-4433-2211",
      reason: "Komplain Paket: Kurir Salah Antar Alamat",
      summary: "Paket tertukar di ekspedisi J&T. Pelanggan meminta pertanggungjawaban ganti rugi barang.",
      urgency: "critical",
      waitTime: "12 menit lalu (Mendekati SLA)",
      status: "pending",
      assignedCs: "Belum Ditugaskan",
    },
    {
      id: "ESC-103",
      customerName: "Hendra Gunawan",
      phone: "+62 878-1122-3344",
      reason: "Konfirmasi Retur Ukuran Baju",
      summary: "Ukuran L terlalu sempit di bahu, meminta tukar ke size XL warna yang sama.",
      urgency: "medium",
      waitTime: "25 menit lalu",
      status: "handled",
      assignedCs: "Sarah Amalia",
    },
  ]);

  const handleAssign = (id, csName) => {
    setEscalations((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return { ...e, assignedCs: csName, status: "handled" };
        }
        return e;
      })
    );
    alert(`Eskalasi berhasil ditugaskan kepada staf CS: ${csName}`);
  };

  const filtered = escalations.filter((e) => {
    if (activeFilter === "all") return true;
    return e.status === activeFilter;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1.5">
              <AlertTriangleIcon className="w-3.5 h-3.5" />
              <span>Pusat Eskalasi & Tiket CS</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Antrian Eskalasi Chat ke CS Manusia
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Daftar percakapan WhatsApp yang membutuhkan penanganan khusus staf manusia (komplain, grosir B2B, kendala kurir).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[12.5px] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>2 Tiket Menunggu Respon</span>
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Tiket Menunggu Penugasan</div>
          <div className="text-[28px] font-extrabold text-rose-600">2 Tiket</div>
          <span className="text-[11.5px] font-bold text-rose-600">Perlu Segera Ditangani</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Rata-Rata Respon Eskalasi</div>
          <div className="text-[28px] font-extrabold text-[#1e2640]">3.8 Menit</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Target SLA: Maksimal 10 Menit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Terselesaikan Hari Ini</div>
          <div className="text-[28px] font-extrabold text-emerald-700">18 Tiket</div>
          <span className="text-[11.5px] font-bold text-emerald-600">100% Kepuasan Pelanggan</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("pending")}
          className={`px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all ${
            activeFilter === "pending"
              ? "bg-[#2545ff] text-white shadow-xs"
              : "bg-white text-[#5a6380] hover:text-[#1e2640] border border-[#ede8e2]"
          }`}
        >
          Menunggu Penanganan (2)
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("handled")}
          className={`px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all ${
            activeFilter === "handled"
              ? "bg-[#2545ff] text-white shadow-xs"
              : "bg-white text-[#5a6380] hover:text-[#1e2640] border border-[#ede8e2]"
          }`}
        >
          Sudah Ditugaskan
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all ${
            activeFilter === "all"
              ? "bg-[#2545ff] text-white shadow-xs"
              : "bg-white text-[#5a6380] hover:text-[#1e2640] border border-[#ede8e2]"
          }`}
        >
          Semua Tiket
        </button>
      </div>

      {/* Escalation Cards */}
      <div className="flex flex-col gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-2xl border transition-all ${
              item.urgency === "critical"
                ? "bg-rose-50/30 border-rose-200"
                : "bg-white border-[#ede8e2]"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#ede8e2]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] ${
                    item.urgency === "critical"
                      ? "bg-rose-100 text-rose-700"
                      : item.urgency === "high"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-[#2545ff]"
                  }`}
                >
                  <AlertTriangleIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-[15px] text-[#1e2640]">{item.customerName}</h2>
                    <span className="text-[12px] font-mono text-[#5a6380]">{item.phone}</span>
                  </div>
                  <div className="text-[12.5px] font-bold text-rose-700 mt-0.5">{item.reason}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <span className="text-[11.5px] text-[#8f95a8] flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>{item.waitTime}</span>
                </span>
                {item.status === "pending" ? (
                  <span className="badge badge-danger text-[11px]">Butuh CS</span>
                ) : (
                  <span className="badge badge-success text-[11px]">Ditangani: {item.assignedCs}</span>
                )}
              </div>
            </div>

            <div className="py-3 text-[13px] text-[#5a6380] leading-relaxed">
              <span className="font-bold text-[#1e2640] block mb-1">Ringkasan Konteks AI:</span>
              <p className="p-3 bg-[#f5f4f2] rounded-xl border border-[#ede8e2] italic">&ldquo;{item.summary}&rdquo;</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#ede8e2]">
              <div className="text-[12px] text-[#8f95a8]">
                Ditugaskan ke: <span className="font-bold text-[#1e2640]">{item.assignedCs}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleAssign(item.id, e.target.value)}
                  defaultValue=""
                  className="bg-[#f5f4f2] border border-[#ede8e2] text-[12.5px] font-bold rounded-xl px-3 py-1.5 text-[#1e2640] outline-none cursor-pointer"
                >
                  <option value="" disabled>Pilih Staf CS...</option>
                  <option value="Sarah Amalia">Sarah Amalia (CS 1)</option>
                  <option value="Budi Santoso">Budi Santoso (CS 2)</option>
                  <option value="Rian Supervisor">Rian Supervisor (Takeover)</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleAssign(item.id, "Rian Supervisor")}
                  className="btn-primary !py-1.5 !px-4 text-[12px] font-bold cursor-pointer"
                >
                  Takeover Langsung
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
