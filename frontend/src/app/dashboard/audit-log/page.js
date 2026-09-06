"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  ClipboardCheckIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  UsersIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export default function SupervisorAuditLogPage() {
  const { currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [filterAction, setFilterAction] = useState("all");

  const logs = isDefaultDemo
    ? [
        {
          id: "LOG-901",
          staff: "Rian Supervisor",
          role: "Supervisor (SPV)",
          action: "TAKEOVER_CHAT",
          details: "Mengambil alih percakapan WhatsApp dari AI",
          ip: "103.119.214.12",
          timestamp: "29 Agu 2026, 17:45",
        },
      ]
    : [
        {
          id: "LOG-001",
          staff: currentUser?.name || "Supervisor",
          role: "Supervisor (SPV)",
          action: "TENANT_INITIALIZATION",
          details: `Inisialisasi akun workspace bisnis ${cleanInstName} berhasil`,
          ip: "127.0.0.1",
          timestamp: "Hari ini",
        },
      ];

  const filtered = logs.filter((l) => {
    if (filterAction === "all") return true;
    return l.action === filterAction;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <ClipboardCheckIcon className="w-3.5 h-3.5" />
              <span>Audit Trail & Keamanan Sistem</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Log Audit Aktivitas Staf & CS
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Rekam jejak seluruh aktivitas staf (login, ubah harga/stok, approval diskon, ekspor data, takeover chat).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-bold flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
            <span>Immutable Audit Trail: AKTIF</span>
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-[#ede8e2] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-[#8f95a8]">Filter Tipe Aksi:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-1.5 text-[12.5px] font-bold text-[#1e2640] outline-none cursor-pointer"
          >
            <option value="all">Semua Aktivitas Staf</option>
            <option value="TAKEOVER_CHAT">Takeover Chat</option>
            <option value="UPDATE_STATUS_ORDER">Update Status Order</option>
            <option value="MANUAL_SETTLEMENT_APPROVAL">Approval Finansial</option>
            <option value="EXPORT_LEADS">Ekspor Data Kontak</option>
            <option value="UPDATE_STOCK">Penyesuaian Stok</option>
          </select>
        </div>

        <span className="text-[12.5px] font-bold text-[#8f95a8]">
          Total Log: <span className="text-[#2545ff]">{filtered.length}</span>
        </span>
      </div>

      {/* Log Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Staf & Jabatan</th>
              <th>Tipe Aktivitas</th>
              <th>Rincian Tindakan</th>
              <th>IP Address</th>
              <th>Waktu Kejadian</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-[#fcfbf9] transition-colors">
                <td>
                  <div className="font-bold text-[#1e2640] text-[13.5px]">{log.staff}</div>
                  <div className="text-[11px] text-purple-700 font-semibold">{log.role}</div>
                </td>
                <td>
                  <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#f5f4f2] border border-[#ede8e2] text-[#1e2640]">
                    {log.action}
                  </span>
                </td>
                <td>
                  <span className="text-[13px] text-[#5a6380] leading-relaxed">{log.details}</span>
                </td>
                <td>
                  <span className="text-[12px] font-mono text-[#8f95a8]">{log.ip}</span>
                </td>
                <td>
                  <span className="text-[12px] font-medium text-[#1e2640]">{log.timestamp}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
