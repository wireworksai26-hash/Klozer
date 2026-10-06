"use client";
import React, { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { MetricCard } from "@/components/dashboard";
import {
  RadioIcon,
  CheckCircleIcon,
  ClockIcon,
  MessageSquareIcon,
  BuildingIcon,
} from "@/components/icons";

export default function SuperadminBlastingPage() {
  const { institutions } = useDashboard();
  const [selectedInst, setSelectedInst] = useState("all");
  const [activeStatus, setActiveStatus] = useState("all");

  const [campaigns, setCampaigns] = useState([
    {
      id: "BLAST-801",
      campaignName: "Promo Gajian Weekend 50% Off",
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      targetAudience: "Pelanggan VIP & Repeat Order",
      totalRecipients: 4500,
      sentCount: 4500,
      deliveredCount: 4410,
      readCount: 3890,
      convertedCount: 620,
      status: "completed",
      sentAt: "28 Agu 2026",
    },
    {
      id: "BLAST-802",
      campaignName: "Flash Sale Serum Brightening Glow",
      institutionId: "INST-002",
      institutionName: "Lumiere Skincare Official",
      targetAudience: "Lead Baru 7 Hari Terakhir",
      totalRecipients: 8200,
      sentCount: 5400,
      deliveredCount: 5290,
      readCount: 4120,
      convertedCount: 480,
      status: "running",
      sentAt: "29 Agu 2026",
    },
    {
      id: "BLAST-803",
      campaignName: "Undangan Bincang Kopi Barista",
      institutionId: "INST-003",
      institutionName: "Kopi Kenangan Senja",
      targetAudience: "Member Cafe Terdaftar",
      totalRecipients: 1200,
      sentCount: 1200,
      deliveredCount: 1180,
      readCount: 950,
      convertedCount: 210,
      status: "completed",
      sentAt: "27 Agu 2026",
    },
    {
      id: "BLAST-804",
      campaignName: "Edisi Khusus Zakat Akhir Bulan",
      institutionId: "INST-004",
      institutionName: "Yayasan Peduli Ummat",
      targetAudience: "Donatur Rutin Bulanan",
      totalRecipients: 15000,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      convertedCount: 0,
      status: "scheduled",
      sentAt: "31 Agu 2026",
    },
  ]);

  const togglePauseCampaign = (id) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newStatus = c.status === "running" ? "paused" : "running";
          return { ...c, status: newStatus };
        }
        return c;
      })
    );
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchInst = selectedInst === "all" || c.institutionId === selectedInst;
    const matchStatus = activeStatus === "all" || c.status === activeStatus;
    return matchInst && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f1f3f7]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Operasional Global
            </span>
            <span className="text-[12px] text-[#64748b]">Monitoring Antrean WhatsApp Broadcast</span>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">
            Monitoring Blasting WA
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[12px] font-bold text-emerald-700">Anti-Ban Queue: 12 msg/s</span>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pesan Terkirim"
          value="11.100"
          subtitle="Bulan berjalan"
          delta="+18.2%"
          deltaType="positive"
          sparklineData={[80, 95, 90, 110, 105, 130, 125]}
          icon={RadioIcon}
        />
        <MetricCard
          title="Tingkat Terbaca (Read)"
          value="79.8%"
          subtitle="Rata-rata interaksi"
          delta="+3.4%"
          deltaType="positive"
          sparklineData={[74, 76, 75, 78, 79, 81, 80]}
          icon={MessageSquareIcon}
        />
        <MetricCard
          title="Tingkat Terkirim (Delivery)"
          value="98.2%"
          subtitle="Nomor aktif terverifikasi"
          delta="99.9% Uptime"
          deltaType="positive"
          sparklineData={[97, 98, 98, 98, 99, 98, 98]}
          icon={CheckCircleIcon}
        />
        <MetricCard
          title="Kampanye Berjalan"
          value={`${campaigns.filter((c) => c.status === "running").length} Antrean`}
          subtitle="Tidak ada antrean tertunda"
          delta="Normal"
          deltaType="positive"
          sparklineData={[1, 2, 2, 3, 2, 1, 1]}
          icon={ClockIcon}
        />
      </div>

      {/* Campaign Table */}
      <div className="bg-white rounded-2xl border border-[#e8eaef] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 mb-4 border-b border-[#f1f3f7]">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[16px] font-bold text-[#0f172a]">Daftar Kampanye Broadcast</h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="text-[12.5px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-1.5 text-[#0f172a] outline-none cursor-pointer"
            >
              <option value="all">Semua Tenant</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>

            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value)}
              className="text-[12.5px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-1.5 text-[#0f172a] outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="running">Sedang Berjalan</option>
              <option value="completed">Selesai</option>
              <option value="scheduled">Terjadwal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="py-2.5 px-4 font-bold text-[#475467]">Nama Kampanye</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Instansi</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Progres Kirim</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Terbaca</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Closing</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Status</th>
                <th className="py-2.5 px-4 font-bold text-[#475467] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f7]">
              {filteredCampaigns.map((camp) => {
                const progressPct =
                  camp.totalRecipients > 0
                    ? Math.round((camp.sentCount / camp.totalRecipients) * 100)
                    : 0;
                return (
                  <tr key={camp.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0f172a]">{camp.campaignName}</div>
                      <div className="text-[11.5px] text-[#94a3b8]">{camp.targetAudience}</div>
                    </td>
                    <td className="py-3 px-4 text-[#475467] font-medium">{camp.institutionName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-[#f1f3f7] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${progressPct}%` }}
                            className={`h-full rounded-full ${
                              camp.status === "completed" ? "bg-emerald-500" : "bg-[#2545ff]"
                            }`}
                          />
                        </div>
                        <span className="text-[11.5px] font-mono font-bold text-[#0f172a]">
                          {progressPct}%
                        </span>
                      </div>
                      <div className="text-[10.5px] text-[#94a3b8] mt-0.5">
                        {camp.sentCount.toLocaleString()} / {camp.totalRecipients.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#475467]">
                      {camp.readCount.toLocaleString()} Kontak
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {camp.convertedCount.toLocaleString()} Order
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          camp.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : camp.status === "running"
                            ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {camp.status === "completed"
                          ? "Selesai"
                          : camp.status === "running"
                          ? "Berjalan"
                          : "Terjadwal"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {camp.status === "running" || camp.status === "paused" ? (
                        <button
                          type="button"
                          onClick={() => togglePauseCampaign(camp.id)}
                          className="px-2.5 py-1 text-[11.5px] font-bold rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#0f172a] cursor-pointer"
                        >
                          {camp.status === "running" ? "Pause" : "Resume"}
                        </button>
                      ) : (
                        <span className="text-[12px] text-[#94a3b8]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
