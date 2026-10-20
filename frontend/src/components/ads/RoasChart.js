"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";

/** "2,4x" or "-" when there is nothing to divide by. */
export function useRoasText() {
  const { locale } = useDashboard();
  return (n) => (n === null || n === undefined ? "-" : `${Number(n).toLocaleString(locale, { maximumFractionDigits: 2 })}x`);
}

/** The row's label: the name, else the id, else what an empty id means in this grouping. */
export function useRowLabel(groupBy) {
  const { t } = useDashboard();
  const f = useFormat();
  return (row) => {
    if (groupBy === "day") return f.date(row.id);
    if (row.name) return row.name;
    if (row.id) return row.id;
    return groupBy === "ad" ? t("Iklan tanpa catatan biaya") : t("Kampanye tanpa catatan biaya");
  };
}

/** ROAS of each campaign (or ad) as a horizontal bar. A row with no spend has no ROAS: it shows "-" and no bar. */
function RoasBars({ rows, groupBy }) {
  const { t } = useDashboard();
  const roasText = useRoasText();
  const label = useRowLabel(groupBy);
  const shown = rows.slice(0, 10);
  const max = Math.max(...shown.map((r) => r.roas || 0), 0);
  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-3" aria-label={groupBy === "ad" ? t("ROAS per iklan") : t("ROAS per kampanye")}>
      {shown.map((r) => (
        <li key={`${r.id}-${r.campaignId || ""}`} className="grid grid-cols-1 sm:grid-cols-[minmax(0,14rem)_1fr_4rem] gap-x-4 gap-y-1 items-center">
          <span className="text-label text-fg break-words">{label(r)}</span>
          <span className="h-3 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-full bg-brand" style={{ width: max > 0 && r.roas ? `${Math.max(2, Math.round((r.roas / max) * 100))}%` : "0%" }} />
          </span>
          <span className="text-label font-bold text-fg tabular-nums sm:text-right">{roasText(r.roas)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Revenue and spend of each day, side by side. The table under the chart carries the same numbers. */
function DayBars({ rows }) {
  const { t } = useDashboard();
  const f = useFormat();
  const max = Math.max(...rows.map((r) => Math.max(r.revenue, r.spend)), 0);
  const pct = (n) => (max > 0 ? `${Math.round((n / max) * 100)}%` : "0%");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-label text-fg-muted">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-brand" aria-hidden="true" />
          {t("Omzet dari iklan")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-line-strong" aria-hidden="true" />
          {t("Biaya iklan")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 h-40 min-w-max border-b border-line" role="img" aria-label={t("Omzet dari iklan dan biaya iklan per hari. Angkanya ada di tabel di bawah.")}>
          {rows.map((r) => (
            <div key={r.id} className="flex items-end gap-px h-full w-5" title={`${f.date(r.id)}: ${f.rupiah(r.revenue)} / ${f.rupiah(r.spend)}`}>
              <span className="block w-1/2 rounded-t-sm bg-brand" style={{ height: pct(r.revenue) }} />
              <span className="block w-1/2 rounded-t-sm bg-line-strong" style={{ height: pct(r.spend) }} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-caption text-fg-subtle tabular-nums">
        <span>{f.date(rows[0].id)}</span>
        <span>{f.date(rows[rows.length - 1].id)}</span>
      </div>
    </div>
  );
}

export default function RoasChart({ rows, groupBy }) {
  if (!rows.length) return null;
  return groupBy === "day" ? <DayBars rows={rows} /> : <RoasBars rows={rows} groupBy={groupBy} />;
}
