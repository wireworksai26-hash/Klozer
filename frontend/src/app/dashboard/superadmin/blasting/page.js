"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  RadioIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  BuildingIcon,
  ClockIcon,
  MessageSquareIcon,
  SlidersIcon,
  SparklesIcon,
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
      speed: "12 msg/sec (Safe)",
      sentAt: "28 Agu 2026, 09:00",
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
      speed: "15 msg/sec (Safe)",
      sentAt: "29 Agu 2026, 14:00 (Sedang Berjalan)",
    },
    {
      id: "BLAST-803",
      campaignName: "Undangan Bincang Kopi Barista Night",
      institutionId: "INST-003",
      institutionName: "Kopi Kenangan Senja",
      targetAudience: "Member Cafe Terdaftar",
      totalRecipients: 1200,
      sentCount: 1200,
      deliveredCount: 1180,
      readCount: 950,
      convertedCount: 210,
      status: "completed",
      speed: "10 msg/sec (Safe)",
      sentAt: "27 Agu 2026, 18:30",
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
      speed: "Antrian Jadwal (31 Agu 08:00)",
      sentAt: "31 Agu 2026, 08:00 WIB",
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Superadmin Master Operasional</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Monitoring WhatsApp Broadcast (Blasting)
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Pantau seluruh aktivitas pengiriman pesan massal WhatsApp antar-tenant, kecepatan antrian, dan pencegahan banned nomor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Anti-Banned Rate Limiter: AKTIF</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Total Broadcast Dikirim</span>
            <RadioIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">28,900 Pesan</div>
          <span className="text-[11.5px] font-bold text-emerald-600">98.2% Sukses Terkirim</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Read Rate Rata-rata</span>
            <MessageSquareIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">84.6%</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Sangat Tinggi (High Engagement)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Kampanye Aktif Berjalan</span>
            <ClockIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">1 Kampanye</div>
          <span className="text-[11.5px] font-bold text-[#2545ff]">Kecepatan Aman: 15 msg/dtk</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Status Meta Cloud API</span>
            <SparklesIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">Tier 3 (Unlimited)</div>
          <span className="text-[11.5px] font-bold text-purple-600">Green Tier Status</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#ede8e2] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-1.5">
            <BuildingIcon className="w-3.5 h-3.5 text-[#8f95a8]" />
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="bg-transparent text-[12.5px] font-bold text-[#1e2640] outline-none cursor-pointer"
            >
              <option value="all">Semua Tenant</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold uppercase text-[#8f95a8]">Status:</span>
            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value)}
              className="bg-transparent text-[12.5px] font-bold text-[#1e2640] outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="running">Sedang Berjalan</option>
              <option value="completed">Selesai</option>
              <option value="scheduled">Terjadwal</option>
              <option value="paused">Dijeda</option>
            </select>
          </div>
        </div>

        <div className="text-[12.5px] font-bold text-[#8f95a8]">
          Total Kampanye: <span className="text-[#2545ff]">{filteredCampaigns.length}</span>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nama Kampanye</th>
              <th>Tenant Instansi</th>
              <th>Target Audiens</th>
              <th>Progres Pengiriman</th>
              <th>Statistik (Terkirim / Dibaca / Konversi)</th>
              <th>Status & Kontrol</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.map((c) => {
              const progressPercent =
                c.totalRecipients > 0 ? Math.round((c.sentCount / c.totalRecipients) * 100) : 0;

              return (
                <tr key={c.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13.5px]">{c.campaignName}</div>
                    <div className="text-[11.5px] text-[#8f95a8]">{c.sentAt}</div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                      <BuildingIcon className="w-3 h-3" />
                      <span>{c.institutionName}</span>
                    </span>
                  </td>
                  <td>
                    <div className="text-[13px] font-semibold text-[#1e2640]">{c.targetAudience}</div>
                    <div className="text-[11.5px] text-[#5a6380]">{c.totalRecipients.toLocaleString()} Kontak Target</div>
                  </td>
                  <td>
                    <div className="w-[140px]">
                      <div className="flex items-center justify-between text-[11.5px] font-bold text-[#1e2640] mb-1">
                        <span>{progressPercent}%</span>
                        <span className="text-[#8f95a8]">
                          {c.sentCount}/{c.totalRecipients}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#ede8e2] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            c.status === "completed" ? "bg-emerald-500" : "bg-[#2545ff]"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-3 text-[12px]">
                      <div>
                        <span className="text-[#8f95a8] text-[10px] block font-bold uppercase">Delivered</span>
                        <span className="font-bold text-[#1e2640]">{c.deliveredCount}</span>
                      </div>
                      <div>
                        <span className="text-[#8f95a8] text-[10px] block font-bold uppercase">Read</span>
                        <span className="font-bold text-emerald-600">{c.readCount}</span>
                      </div>
                      <div>
                        <span className="text-[#8f95a8] text-[10px] block font-bold uppercase">Order</span>
                        <span className="font-bold text-purple-600">{c.convertedCount}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {c.status === "running" && (
                        <span className="badge badge-warning text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>Running</span>
                        </span>
                      )}
                      {c.status === "completed" && (
                        <span className="badge badge-success text-[11px]">Selesai</span>
                      )}
                      {c.status === "scheduled" && (
                        <span className="badge badge-info text-[11px]">Terjadwal</span>
                      )}
                      {c.status === "paused" && (
                        <span className="badge badge-danger text-[11px]">Dijeda</span>
                      )}

                      {c.status === "running" && (
                        <button
                          type="button"
                          onClick={() => togglePauseCampaign(c.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
                        >
                          Pause
                        </button>
                      )}
                      {c.status === "paused" && (
                        <button
                          type="button"
                          onClick={() => togglePauseCampaign(c.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
