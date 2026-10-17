"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { DollarSignIcon, DownloadIcon } from "@/components/icons";
import { PAID_STATUSES } from "@/utils/mappers.mjs";
import { downloadCsv } from "@/utils/download";

const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;

export default function FinancePage() {
  const { orders, currentUser, activeInstitution, updateOrderStatus, serverRole } = useDashboard();
  const name = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const [tab, setTab] = useState("paid");
  const [busyId, setBusyId] = useState(null);

  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const waiting = orders.filter((o) => o.status === "waiting_payment");
  const totalIn = paid.reduce((a, o) => a + o.total, 0);
  const totalWaiting = waiting.reduce((a, o) => a + o.total, 0);
  const rows = tab === "paid" ? paid : waiting;
  const canConfirm = ["owner", "supervisor", "finance", "superadmin"].includes(serverRole);

  const confirmPayment = async (o) => {
    setBusyId(o.dbId);
    await updateOrderStatus(o.id, "paid");
    setBusyId(null);
  };

  const exportCsv = () =>
    downloadCsv(`kas_masuk_${new Date().toISOString().slice(0, 10)}.csv`, ["No. Pesanan", "Tanggal", "Pelanggan", "Metode", "Status", "Nominal"], paid.map((o) => [o.id, o.date, o.customer, o.paymentMethod, o.status, o.total]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Keuangan dan Arus Kas Masuk</h1>
          <p className="text-body-sm text-fg-muted">Pembayaran pesanan {name}. QRIS terverifikasi otomatis oleh iPaymu; transfer manual dikonfirmasi di sini.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!paid.length} className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2 cursor-pointer self-start disabled:opacity-50">
          <DownloadIcon className="w-4 h-4" />
          <span>Ekspor Kas Masuk (CSV)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Total Pemasukan", rp(totalIn), `${paid.length} pesanan lunas`, "text-emerald-700"],
          ["Menunggu Pembayaran", rp(totalWaiting), `${waiting.length} pesanan belum dibayar`, "text-amber-700"],
          ["Rata-rata per Pesanan", rp(paid.length ? totalIn / paid.length : 0), "Dari pesanan lunas", "text-brand"],
        ].map(([k, v, sub, tone]) => (
          <div key={k} className="bg-white p-5 rounded-2xl border border-line">
            <div className="text-fg-subtle text-label font-bold uppercase mb-1">{k}</div>
            <div className={`text-heading-md font-bold ${tone}`}>{v}</div>
            <span className="text-caption text-fg-muted">{sub}</span>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-line">
        <div className="flex items-center gap-2 mb-4">
          {[
            ["paid", `Sudah Dibayar (${paid.length})`],
            ["waiting", `Menunggu Bayar (${waiting.length})`],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-body-sm font-bold border-none cursor-pointer ${tab === key ? "bg-brand text-white" : "bg-canvas text-fg-muted"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-canvas border-b border-line text-label font-bold uppercase text-fg-muted">
                <th className="py-3 px-4">Pesanan</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">{tab === "paid" ? "Status" : "Aksi"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-fg-muted">
                    <div className="flex flex-col items-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mb-2">
                        <DollarSignIcon className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-ink">{tab === "paid" ? "Belum ada pembayaran masuk" : "Tidak ada pesanan yang menunggu pembayaran"}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.dbId} className="hover:bg-soft">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-fg font-mono">{o.id}</div>
                      <div className="text-caption text-fg-subtle">{o.date}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-fg">{o.customer}</td>
                    <td className="py-3.5 px-4 text-fg-muted">{o.paymentMethod}</td>
                    <td className="py-3.5 px-4 font-bold text-fg">{rp(o.total)}</td>
                    <td className="py-3.5 px-4">
                      {tab === "paid" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Lunas</span>
                      ) : canConfirm ? (
                        <button disabled={busyId === o.dbId} onClick={() => confirmPayment(o)} className="px-3 py-1 text-caption font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-200 cursor-pointer disabled:opacity-50">
                          {busyId === o.dbId ? "Memproses..." : "Konfirmasi Sudah Dibayar"}
                        </button>
                      ) : (
                        <span className="text-caption text-fg-muted">Menunggu pembayaran</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
