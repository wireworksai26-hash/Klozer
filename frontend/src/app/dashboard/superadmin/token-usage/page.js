"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  CpuIcon,
  CrownIcon,
  ZapIcon,
  SparklesIcon,
  BuildingIcon,
  DollarSignIcon,
  ActivityIcon,
} from "@/components/icons";

export default function SuperadminTokenUsagePage() {
  const { institutions } = useDashboard();
  const [timeRange, setTimeRange] = useState("30d");

  const tenantTokenUsage = [
    {
      institutionId: "INST-001",
      institutionName: "Batik Mahakarya Solo",
      primaryModel: "NVIDIA NIM (Llama 3.3 70B)",
      promptTokens: 4200000,
      completionTokens: 2150000,
      totalTokens: 6350000,
      quotaUsed: "78%",
      voiceNotesTranscribed: 1420,
      costEstimate: "Rp 381,000",
      status: "normal",
    },
    {
      institutionId: "INST-002",
      institutionName: "Lumiere Skincare Official",
      primaryModel: "NVIDIA NIM (Llama 3.3 70B)",
      promptTokens: 2800000,
      completionTokens: 1400000,
      totalTokens: 4200000,
      quotaUsed: "92%",
      voiceNotesTranscribed: 3890,
      costEstimate: "Rp 252,000",
      status: "high_usage",
    },
    {
      institutionId: "INST-004",
      institutionName: "Yayasan Peduli Ummat",
      primaryModel: "NVIDIA NIM (Llama 3.3 70B)",
      promptTokens: 1900000,
      completionTokens: 950000,
      totalTokens: 2850000,
      quotaUsed: "57%",
      voiceNotesTranscribed: 840,
      costEstimate: "Rp 171,000",
      status: "normal",
    },
    {
      institutionId: "INST-003",
      institutionName: "Kopi Kenangan Senja",
      primaryModel: "OpenAI GPT-4o-mini",
      promptTokens: 900000,
      completionTokens: 520000,
      totalTokens: 1420000,
      quotaUsed: "45%",
      voiceNotesTranscribed: 320,
      costEstimate: "Rp 85,000",
      status: "normal",
    },
  ];

  const modelBreakdown = [
    {
      name: "NVIDIA NIM (Llama 3.3 70B)",
      type: "Primary Chat Engine",
      tokens: "13.4M (88%)",
      latency: "18ms / token",
      costPerMillion: "Rp 12,000 / 1M token",
      badge: "Utama",
    },
    {
      name: "OpenAI GPT-4o (Fallback Engine)",
      type: "Failover Fallback",
      tokens: "1.4M (12%)",
      latency: "45ms / token",
      costPerMillion: "Rp 80,000 / 1M token",
      badge: "Fallback",
    },
    {
      name: "Whisper Large v3 (NVIDIA)",
      type: "Voice Note Audio STT",
      tokens: "6,470 Audio Messages",
      latency: "1.1s / audio",
      costPerMillion: "Rp 95 / menit audio",
      badge: "Speech to Text",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Superadmin Monitoring AI</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Konsumsi Token AI & Biaya Operasional LLM
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Analitik konsumsi token NVIDIA NIM & OpenAI lintas tenant instansi, rasio prompt/completion, dan efisiensi biaya.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-[#ede8e2] rounded-xl p-1 shadow-xs self-start sm:self-auto">
          {["7d", "30d", "90d"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer transition-all ${
                timeRange === r
                  ? "bg-[#2545ff] text-white"
                  : "bg-transparent text-[#5a6380] hover:text-[#1e2640]"
              }`}
            >
              {r === "7d" ? "7 Hari" : r === "30d" ? "30 Hari" : "90 Hari"}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Total Token Terkonsumsi</span>
            <CpuIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">14.82 Juta</div>
          <span className="text-[11.5px] font-bold text-emerald-600">88% via NVIDIA NIM</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Est. Biaya Operasional AI</span>
            <DollarSignIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-extrabold text-emerald-700 mt-2">Rp 889,000</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Hemat 65% vs Pure OpenAI</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Rata-Rata Latensi Respon</span>
            <ZapIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">18.2 ms</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Ultra Low Latency Streaming</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Voice Note Diterjemahkan</span>
            <SparklesIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">6,470 Audio</div>
          <span className="text-[11.5px] font-bold text-purple-600">Akurasi STT 99.1%</span>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Distribusi Mesin Model AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modelBreakdown.map((m) => (
            <div key={m.name} className="p-4 rounded-xl border border-[#ede8e2] bg-[#fcfbf9]">
              <div className="flex items-center justify-between mb-2">
                <span className="badge badge-lavender text-[11px]">{m.badge}</span>
                <span className="text-[11.5px] font-mono text-[#8f95a8]">{m.latency}</span>
              </div>
              <div className="font-bold text-[#1e2640] text-[14px]">{m.name}</div>
              <div className="text-[12px] text-[#5a6380] mb-3">{m.type}</div>
              <div className="pt-2 border-t border-[#ede8e2] flex items-center justify-between text-[12px]">
                <span className="text-[#8f95a8]">Konsumsi:</span>
                <span className="font-bold text-[#2545ff]">{m.tokens}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] mt-1">
                <span className="text-[#8f95a8]">Tarif Satuan:</span>
                <span className="font-semibold text-[#1e2640]">{m.costPerMillion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Tenant Consumption Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Pemakaian Token Per Tenant Instansi</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tenant Instansi</th>
                <th>Engine Utama</th>
                <th>Prompt Tokens</th>
                <th>Completion Tokens</th>
                <th>Total Tokens</th>
                <th>Voice Note STT</th>
                <th>Est. Biaya</th>
              </tr>
            </thead>
            <tbody>
              {tenantTokenUsage.map((t) => (
                <tr key={t.institutionId} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13.5px]">{t.institutionName}</div>
                    <div className="text-[11.5px] text-[#8f95a8] font-mono">{t.institutionId}</div>
                  </td>
                  <td>
                    <span className="text-[12.5px] font-semibold text-[#1e2640]">{t.primaryModel}</span>
                  </td>
                  <td>
                    <span className="text-[13px] text-[#5a6380] font-mono">{t.promptTokens.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className="text-[13px] text-[#5a6380] font-mono">{t.completionTokens.toLocaleString()}</span>
                  </td>
                  <td>
                    <div className="font-extrabold text-[#2545ff] text-[13.5px] font-mono">
                      {t.totalTokens.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#8f95a8]">Kuota: {t.quotaUsed}</div>
                  </td>
                  <td>
                    <span className="text-[12.5px] font-bold text-[#1e2640]">{t.voiceNotesTranscribed} VN</span>
                  </td>
                  <td>
                    <span className="font-extrabold text-emerald-700 text-[13px]">{t.costEstimate}</span>
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
