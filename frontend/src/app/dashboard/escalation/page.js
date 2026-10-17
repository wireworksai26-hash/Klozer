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
  ShieldCheckIcon,
} from "@/components/icons";

export default function SupervisorEscalationPage() {
  const { teamMembers, currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [activeFilter, setActiveFilter] = useState("all");

  const [escalations, setEscalations] = useState(
    isDefaultDemo
      ? [
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
        ]
      : []
  );

  const filtered = escalations.filter((item) => {
    if (activeFilter === "all") return true;
    return item.status === activeFilter;
  });

  const pendingCount = escalations.filter((e) => e.status === "pending").length;
  const handledCount = escalations.filter((e) => e.status === "handled").length;

  const handleAssignCs = (id, csName) => {
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "handled", assignedCs: csName } : e))
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1.5">
              <AlertTriangleIcon className="w-3.5 h-3.5" />
              <span>Sistem Eskalasi & Hand-over Human CS</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Antrean Eskalasi & Co-Pilot CS
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Daftar percakapan WhatsApp yang membutuhkan intervensi supervisor atau penanganan manual human agent.
          </p>
        </div>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Perlu Penanganan Cepat</div>
          <div className={`text-[28px] font-extrabold ${pendingCount > 0 ? "text-rose-600" : "text-[#1e2640]"}`}>
            {pendingCount} Tiket
          </div>
          <span className={`text-[11.5px] font-bold ${pendingCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {pendingCount > 0 ? "Memerlukan tindak lanjut" : "Semua antrean tertangani"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Target SLA Respons</div>
          <div className="text-[28px] font-extrabold text-[#2545ff]">&lt; 5 Menit</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Standar operasional prima</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Terselesaikan Hari Ini</div>
          <div className="text-[28px] font-extrabold text-emerald-700">{handledCount} Tiket</div>
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
          Menunggu Penanganan ({pendingCount})
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
          Sudah Ditugaskan ({handledCount})
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
          Semua Tiket ({escalations.length})
        </button>
      </div>

      {/* Escalation Cards */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-[#ede8e2] shadow-xs text-center">
            <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheckIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="font-extrabold text-[#0c1754] text-[15px]">Tidak Ada Antrean Eskalasi</div>
              <p className="text-[12.5px] text-[#64748b] mt-1">
                Semua chat WhatsApp saat ini tertangani dengan baik oleh sistem AI dan belum ada eskalasi khusus.
              </p>
            </div>
          </div>
        ) : (
          filtered.map((item) => (
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
                      <span className="font-extrabold text-[15px] text-[#1e2640]">{item.customerName}</span>
                      <span className="font-mono text-[11.5px] text-[#8f95a8]">({item.phone})</span>
                    </div>
                    <span className="text-[12.5px] font-bold text-rose-700">{item.reason}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11.5px] text-[#8f95a8] flex items-center gap-1 font-medium">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{item.waitTime}</span>
                  </span>
                  {item.status === "pending" ? (
                    <span className="badge badge-danger text-[11px]">Belum Ditangani</span>
                  ) : (
                    <span className="badge badge-success text-[11px]">Sedang Ditangani</span>
                  )}
                </div>
              </div>

              <div className="py-3 text-[13px] text-[#5a6380] leading-relaxed">
                {item.summary}
              </div>

              <div className="pt-3 border-t border-[#ede8e2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[12px] text-[#8f95a8]">
                  Ditugaskan ke: <strong className="text-[#1e2640]">{item.assignedCs}</strong>
                </div>

                {item.status === "pending" && (
                  <div className="flex items-center gap-2">
                    {teamMembers.map((tm) => (
                      <button
                        key={tm.id}
                        type="button"
                        onClick={() => handleAssignCs(item.id, tm.name)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-[#eaebf8] hover:bg-[#2545ff] hover:text-white text-[#2545ff] border-none cursor-pointer transition-colors"
                      >
                        Tugaskan ke {tm.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
