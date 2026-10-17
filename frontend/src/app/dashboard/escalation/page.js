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
            <span className="text-micro font-bold uppercase tracking-wider bg-danger-100 text-danger-800 px-2.5 py-0.5 rounded-full border border-danger-200 flex items-center gap-1.5">
              <AlertTriangleIcon className="w-3.5 h-3.5" />
              <span>Sistem Eskalasi & Hand-over Human CS</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Antrean Eskalasi & Co-Pilot CS
          </h1>
          <p className="text-label text-fg-muted">
            Daftar percakapan WhatsApp yang membutuhkan intervensi supervisor atau penanganan manual human agent.
          </p>
        </div>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Perlu Penanganan Cepat</div>
          <div className={`text-heading-md font-bold ${pendingCount > 0 ? "text-danger-600" : "text-fg"}`}>
            {pendingCount} Tiket
          </div>
          <span className={`text-micro font-bold ${pendingCount > 0 ? "text-danger-600" : "text-success-600"}`}>
            {pendingCount > 0 ? "Memerlukan tindak lanjut" : "Semua antrean tertangani"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Target SLA Respons</div>
          <div className="text-heading-md font-bold text-brand">&lt; 5 Menit</div>
          <span className="text-micro font-bold text-success-600">Standar operasional prima</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Terselesaikan Hari Ini</div>
          <div className="text-heading-md font-bold text-success-700">{handledCount} Tiket</div>
          <span className="text-micro font-bold text-success-600">100% Kepuasan Pelanggan</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("pending")}
          className={`px-4 py-2 rounded-xl text-label font-bold border-none cursor-pointer transition-all ${
            activeFilter === "pending"
              ? "bg-brand text-white shadow-xs"
              : "bg-white text-fg-muted hover:text-fg border border-line"
          }`}
        >
          Menunggu Penanganan ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("handled")}
          className={`px-4 py-2 rounded-xl text-label font-bold border-none cursor-pointer transition-all ${
            activeFilter === "handled"
              ? "bg-brand text-white shadow-xs"
              : "bg-white text-fg-muted hover:text-fg border border-line"
          }`}
        >
          Sudah Ditugaskan ({handledCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-4 py-2 rounded-xl text-label font-bold border-none cursor-pointer transition-all ${
            activeFilter === "all"
              ? "bg-brand text-white shadow-xs"
              : "bg-white text-fg-muted hover:text-fg border border-line"
          }`}
        >
          Semua Tiket ({escalations.length})
        </button>
      </div>

      {/* Escalation Cards */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-line shadow-xs text-center">
            <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-success-50 text-success-600 flex items-center justify-center mb-3">
                <ShieldCheckIcon className="w-6 h-6 text-success-600" />
              </div>
              <div className="font-bold text-ink text-body-sm">Tidak Ada Antrean Eskalasi</div>
              <p className="text-caption text-fg-muted mt-1">
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
                  ? "bg-danger-50/30 border-danger-200"
                  : "bg-white border-line"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-label ${
                      item.urgency === "critical"
                        ? "bg-danger-100 text-danger-700"
                        : item.urgency === "high"
                        ? "bg-warning-100 text-warning-800"
                        : "bg-brand-soft text-brand"
                    }`}
                  >
                    <AlertTriangleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-body-sm text-fg">{item.customerName}</span>
                      <span className="font-mono text-micro text-fg-subtle">({item.phone})</span>
                    </div>
                    <span className="text-caption font-bold text-danger-700">{item.reason}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-micro text-fg-subtle flex items-center gap-1 font-medium">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{item.waitTime}</span>
                  </span>
                  {item.status === "pending" ? (
                    <span className="badge badge-danger text-micro">Belum Ditangani</span>
                  ) : (
                    <span className="badge badge-success text-micro">Sedang Ditangani</span>
                  )}
                </div>
              </div>

              <div className="py-3 text-label text-fg-muted leading-relaxed">
                {item.summary}
              </div>

              <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-caption text-fg-subtle">
                  Ditugaskan ke: <strong className="text-fg">{item.assignedCs}</strong>
                </div>

                {item.status === "pending" && (
                  <div className="flex items-center gap-2">
                    {teamMembers.map((tm) => (
                      <button
                        key={tm.id}
                        type="button"
                        onClick={() => handleAssignCs(item.id, tm.name)}
                        className="px-3 py-1.5 rounded-lg text-caption font-bold bg-brand-soft hover:bg-brand hover:text-white text-brand border-none cursor-pointer transition-colors"
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
