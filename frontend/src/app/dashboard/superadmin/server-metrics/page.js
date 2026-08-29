"use client";
import { useState, useEffect } from "react";
import {
  ActivityIcon,
  CrownIcon,
  CheckCircleIcon,
  ZapIcon,
  DatabaseIcon,
  ServerIcon,
  CpuIcon,
  RefreshCwIcon,
} from "@/components/icons";

export default function SuperadminServerMetricsPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString("id-ID"));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [metrics, setMetrics] = useState({
    cpu: 28,
    ramUsedGb: 6.2,
    ramTotalGb: 16,
    diskUsedGb: 142,
    diskTotalGb: 500,
    dbConnections: 24,
    dbMaxConnections: 100,
    dbLatencyMs: 2.4,
    redisHitRatio: 96.8,
    webhookThroughput: 124,
    uptimeDays: 48,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setMetrics((prev) => ({
        ...prev,
        cpu: Math.floor(Math.random() * 15) + 20,
        ramUsedGb: +(Math.random() * 0.5 + 6.0).toFixed(1),
        dbConnections: Math.floor(Math.random() * 10) + 20,
        webhookThroughput: Math.floor(Math.random() * 30) + 110,
      }));
      setLastUpdated(new Date().toLocaleTimeString("id-ID"));
      setIsRefreshing(false);
    }, 600);
  };

  const nodes = [
    {
      id: "node-api-01",
      name: "API & Webhook Gateway Ingress",
      location: "Jakarta IDC 3 (DCI Cibitung)",
      role: "Node.js / Next.js Production Cluster",
      cpu: `${metrics.cpu}%`,
      ram: `${metrics.ramUsedGb} GB / 16 GB`,
      status: "healthy",
      latency: "12ms",
    },
    {
      id: "node-ai-02",
      name: "NVIDIA NIM AI Inference Proxy",
      location: "AWS ap-southeast-3 (Jakarta)",
      role: "LLM Streaming & Audio Whisper Engine",
      cpu: "42%",
      ram: "11.4 GB / 32 GB",
      status: "healthy",
      latency: "18ms",
    },
    {
      id: "node-db-01",
      name: "PostgreSQL 16 Primary Cluster",
      location: "Jakarta IDC 3 (DCI Cibitung)",
      role: "ACID Relational Core & Multi-Tenant Data",
      cpu: "18%",
      ram: "8.1 GB / 32 GB",
      status: "healthy",
      latency: "2.4ms",
    },
    {
      id: "node-redis-01",
      name: "Redis 7 Sentinel & Queue",
      location: "Jakarta IDC 3 (DCI Cibitung)",
      role: "Session Cache, Token Bucket Rate Limiter",
      cpu: "8%",
      ram: "2.4 GB / 8 GB",
      status: "healthy",
      latency: "0.8ms",
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
              <span>Superadmin Infrastruktur Platform</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Metrik Server & Kesehatan Infrastruktur
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Monitoring beban CPU, RAM, koneksi Database PostgreSQL, throughput Webhook WhatsApp, dan latensi sistem.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#8f95a8]">Update: {lastUpdated}</span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#ede8e2] text-[#1e2640] hover:bg-[#f5f4f2] text-[13px] font-bold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh Metrik</span>
          </button>
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>CPU Utilization</span>
            <CpuIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#1e2640] mt-2">{metrics.cpu}%</div>
          <div className="w-full h-2 bg-[#ede8e2] rounded-full overflow-hidden my-2">
            <div
              className={`h-full rounded-full transition-all ${
                metrics.cpu > 80 ? "bg-rose-500" : metrics.cpu > 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${metrics.cpu}%` }}
            />
          </div>
          <span className="text-[11.5px] font-bold text-emerald-600">8 Cores vCPU (Load Aman)</span>
        </div>

        {/* RAM */}
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>RAM Memory Usage</span>
            <ActivityIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[28px] font-extrabold text-[#1e2640] mt-2">
            {metrics.ramUsedGb} <span className="text-[16px] text-[#8f95a8]">/ {metrics.ramTotalGb} GB</span>
          </div>
          <div className="w-full h-2 bg-[#ede8e2] rounded-full overflow-hidden my-2">
            <div
              className="h-full bg-purple-600 rounded-full transition-all"
              style={{ width: `${(metrics.ramUsedGb / metrics.ramTotalGb) * 100}%` }}
            />
          </div>
          <span className="text-[11.5px] font-bold text-purple-600">38.7% Terpakai (Buffer 9.8 GB)</span>
        </div>

        {/* DB Connection */}
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>DB Connections</span>
            <DatabaseIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[28px] font-extrabold text-[#1e2640] mt-2">
            {metrics.dbConnections} <span className="text-[16px] text-[#8f95a8]">/ {metrics.dbMaxConnections} Pool</span>
          </div>
          <div className="w-full h-2 bg-[#ede8e2] rounded-full overflow-hidden my-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(metrics.dbConnections / metrics.dbMaxConnections) * 100}%` }}
            />
          </div>
          <span className="text-[11.5px] font-bold text-emerald-600">Query Latency: {metrics.dbLatencyMs}ms</span>
        </div>

        {/* Disk NVMe */}
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>NVMe Storage</span>
            <ServerIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[28px] font-extrabold text-[#1e2640] mt-2">
            {metrics.diskUsedGb} <span className="text-[16px] text-[#8f95a8]">/ {metrics.diskTotalGb} GB</span>
          </div>
          <div className="w-full h-2 bg-[#ede8e2] rounded-full overflow-hidden my-2">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${(metrics.diskUsedGb / metrics.diskTotalGb) * 100}%` }}
            />
          </div>
          <span className="text-[11.5px] font-bold text-emerald-600">Sisa 358 GB Tersedia</span>
        </div>
      </div>

      {/* Network & Ingress Banner */}
      <div className="bg-[#1e2640] text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ZapIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-[16px]">Meta Webhook Ingress: {metrics.webhookThroughput} req/sec</div>
            <div className="text-[12.5px] text-gray-300">
              Redis Hit Rate: {metrics.redisHitRatio}% | Uptime: {metrics.uptimeDays} Hari Tanpa Downtime (99.99%)
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert("Mengunduh bundle log diagnostik server...")}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12.5px] font-bold border border-white/20 cursor-pointer"
        >
          Download Diagnostics Bundle
        </button>
      </div>

      {/* Node Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Node Server & Cluster Health</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama Node & Lokasi</th>
                <th>Peran Sistem</th>
                <th>Beban CPU</th>
                <th>Alokasi RAM</th>
                <th>Latensi Jaringan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13.5px]">{node.name}</div>
                    <div className="text-[11.5px] text-[#8f95a8]">{node.location}</div>
                  </td>
                  <td>
                    <span className="text-[12.5px] font-semibold text-[#5a6380]">{node.role}</span>
                  </td>
                  <td>
                    <span className="text-[13px] font-bold text-[#1e2640]">{node.cpu}</span>
                  </td>
                  <td>
                    <span className="text-[13px] font-mono text-[#5a6380]">{node.ram}</span>
                  </td>
                  <td>
                    <span className="text-[12.5px] font-mono text-emerald-600 font-bold">{node.latency}</span>
                  </td>
                  <td>
                    <span className="badge badge-success text-[11px] flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>Healthy</span>
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
