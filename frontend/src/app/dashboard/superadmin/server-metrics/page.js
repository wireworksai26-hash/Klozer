"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/utils/api";
import { useDashboard } from "@/context/DashboardContext";

const duration = (s, t) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? t("{d}h {h}j", { d, h }) : h ? t("{h}j {m}m", { h, m }) : t("{m}m", { m });
};

function Gauge({ label, percent, detail }) {
  const tone = percent >= 90 ? "bg-danger-500" : percent >= 70 ? "bg-warning-500" : "bg-success-500";
  return (
    <div className="bg-white p-5 rounded-2xl border border-line">
      <div className="flex items-baseline justify-between">
        <span className="text-label font-bold text-fg-muted uppercase">{label}</span>
        <span className="text-heading-md font-bold text-ink">{percent}%</span>
      </div>
      <div className="h-2 bg-canvas rounded-full overflow-hidden mt-3">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="text-caption text-fg-muted mt-2">{detail}</div>
    </div>
  );
}

export default function ServerMetricsPage() {
  const { t, locale } = useDashboard();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get("/system/metrics"));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial scan on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    scan();
  }, [scan]);

  useEffect(() => {
    if (!auto) return undefined;
    const timer = setInterval(scan, 15000);
    return () => clearInterval(timer);
  }, [auto, scan]);

  const db = data?.database;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t("Kesehatan Server")}</h1>
          <p className="text-body-sm text-fg-muted">{t("Metrik langsung dari server yang menjalankan API.")}{data ? ` ${t("Diperbarui {time}.", { time: new Date(data.scannedAt).toLocaleTimeString(locale) })}` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-body-sm font-semibold text-fg-muted cursor-pointer">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            {t("Auto-refresh 15 dtk")}
          </label>
          <button onClick={scan} disabled={loading} className="btn-primary !py-2 !px-4 text-body-sm font-bold disabled:opacity-60">
            {loading ? t("Memindai...") : t("Pindai Sekarang")}
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 font-semibold">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Gauge label="CPU" percent={data.cpu.usagePercent} detail={`${data.cpu.cores} core • load ${data.cpu.loadAverage.join(" / ")}`} />
            <Gauge label={t("Memori")} percent={data.memory.usagePercent} detail={t("{used} / {total} GB • proses {rss} MB", { used: data.memory.usedGb, total: data.memory.totalGb, rss: data.memory.processRssMb })} />
            <div className="bg-white p-5 rounded-2xl border border-line">
              <div className="flex items-baseline justify-between">
                <span className="text-label font-bold text-fg-muted uppercase">Database</span>
                <span className={`px-2.5 py-0.5 rounded-full text-caption font-bold ${db.status === "connected" ? "bg-success-100 text-success-800" : "bg-danger-100 text-danger-800"}`}>{db.status === "connected" ? t("Terhubung") : t("Terputus")}</span>
              </div>
              <div className="text-heading-md font-bold text-ink mt-2">{db.latencyMs ?? "-"} ms</div>
              <div className="text-caption text-fg-muted mt-1">{t("{threads} koneksi aktif • pool maks {max}", { threads: db.threadsConnected ?? "-", max: db.maxPoolSize })}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-line grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-body-sm">
            {[
              ["Sistem operasi", data.platform.os],
              ["Hostname", data.platform.hostname],
              ["Node.js", data.platform.nodeVersion],
              ["Environment", data.platform.environment],
              ["Uptime host", duration(data.platform.hostUptimeSeconds, t)],
              ["Uptime proses API", duration(data.platform.processUptimeSeconds, t)],
              ["Model CPU", data.cpu.model],
              ["Heap proses", `${data.memory.processHeapUsedMb} MB`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                <span className="text-fg-muted">{t(k)}</span>
                <span className="font-semibold text-ink text-right break-all">{v}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!data && !error && <div className="text-fg-muted">{t("Memindai server...")}</div>}
    </div>
  );
}
