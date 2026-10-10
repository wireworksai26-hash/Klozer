"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/utils/api";

const RANGES = [
  ["24h", "24 jam"],
  ["7d", "7 hari"],
  ["30d", "30 hari"],
];
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

export default function TokenUsagePage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api.get("/ai/token-usage", { query: { range } }));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [range]);

  useEffect(() => {
    // Refetch when the range changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const logs = (data?.recentLogs || []).filter((l) => !search || l.tenantName.toLowerCase().includes(search.toLowerCase()) || l.model.toLowerCase().includes(search.toLowerCase()));
  const m = data?.metrics;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Pemakaian Token AI</h1>
          <p className="text-body-sm text-fg-muted">Dihitung dari catatan pemakaian yang tersimpan setiap AI membalas. Biaya adalah estimasi berdasarkan tarif model.</p>
        </div>
        <div className="flex gap-1 bg-white border border-line rounded-xl p-1">
          {RANGES.map(([key, label]) => (
            <button key={key} onClick={() => setRange(key)} className={`px-3 py-1.5 rounded-lg text-body-sm font-bold border-none cursor-pointer ${range === key ? "bg-brand text-white" : "bg-transparent text-fg-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{error}</div>}
      {!data && !error && <div className="text-fg-muted">Memuat...</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Permintaan AI", fmt(m.requests)],
              ["Total token", fmt(m.totalTokens)],
              ["Estimasi biaya", rupiah(m.costIdr)],
              ["Latensi rata-rata", `${fmt(m.avgLatencyMs)} ms`],
            ].map(([k, v]) => (
              <div key={k} className="bg-white p-5 rounded-2xl border border-line">
                <div className="text-label font-bold text-fg-muted uppercase">{k}</div>
                <div className="text-heading-md font-bold text-ink mt-1">{v}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-line overflow-x-auto">
            <div className="px-5 py-4 border-b border-line font-bold text-ink">Per model</div>
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="bg-canvas text-label font-bold uppercase text-fg-muted">
                  <th className="py-2.5 px-5">Model</th>
                  <th className="py-2.5 px-5">Permintaan</th>
                  <th className="py-2.5 px-5">Token</th>
                  <th className="py-2.5 px-5">Latensi</th>
                  <th className="py-2.5 px-5">Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.modelBreakdown.map((x) => (
                  <tr key={x.name}>
                    <td className="py-2.5 px-5 font-mono text-label">{x.name}</td>
                    <td className="py-2.5 px-5">{fmt(x.requests)}</td>
                    <td className="py-2.5 px-5">{fmt(x.totalTokens)}</td>
                    <td className="py-2.5 px-5">{fmt(x.avgLatencyMs)} ms</td>
                    <td className="py-2.5 px-5">{rupiah(x.costIdr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.modelBreakdown.length === 0 && <div className="py-6 text-center text-fg-muted">Belum ada pemakaian pada rentang ini.</div>}
          </div>

          <div className="bg-white rounded-2xl border border-line overflow-x-auto">
            <div className="px-5 py-4 border-b border-line font-bold text-ink">Kuota per tenant</div>
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="bg-canvas text-label font-bold uppercase text-fg-muted">
                  <th className="py-2.5 px-5">Tenant</th>
                  <th className="py-2.5 px-5">Terpakai / Kuota</th>
                  <th className="py-2.5 px-5">Permintaan ({range})</th>
                  <th className="py-2.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.tenantBreakdown.map((t) => (
                  <tr key={t.institutionId}>
                    <td className="py-2.5 px-5 font-bold text-ink">{t.institutionName}</td>
                    <td className="py-2.5 px-5 min-w-[220px]">
                      <div className="text-caption text-fg-muted mb-1">
                        {fmt(t.consumedTokens)} / {fmt(t.totalQuota)} ({t.quotaUsedPercent}%)
                      </div>
                      <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                        <div className={`h-full ${t.status === "exhausted" ? "bg-rose-500" : t.status === "high_usage" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, t.quotaUsedPercent)}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 px-5">{fmt(t.requests)}</td>
                    <td className="py-2.5 px-5">{t.status === "exhausted" ? "Habis" : t.status === "high_usage" ? "Hampir habis" : "Normal"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-line overflow-x-auto">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
              <span className="font-bold text-ink">60 permintaan terakhir</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tenant atau model..." className="bg-canvas border border-line rounded-lg px-3 py-1.5 text-body-sm outline-none" />
            </div>
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="bg-canvas text-label font-bold uppercase text-fg-muted">
                  <th className="py-2.5 px-5">Waktu</th>
                  <th className="py-2.5 px-5">Tenant</th>
                  <th className="py-2.5 px-5">Jenis</th>
                  <th className="py-2.5 px-5">Model</th>
                  <th className="py-2.5 px-5">Token</th>
                  <th className="py-2.5 px-5">Latensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 px-5 whitespace-nowrap text-fg-muted">{new Date(l.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" })}</td>
                    <td className="py-2 px-5">{l.tenantName}</td>
                    <td className="py-2 px-5">{l.type}</td>
                    <td className="py-2 px-5 font-mono text-label">{l.model}</td>
                    <td className="py-2 px-5">{fmt(l.totalTokens)}</td>
                    <td className="py-2 px-5">{fmt(l.latencyMs)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div className="py-6 text-center text-fg-muted">Belum ada log.</div>}
          </div>
        </>
      )}
    </div>
  );
}
