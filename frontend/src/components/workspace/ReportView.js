"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { downloadCsv } from "@/utils/download";
import { Async, Button, Card, EmptyState, PageHeader, Select, TableShell } from "@/components/ui";
import ChangeChip from "./ChangeChip";

const RANGES = [7, 30, 90];
const METHOD = { qris: "QRIS", va: "Virtual account", bank_transfer: "Transfer bank", cod: "Bayar di tempat", cash: "Tunai" };

/** A value with its change under it, the way a comparison reads best. */
function Compared({ value, change }) {
  return (
    <div className="text-right">
      <div className="tabular-nums font-medium">{value}</div>
      <ChangeChip value={change} />
    </div>
  );
}

/**
 * One share of the total as a single bar: the biggest share gets the accent and the rest are neutral steps, with the numbers
 * in a list below, so the bar never has to be decoded from a color key.
 */
function ShareBar({ rows, total, label }) {
  const { t, locale } = useDashboard();
  const shades = ["bg-brand", "bg-ink/70", "bg-fg-muted/60", "bg-fg-subtle/50", "bg-line-strong"];
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken" role="img" aria-label={label}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ width: `${total ? (r.value / total) * 100 : 0}%` }} className={shades[Math.min(i, shades.length - 1)]} />
        ))}
      </div>
      <ul className="list-none m-0 mt-3 p-0 flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center justify-between gap-3 text-body-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${shades[Math.min(i, shades.length - 1)]}`} aria-hidden="true" />
              <span className="truncate text-fg">{r.label}</span>
            </span>
            <span className="text-fg-muted tabular-nums whitespace-nowrap">
              {r.display} | {total ? (Math.round((r.value / total) * 1000) / 10).toLocaleString(locale) : 0}%
            </span>
          </li>
        ))}
      </ul>
      <span className="sr-only">{t("Pembagian dalam persen")}</span>
    </div>
  );
}

/** Business against business and period against period, with what sells, how it is paid, and who sells it. Downloadable. */
export default function ReportView() {
  const { t } = useDashboard();
  const { rupiah, number } = useFormat();
  const [days, setDays] = useState(30);
  const query = useApi("/workspace/report", { query: { days } });

  const exportCsv = (data) =>
    downloadCsv(
      `perbandingan-bisnis-${days}-hari.csv`,
      [t("Bisnis"), t("Omzet"), t("Omzet periode sebelumnya"), t("Perubahan omzet (%)"), t("Pesanan lunas"), t("Pesanan periode sebelumnya"), t("Rata-rata per pesanan"), t("Kontak baru"), t("Kontak baru periode sebelumnya")],
      data.businesses.map((b) => [b.name, b.revenue, b.previousRevenue, b.revenueChange ?? "", b.orders, b.previousOrders, b.averageOrder, b.newContacts, b.previousNewContacts])
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("Laporan")}
        description={t("{days} hari terakhir dibanding {days} hari sebelumnya, dari pesanan yang sudah dibayar.", { days })}
        actions={
          <div className="flex items-center gap-3">
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
            <Button variant="secondary" icon="export" disabled={!query.data} onClick={() => exportCsv(query.data)}>
              {t("Unduh CSV")}
            </Button>
          </div>
        }
      />
      <Async query={query} loadingLabel={t("Memuat laporan...")}>
        {(data) => {
          const sold = data.businesses.reduce((a, b) => a + b.orders, 0);
          if (sold === 0 && data.businesses.every((b) => b.previousOrders === 0)) {
            return <EmptyState icon="history" title={t("Belum ada pesanan lunas untuk dilaporkan")} body={t("Laporan terisi setelah ada pesanan yang dibayar di salah satu bisnis.")} />;
          }
          const maxProduct = Math.max(1, ...data.topProducts.map((p) => p.revenue));
          const payTotal = data.payments.reduce((a, p) => a + p.revenue, 0);
          return (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Bisnis")}</th>
                    <th className="text-right">{t("Omzet")}</th>
                    <th className="text-right">{t("Pesanan lunas")}</th>
                    <th className="text-right">{t("Rata-rata per pesanan")}</th>
                    <th className="text-right">{t("Kontak baru")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.businesses.map((b) => (
                    <tr key={b.id}>
                      <td className="font-semibold text-fg">{b.name}</td>
                      <td><Compared value={rupiah(b.revenue)} change={b.revenueChange} /></td>
                      <td><Compared value={number(b.orders)} change={b.ordersChange} /></td>
                      <td><Compared value={b.orders ? rupiah(b.averageOrder) : "-"} change={b.averageOrderChange} /></td>
                      <td><Compared value={number(b.newContacts)} change={b.newContactsChange} /></td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
                <Card title={t("Produk terlaris")} description={t("Menurut omzet, dari semua bisnis")}>
                  {data.topProducts.length === 0 ? (
                    <p className="m-0 text-body-sm text-fg-muted">{t("Belum ada produk terjual pada periode ini.")}</p>
                  ) : (
                    <ol className="list-none m-0 p-0 flex flex-col gap-3">
                      {data.topProducts.map((p) => (
                        <li key={p.name}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-body-sm font-medium text-fg truncate">{p.name}</span>
                            <span className="text-body-sm tabular-nums text-fg whitespace-nowrap">{rupiah(p.revenue)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
                            <div style={{ width: `${(p.revenue / maxProduct) * 100}%` }} className="h-full rounded-full bg-ink/70" />
                          </div>
                          <div className="mt-0.5 text-caption text-fg-subtle">
                            {t("{qty} terjual", { qty: number(p.quantity) })}
                            {p.businesses > 1 ? ` | ${t("di {count} bisnis", { count: p.businesses })}` : ""}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>

                <Card title={t("Cara pembayaran")} description={t("Porsi omzet menurut metode bayar")}>
                  {data.payments.length === 0 ? (
                    <p className="m-0 text-body-sm text-fg-muted">{t("Belum ada pembayaran pada periode ini.")}</p>
                  ) : (
                    <ShareBar total={payTotal} label={t("Porsi omzet menurut cara pembayaran")} rows={data.payments.map((p) => ({ key: p.method, label: METHOD[p.method] ?? p.method, value: p.revenue, display: rupiah(p.revenue) }))} />
                  )}
                </Card>
              </div>

              <Card title={t("Penjual terbaik")} description={t("CS dengan omzet pesanan lunas terbesar, lintas bisnis")} padded={false}>
                {data.sellers.length === 0 ? (
                  <p className="m-0 p-5 text-body-sm text-fg-muted">{t("Belum ada pesanan lunas yang tercatat atas nama CS.")}</p>
                ) : (
                  <ol className="list-none m-0 p-0 divide-y divide-line">
                    {data.sellers.map((s, i) => (
                      <li key={`${s.name}-${s.business}`} className="flex items-center gap-4 px-5 py-3">
                        <span className="w-6 text-label text-fg-subtle tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body-sm font-medium text-fg truncate">{s.name}</span>
                          <span className="block text-caption text-fg-subtle truncate">{s.business}</span>
                        </span>
                        <span className="text-caption text-fg-muted tabular-nums whitespace-nowrap">{t("{count} pesanan", { count: s.orders })}</span>
                        <span className="w-32 text-right text-body-sm font-medium tabular-nums">{rupiah(s.revenue)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </>
          );
        }}
      </Async>
    </div>
  );
}
