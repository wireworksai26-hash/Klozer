"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Button, Card, EmptyState, PageHeader, Select, TableShell } from "@/components/ui";
import ChangeChip from "./ChangeChip";
import RevenueLines, { LineSample } from "./RevenueLines";
import { switchBusiness } from "./switchBusiness";

const RANGES = [7, 30, 90];

/** Work that waits for a person in one business, with where it is handled. The path is opened inside that business. */
function waitingRows(businesses, t) {
  const kinds = [
    { key: "proofsToCheck", label: "Bukti bayar menunggu dicek", path: "/dashboard/orders", tone: "urgent" },
    { key: "chatsForTeam", label: "Chat menunggu tim", path: "/dashboard/chat", tone: "urgent" },
    { key: "overdueTasks", label: "Tugas lewat tenggat", path: "/dashboard/tasks", tone: "urgent" },
    { key: "waitingPayment", label: "Pesanan menunggu pembayaran", path: "/dashboard/orders", tone: "soon" },
    { key: "lowStock", label: "Produk stok menipis", path: "/dashboard/products", tone: "soon" },
  ];
  const rows = [];
  for (const kind of kinds) for (const b of businesses) if (b[kind.key] > 0) rows.push({ id: `${kind.key}-${b.id}`, businessId: b.id, business: b.name, count: b[kind.key], label: t(kind.label), path: kind.path, tone: kind.tone });
  return rows.sort((a, b) => (a.tone === b.tone ? b.count - a.count : a.tone === "urgent" ? -1 : 1));
}

const DOT = { urgent: "bg-danger-500", soon: "bg-warning-500" };

/** The owner's first screen: how all businesses did, what waits for a person, and how each compares. */
export default function OverviewTab({ workspace }) {
  const { t, notify } = useDashboard();
  const { rupiah, number } = useFormat();
  const [days, setDays] = useState(30);
  const query = useApi("/workspace", { query: { days } });

  const open = async (institutionId, path) => {
    try {
      await switchBusiness(institutionId, path);
    } catch (err) {
      notify("error", err.message || t("Gagal berpindah bisnis."));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={workspace.name}
        description={t("{count} bisnis dalam satu workspace", { count: workspace.institutions.length })}
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
      <Async query={query} loadingLabel={t("Memuat ringkasan workspace...")}>
        {({ overview }) => {
          const { businesses, series, totals } = overview;
          const waiting = waitingRows(businesses, t);
          // the one accent goes to the business that earned the most, so the chart answers "who leads"
          const leader = totals.revenue > 0 ? [...businesses].sort((a, b) => b.revenue - a.revenue)[0].id : null;
          return (
            <>
              <Card padded={false}>
                <div className="px-5 pt-5">
                  <div className="text-label text-fg-muted">{t("Omzet pesanan lunas, semua bisnis")}</div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1">
                    <span className="text-heading-md sm:text-heading font-semibold text-ink tabular-nums">{rupiah(totals.revenue)}</span>
                    <ChangeChip value={totals.change} />
                  </div>
                  <div className="text-caption text-fg-subtle mt-0.5">{t("{orders} pesanan lunas dalam {days} hari, dibanding {days} hari sebelumnya", { orders: number(totals.orders), days })}</div>
                </div>
                <div className="px-5 pb-4 pt-3">
                  {totals.revenue === 0 ? (
                    <EmptyState icon="history" title={t("Belum ada pesanan lunas dalam {days} hari", { days })} body={t("Grafik muncul setelah pesanan pertama dibayar di salah satu bisnis.")} />
                  ) : (
                    <>
                    <RevenueLines series={series} businesses={businesses} currentId={leader} label={t("Omzet harian per bisnis, {days} hari terakhir", { days })} />
                    <p className="m-0 mt-2 text-caption text-fg-subtle">{t("Garis biru: bisnis dengan omzet tertinggi. Garis lain berbeda pola putus-putusnya, sama seperti di tabel.")}</p>
                    </>
                  )}
                </div>
              </Card>

              <section aria-labelledby="ws-attention" className="bg-white rounded-2xl border border-line">
                <div className="px-6 py-4 border-b border-line">
                  <h2 id="ws-attention" className="card-title">{t("Perlu ditangani")}</h2>
                </div>
                {waiting.length === 0 ? (
                  <p className="m-0 px-6 py-5 text-body-sm text-fg-muted">{t("Tidak ada yang menunggu di bisnis mana pun.")}</p>
                ) : (
                  <ul className="list-none m-0 p-0 divide-y divide-line">
                    {waiting.slice(0, 10).map((r) => (
                      <li key={r.id} className="flex items-center gap-4 px-6 py-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[r.tone]}`} aria-hidden="true" />
                        <span className="w-9 text-heading-sm font-semibold text-ink tabular-nums leading-none">{r.count}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body-sm font-medium text-fg">{r.label}</span>
                          <span className="block text-caption text-fg-muted truncate">{r.business}</span>
                        </span>
                        <Button size="sm" variant="secondary" onClick={() => open(r.businessId, r.path)}>
                          {t("Buka")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Bisnis")}</th>
                    <th className="text-right">{t("Omzet")}</th>
                    <th className="text-right">{t("Dibanding sebelumnya")}</th>
                    <th className="text-right">{t("Pesanan lunas")}</th>
                    <th className="text-right">{t("Kontak baru")}</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b, index) => (
                    <tr key={b.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <LineSample index={index} current={b.id === leader} />
                          <span className="font-semibold text-fg">{b.name}</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{rupiah(b.revenue)}</td>
                      <td className="text-right"><ChangeChip value={b.change} /></td>
                      <td className="text-right tabular-nums">{number(b.orders)}</td>
                      <td className="text-right tabular-nums">{number(b.newContacts)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </>
          );
        }}
      </Async>
    </div>
  );
}
