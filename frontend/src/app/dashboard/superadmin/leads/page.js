"use client";
import React, { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { MetricCard } from "@/components/dashboard";
import {
  UsersIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  DownloadIcon,
  BuildingIcon,
  SearchIcon,
} from "@/components/icons";

export default function SuperadminLeadsPage() {
  const { institutions } = useDashboard();
  const [selectedInst, setSelectedInst] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const mockGlobalLeads = [
    {
      id: "GL-901",
      customerName: "Fauzan Hadi",
      phone: "+62 819-2233-4455",
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      source: "TikTok WA",
      product: "Kain Batik Tulis Solo",
      value: 380000,
      status: "follow_up",
      assignedCs: "Sarah Amalia",
      date: "29 Agu 2026",
    },
    {
      id: "GL-902",
      customerName: "Dimas Anggara",
      phone: "+62 857-1122-9900",
      institutionId: "INST-002",
      institutionName: "Lumiere Skincare Official",
      source: "WhatsApp Direct",
      product: "Serum Anti-Aging Gold",
      value: 290000,
      status: "closed_won",
      assignedCs: "Budi Santoso",
      date: "29 Agu 2026",
    },
    {
      id: "GL-903",
      customerName: "Clarissa Putri",
      phone: "+62 812-9988-4433",
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      source: "Instagram Ads",
      product: "Kemeja Batik Sutra",
      value: 650000,
      status: "closed_won",
      assignedCs: "Sarah Amalia",
      date: "29 Agu 2026",
    },
    {
      id: "GL-904",
      customerName: "Indah Permata",
      phone: "+62 878-4455-6677",
      institutionId: "INST-004",
      institutionName: "Geprek Juara",
      source: "Facebook Ads",
      product: "Paket Juara 1",
      value: 88000,
      status: "new",
      assignedCs: "CS 1 - Geprek",
      date: "29 Agu 2026",
    },
    {
      id: "GL-905",
      customerName: "Hendro Wijaya",
      phone: "+62 813-7766-5544",
      institutionId: "INST-002",
      institutionName: "Lumiere Skincare Official",
      source: "TikTok Shop",
      product: "Acne Clear Package",
      value: 420000,
      status: "follow_up",
      assignedCs: "Dewi Lestari",
      date: "29 Agu 2026",
    },
    {
      id: "GL-906",
      customerName: "Aisyah Zahra",
      phone: "+62 852-3344-5566",
      institutionId: "INST-003",
      institutionName: "Yayasan ZISWAF Peduli Umat",
      source: "Google Search",
      product: "Wakaf Al-Quran",
      value: 500000,
      status: "closed_won",
      assignedCs: "Ahmad Fauzi",
      date: "29 Agu 2026",
    },
  ];

  const filteredLeads = mockGlobalLeads.filter((l) => {
    const matchInst = selectedInst === "all" || l.institutionId === selectedInst;
    const matchStatus = selectedStatus === "all" || l.status === selectedStatus;
    const matchSearch =
      l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.product.toLowerCase().includes(searchQuery.toLowerCase());
    return matchInst && matchStatus && matchSearch;
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
            <span className="text-[12px] text-[#64748b]">Arus Leads WhatsApp Lintas Tenant</span>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">
            Data Leads Global
          </h1>
        </div>

        <button
          type="button"
          onClick={() => alert("Mengunduh data leads...")}
          className="px-4 py-2 rounded-xl bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#0f172a] text-[13px] font-bold shadow-2xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <DownloadIcon className="w-4 h-4 text-[#2545ff]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads Global"
          value="18.429"
          subtitle="Tersebar di 4 Tenant"
          delta="+12.4%"
          deltaType="positive"
          sparklineData={[120, 145, 138, 170, 162, 205, 190]}
          icon={UsersIcon}
        />
        <MetricCard
          title="Konversi Closing"
          value="72.4%"
          subtitle="Tingkat closing tim CS"
          delta="+4.2%"
          deltaType="positive"
          sparklineData={[65, 68, 67, 70, 71, 74, 72]}
          icon={CheckCircleIcon}
        />
        <MetricCard
          title="RTS Dicegah AI"
          value="1.248 Order"
          subtitle="Efisiensi Rp 142 Jt"
          delta="100% Valid"
          deltaType="positive"
          sparklineData={[18, 22, 20, 26, 24, 30, 28]}
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Kecepatan Respon"
          value="1.8 Detik"
          subtitle="AI Assistant auto-reply"
          delta="Optimal"
          deltaType="positive"
          sparklineData={[2.4, 2.2, 2.0, 1.9, 1.8, 1.8, 1.8]}
          icon={SparklesIcon}
        />
      </div>

      {/* Filter Toolbar & Clean Table */}
      <div className="bg-white rounded-2xl border border-[#e8eaef] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-4 mb-4 border-b border-[#f1f3f7]">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search */}
            <input
              type="text"
              placeholder="Cari kontak, WA, produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-[13px] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2 text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#2545ff] focus:bg-white transition-all w-full sm:w-[240px]"
            />

            {/* Filter Tenant */}
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="text-[12.5px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-[#0f172a] outline-none cursor-pointer"
            >
              <option value="all">Semua Tenant Instansi</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-[12.5px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-[#0f172a] outline-none cursor-pointer"
            >
              <option value="all">Semua Status Leads</option>
              <option value="new">Lead Baru</option>
              <option value="follow_up">Sedang Follow Up</option>
              <option value="closed_won">Closing Lunas</option>
            </select>
          </div>

          <span className="text-[12px] text-[#64748b] font-medium self-end md:self-auto">
            Menampilkan <strong>{filteredLeads.length}</strong> leads
          </span>
        </div>

        {/* Clean Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="py-2.5 px-4 font-bold text-[#475467]">Pelanggan</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Instansi Bisnis</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Produk / Menu</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Nominal</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">CS Penanggung Jawab</th>
                <th className="py-2.5 px-4 font-bold text-[#475467]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f7]">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0f172a]">{lead.customerName}</div>
                    <div className="text-[11.5px] text-[#94a3b8] font-mono">{lead.phone}</div>
                  </td>
                  <td className="py-3 px-4 text-[#475467] font-medium">{lead.institutionName}</td>
                  <td className="py-3 px-4 text-[#475467]">{lead.product}</td>
                  <td className="py-3 px-4 font-extrabold text-[#0f172a]">
                    Rp {lead.value.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-[#475467]">{lead.assignedCs}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        lead.status === "closed_won"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : lead.status === "follow_up"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {lead.status === "closed_won"
                        ? "Closing Lunas"
                        : lead.status === "follow_up"
                        ? "Follow-up"
                        : "Lead Baru"}
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
