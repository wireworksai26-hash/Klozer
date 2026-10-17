"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  UsersIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DownloadIcon,
  BuildingIcon,
  SparklesIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
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
      source: "TikTok Click to WA",
      product: "Kain Batik Tulis Solo",
      value: 380000,
      riskScore: "45% (Sedang)",
      status: "follow_up",
      assignedCs: "Sarah Amalia",
      date: "29 Agu 2026, 17:40",
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
      riskScore: "12% (Aman)",
      status: "closed_won",
      assignedCs: "Budi Santoso",
      date: "29 Agu 2026, 16:15",
    },
    {
      id: "GL-903",
      customerName: "Clarissa Putri",
      phone: "+62 812-9988-4433",
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      source: "Instagram Reels Ads",
      product: "Kemeja Batik Sutra",
      value: 650000,
      riskScore: "8% (Sangat Aman)",
      status: "closed_won",
      assignedCs: "Sarah Amalia",
      date: "29 Agu 2026, 15:30",
    },
    {
      id: "GL-904",
      customerName: "Indah Permata",
      phone: "+62 878-4455-6677",
      institutionId: "INST-003",
      institutionName: "Kopi Kenangan Senja",
      source: "Facebook Feed Ads",
      product: "Espresso Blend 1kg",
      value: 195000,
      riskScore: "20% (Aman)",
      status: "new",
      assignedCs: "Rizky Ramadhan",
      date: "29 Agu 2026, 14:05",
    },
    {
      id: "GL-905",
      customerName: "Hendro Wijaya",
      phone: "+62 813-7766-5544",
      institutionId: "INST-002",
      institutionName: "Lumiere Skincare Official",
      source: "TikTok Shop Live",
      product: "Acne Clear Package",
      value: 420000,
      riskScore: "78% (Tinggi)",
      status: "rts_risk",
      assignedCs: "Dewi Lestari",
      date: "29 Agu 2026, 12:20",
    },
    {
      id: "GL-906",
      customerName: "Aisyah Zahra",
      phone: "+62 852-3344-5566",
      institutionId: "INST-004",
      institutionName: "Yayasan Peduli Ummat",
      source: "Google Search Ads",
      product: "Wakaf Al-Quran Pedalaman",
      value: 500000,
      riskScore: "5% (Aman)",
      status: "closed_won",
      assignedCs: "Ahmad Fauzi",
      date: "29 Agu 2026, 11:00",
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-micro font-bold uppercase tracking-wider bg-accent-100 text-accent-800 px-2.5 py-0.5 rounded-full border border-accent-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Superadmin Master Operasional</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Data Leads Global (Lintas Instansi)
          </h1>
          <p className="text-label text-fg-muted">
            Monitoring seluruh arus kontak calon pembeli WhatsApp dari seluruh tenant bisnis yang terdaftar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Mengunduh seluruh database leads platform ke format CSV/Excel...")}
          className="btn-primary !py-2.5 !px-4 text-label font-bold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Export All Leads</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-fg-subtle text-caption font-bold uppercase">
            <span>Total Leads Global</span>
            <UsersIcon className="w-4 h-4 text-brand" />
          </div>
          <div className="text-heading-md font-bold text-fg mt-2">18,429</div>
          <span className="text-micro font-bold text-success-600">Tersebar di 4 Tenant</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-fg-subtle text-caption font-bold uppercase">
            <span>Konversi Closed Won</span>
            <CheckCircleIcon className="w-4 h-4 text-success-600" />
          </div>
          <div className="text-heading-md font-bold text-fg mt-2">72.4%</div>
          <span className="text-micro font-bold text-success-600">+4.2% vs rata-rata industri</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-fg-subtle text-caption font-bold uppercase">
            <span>RTS Dicegah AI</span>
            <ShieldCheckIcon className="w-4 h-4 text-accent-600" />
          </div>
          <div className="text-heading-md font-bold text-fg mt-2">1,248 Order</div>
          <span className="text-micro font-bold text-accent-600">Efisiensi Rp 142 Jt</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-fg-subtle text-caption font-bold uppercase">
            <span>Rata-rata Respon Bot</span>
            <SparklesIcon className="w-4 h-4 text-warning-500" />
          </div>
          <div className="text-heading-md font-bold text-fg mt-2">1.8 Detik</div>
          <span className="text-micro font-bold text-success-600">NVIDIA NIM Ultra-Fast</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-line flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-[260px]">
            <input
              type="text"
              placeholder="Cari nama, WA, produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-label font-medium bg-sunken border border-line rounded-xl px-3.5 py-2 text-fg outline-none focus:border-brand"
            />
          </div>

          {/* Filter Tenant */}
          <div className="flex items-center gap-1.5 bg-sunken border border-line rounded-xl px-3 py-1.5">
            <BuildingIcon className="w-3.5 h-3.5 text-fg-subtle" />
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="bg-transparent text-caption font-bold text-fg outline-none cursor-pointer"
            >
              <option value="all">Semua Tenant Instansi</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 bg-sunken border border-line rounded-xl px-3 py-1.5">
            <span className="text-micro font-bold uppercase text-fg-subtle">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-caption font-bold text-fg outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="new">Lead Baru</option>
              <option value="follow_up">Sedang Follow-Up</option>
              <option value="closed_won">Closed / Lunas</option>
              <option value="rts_risk">Resiko RTS COD</option>
            </select>
          </div>
        </div>

        <div className="text-caption font-bold text-fg-subtle self-end md:self-auto">
          Menampilkan <span className="text-brand">{filteredLeads.length}</span> dari {mockGlobalLeads.length} Leads
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID & Kontak</th>
              <th>Tenant Instansi</th>
              <th>Sumber Iklan & Minat Produk</th>
              <th>Est. Nilai</th>
              <th>Skor Resiko COD</th>
              <th>Status & CS Assigned</th>
              <th>Waktu Masuk</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-soft transition-colors">
                <td>
                  <div className="font-bold text-fg text-label">{lead.customerName}</div>
                  <div className="text-caption text-fg-muted font-mono">{lead.phone}</div>
                </td>
                <td>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-bold bg-accent-50 text-accent-700 border border-accent-100">
                    <BuildingIcon className="w-3 h-3" />
                    <span>{lead.institutionName}</span>
                  </span>
                </td>
                <td>
                  <div className="text-label font-semibold text-fg">{lead.product}</div>
                  <div className="text-micro text-fg-subtle">{lead.source}</div>
                </td>
                <td>
                  <div className="font-bold text-fg text-label">
                    Rp {lead.value.toLocaleString("id-ID")}
                  </div>
                </td>
                <td>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-bold ${
                      lead.status === "rts_risk"
                        ? "bg-danger-100 text-danger-700 border border-danger-200"
                        : "bg-success-100 text-success-700 border border-success-200"
                    }`}
                  >
                    {lead.status === "rts_risk" ? (
                      <AlertTriangleIcon className="w-3 h-3" />
                    ) : (
                      <CheckCircleIcon className="w-3 h-3" />
                    )}
                    <span>{lead.riskScore}</span>
                  </span>
                </td>
                <td>
                  <div className="mb-1">
                    {lead.status === "closed_won" && (
                      <span className="badge badge-success text-micro">Closed / Lunas</span>
                    )}
                    {lead.status === "follow_up" && (
                      <span className="badge badge-warning text-micro">Follow-Up CS</span>
                    )}
                    {lead.status === "new" && (
                      <span className="badge badge-info text-micro">Lead Baru</span>
                    )}
                    {lead.status === "rts_risk" && (
                      <span className="badge badge-danger text-micro">Mitigasi RTS</span>
                    )}
                  </div>
                  <div className="text-micro text-fg-subtle">CS: {lead.assignedCs}</div>
                </td>
                <td>
                  <span className="text-caption text-fg-muted">{lead.date}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
