"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { Badge, Button, EmptyState, ErrorState, LoadingState, TableShell } from "@/components/ui";
import { useAgentText } from "./labels";
import { usePagedList } from "./usePagedList";

/** Every change of agent in a conversation: who handled it before, who after, and why. */
export default function RoutingLog() {
  const { t } = useDashboard();
  const { dateTime } = useFormat();
  const text = useAgentText();
  const list = usePagedList("/ai/agents/routing-log");

  if (list.error && !list.items.length) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (list.loading) return <LoadingState label={t("Memuat log pemilihan...")} />;
  if (!list.items.length) {
    return (
      <div className="bg-white rounded-2xl border border-line">
        <EmptyState icon="route" title={t("Belum ada pergantian agen")} body={t("Setiap kali sebuah chat pindah agen, perpindahannya dicatat di sini lengkap dengan alasannya.")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" icon="refresh" onClick={list.reload}>
          {t("Muat ulang")}
        </Button>
      </div>
      <TableShell>
        <thead>
          <tr className="bg-canvas border-b border-line text-label font-bold text-fg-muted">
            <th scope="col" className="py-3 px-4">{t("Waktu")}</th>
            <th scope="col" className="py-3 px-4">{t("Kontak")}</th>
            <th scope="col" className="py-3 px-4">{t("Dari agen")}</th>
            <th scope="col" className="py-3 px-4">{t("Ke agen")}</th>
            <th scope="col" className="py-3 px-4">{t("Cara")}</th>
            <th scope="col" className="py-3 px-4">{t("Alasan")}</th>
            <th scope="col" className="py-3 px-4 text-right">{t("Keyakinan")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {list.items.map((row) => (
            <tr key={row.id} className="hover:bg-soft align-top">
              <td className="py-3 px-4 text-fg-muted whitespace-nowrap">{dateTime(row.createdAt)}</td>
              <td className="py-3 px-4 font-semibold text-fg">{row.leadName || "-"}</td>
              <td className="py-3 px-4 text-fg-muted">{row.from || t("Tanpa agen")}</td>
              <td className="py-3 px-4 text-fg">{row.to || t("Tanpa agen")}</td>
              <td className="py-3 px-4">
                <Badge>{text.methodLabel(row.method)}</Badge>
              </td>
              <td className="py-3 px-4 text-fg-muted min-w-[12rem]">{row.reason || "-"}</td>
              <td className="py-3 px-4 text-right tabular-nums text-fg-muted">{row.confidence === null || row.confidence === undefined ? "-" : `${row.confidence}%`}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {list.error ? <p role="alert" className="text-label text-danger-700">{list.error.message}</p> : null}
      {list.hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" loading={list.loadingMore} onClick={list.loadMore}>
            {t("Muat lebih banyak")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
