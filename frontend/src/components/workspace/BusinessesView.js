"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Button, EmptyState, PageHeader, Select, TableShell } from "@/components/ui";
import ChangeChip from "./ChangeChip";
import { switchBusiness } from "./switchBusiness";

const RANGES = [7, 30, 90];
const TIER = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };

/** What is open in one business, as one short line. */
function openWork(b, t) {
  const parts = [
    b.proofsToCheck && t("{count} bukti perlu dicek", { count: b.proofsToCheck }),
    b.chatsForTeam && t("{count} chat menunggu tim", { count: b.chatsForTeam }),
    b.overdueTasks && t("{count} tugas lewat tenggat", { count: b.overdueTasks }),
    b.waitingPayment && t("{count} menunggu bayar", { count: b.waitingPayment }),
    b.lowStock && t("{count} stok menipis", { count: b.lowStock }),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : t("Tidak ada");
}

/** AI tokens left in one business, as a thin bar and the numbers. The bar turns red only when little is left. */
function TokenBar({ left, quota }) {
  const { t } = useDashboard();
  const { number } = useFormat();
  const pct = quota > 0 ? Math.min(100, Math.round((left / quota) * 100)) : 0;
  const low = quota > 0 && pct < 15;
  return (
    <div className="min-w-[130px]">
      <div className="text-label tabular-nums text-fg">{t("{left} dari {quota}", { left: number(left), quota: number(quota) })}</div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-sunken overflow-hidden" role="img" aria-label={t("{pct}% token tersisa", { pct })}>
        <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${low ? "bg-danger-500" : "bg-brand"}`} />
      </div>
    </div>
  );
}

/** Each business of the workspace in one row: how it is doing, what it has left of its AI tokens, and its open work. */
export default function BusinessesView() {
  const { t, notify } = useDashboard();
  const { rupiah, number, relative } = useFormat();
  const [days, setDays] = useState(30);
  const query = useApi("/workspace/businesses", { query: { days } });

  const open = async (id, path = "/dashboard") => {
    try {
      await switchBusiness(id, path);
    } catch (err) {
      notify("error", err.message || t("Gagal berpindah bisnis."));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("Bisnis")}
        description={t("Kondisi tiap bisnis dibanding {days} hari sebelumnya, sisa token AI, dan pekerjaan yang terbuka.", { days })}
        actions={
          <label className="flex items-center gap-2 text-label text-fg-muted">
            {t("Periode")}
            <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="!w-auto !py-1.5">
              {RANGES.map((d) => (
                <option key={d} value={d}>
                  {t("{days} hari", { days: d })}
                </option>
              ))}
            </Select>
          </label>
        }
      />
      <Async query={query} loadingLabel={t("Memuat bisnis...")}>
        {({ items }) =>
          items.length === 0 ? (
            <EmptyState icon="user" title={t("Belum ada bisnis di workspace ini")} />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <th>{t("Bisnis")}</th>
                  <th className="text-right">{t("Omzet")}</th>
                  <th className="text-right">{t("Pesanan lunas")}</th>
                  <th>{t("Token AI")}</th>
                  <th>{t("Perlu ditangani")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="font-semibold text-fg">{b.name}</div>
                      <div className="text-caption text-fg-subtle">
                        {b.tier ? `${TIER[b.tier] ?? b.tier} | ` : ""}
                        {t("{count} staf", { count: b.staff })}
                        {b.lastPaidOrderAt ? ` | ${t("pesanan lunas terakhir")} ${relative(b.lastPaidOrderAt)}` : ""}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="tabular-nums font-medium">{rupiah(b.revenue)}</div>
                      <ChangeChip value={b.change} />
                    </td>
                    <td className="text-right tabular-nums">{number(b.orders)}</td>
                    <td>
                      <TokenBar left={b.tokensLeft} quota={b.tokenQuota} />
                    </td>
                    <td className="text-label text-fg-muted max-w-[260px]">{openWork(b, t)}</td>
                    <td className="text-right whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => open(b.id)}>
                        {t("Buka dashboard")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )
        }
      </Async>
    </div>
  );
}
