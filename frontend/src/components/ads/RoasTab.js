"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Button, Card, SelectField, Stat, TableShell, TextField } from "@/components/ui";
import RoasChart, { useRoasText, useRowLabel } from "./RoasChart";

const isoDay = (date) => date.toISOString().slice(0, 10);
const daysAgo = (n) => isoDay(new Date(Date.now() - n * 86_400_000));

const PRESETS = [
  { days: 7, label: "7 hari" },
  { days: 30, label: "30 hari" },
  { days: 90, label: "90 hari" },
];

const GROUPS = [
  { value: "campaign", label: "Per kampanye" },
  { value: "ad", label: "Per iklan" },
  { value: "day", label: "Per hari" },
];

const FIRST_COLUMN = { campaign: "Kampanye", ad: "Iklan", day: "Hari" };

/** A cost per lead or order is only meaningful when something was spent. */
const cost = (row, value, f) => (row.spend > 0 && value ? f.rupiah(value) : "-");

function Explanation() {
  const { t } = useDashboard();
  return (
    <Card title={t("Agar ROAS muncul, dua hal perlu tercatat")} description={t("ROAS dihitung dari omzet pesanan berbayar milik kontak yang datang dari iklan, dibagi biaya iklan.")}>
      <ol className="m-0 pl-5 list-decimal flex flex-col gap-2 text-body-sm text-fg-muted">
        <li>{t("Pelanggan membuka chat dari iklan Click-to-WhatsApp. Asal iklannya tercatat otomatis pada chat pertama mereka.")}</li>
        <li>{t("Biaya iklan tercatat: diisi di tab Biaya iklan, atau ditarik dari akun iklan Meta di tab Meta Ads.")}</li>
      </ol>
    </Card>
  );
}

/** Return on ad spend for a date range, grouped by campaign, ad or day. */
export default function RoasTab() {
  const { t } = useDashboard();
  const f = useFormat();
  const roasText = useRoasText();
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => daysAgo(0));
  const [groupBy, setGroupBy] = useState("campaign");
  const label = useRowLabel(groupBy);
  const validRange = Boolean(from) && Boolean(to) && from <= to;
  const report = useApi("/ads/roas", { query: { from, to, groupBy }, enabled: validRange });

  const preset = (days) => {
    setFrom(daysAgo(days - 1));
    setTo(daysAgo(0));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <TextField label={t("Dari tanggal")} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t("Sampai tanggal")} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        <SelectField label={t("Kelompokkan")} value={groupBy} onChange={(e) => setGroupBy(e.target.value)} options={GROUPS.map((g) => ({ value: g.value, label: t(g.label) }))} />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.days} variant="secondary" size="sm" onClick={() => preset(p.days)}>
              {t(p.label)}
            </Button>
          ))}
        </div>
      </div>
      {!validRange ? <p role="alert" className="text-label text-danger-700">{t("Tanggal mulai harus sebelum tanggal akhir.")}</p> : null}

      {validRange ? (
        <Async query={report} loadingLabel={t("Memuat laporan ROAS...")}>
          {(res) => {
            const { totals, rows } = res.data;
            const hasSpend = totals.spend > 0;
            return (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Stat label={t("ROAS")} value={roasText(totals.roas)} note={totals.roas === null ? t("Belum ada biaya iklan") : t("Omzet dibagi biaya")} />
                  <Stat label={t("Biaya iklan")} value={hasSpend ? f.rupiah(totals.spend) : "-"} />
                  <Stat label={t("Omzet dari iklan")} value={totals.revenue ? f.rupiah(totals.revenue) : "-"} note={totals.orders ? t("{count} pesanan dibayar", { count: totals.orders }) : undefined} />
                  <Stat label={t("Lead dari iklan")} value={totals.leads ? f.number(totals.leads) : "-"} note={hasSpend && totals.leads ? t("{amount} per lead", { amount: f.rupiah(totals.costPerLead) }) : undefined} />
                </div>

                {res.data.notFromAds ? (
                  <p className="text-label text-fg-muted">
                    {t("Omzet dari kontak bukan iklan pada periode ini: {amount} ({count} pesanan).", { amount: f.rupiah(res.data.notFromAds.revenue), count: res.data.notFromAds.orders })}
                    {res.data.adsShareOfRevenuePercent !== null && res.data.adsShareOfRevenuePercent !== undefined ? ` ${t("Iklan menyumbang {percent} dari seluruh omzet.", { percent: f.percent(res.data.adsShareOfRevenuePercent) })}` : ""}
                  </p>
                ) : null}
                {res.data.spendWithoutBreakdown > 0 ? <p className="text-label text-fg-muted">{t("Biaya {amount} dicatat tanpa kampanye atau iklan. Biaya ini masuk ke total tetapi tidak ke baris tertentu.", { amount: f.rupiah(res.data.spendWithoutBreakdown) })}</p> : null}

                {totals.roas === null ? <Explanation /> : null}

                {rows.length ? (
                  <>
                    <Card title={groupBy === "day" ? t("Omzet dan biaya per hari") : groupBy === "ad" ? t("ROAS per iklan") : t("ROAS per kampanye")} description={groupBy === "day" ? undefined : t("Sepuluh teratas menurut omzet. Baris tanpa biaya tidak punya ROAS.")}>
                      <RoasChart rows={rows} groupBy={groupBy} />
                    </Card>
                    <TableShell>
                      <thead>
                        <tr className="bg-canvas border-b border-line text-caption font-semibold text-fg-muted">
                          <th scope="col" className="py-3 px-4">{t(FIRST_COLUMN[groupBy])}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("Biaya")}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("Klik")}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("Lead")}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("Pesanan")}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("Omzet")}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("ROAS")}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("Biaya per lead")}</th>
                          <th scope="col" className="py-3 px-4 text-right">{t("Biaya per pesanan")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {rows.map((r) => (
                          <tr key={`${r.id}-${r.campaignId || ""}`} className="hover:bg-soft">
                            <td className="py-3 px-4 min-w-[12rem]">
                              <div className="font-semibold text-fg break-words">{label(r)}</div>
                              {groupBy === "ad" && r.campaignName ? <div className="text-caption text-fg-subtle break-words">{r.campaignName}</div> : null}
                              {groupBy !== "day" && r.id ? <div className="text-caption text-fg-subtle font-mono break-all">{r.id}</div> : null}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{r.spend > 0 ? f.rupiah(r.spend) : "-"}</td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{r.clicks ? f.number(r.clicks) : "-"}</td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{r.leads ? f.number(r.leads) : "-"}</td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{r.orders ? f.number(r.orders) : "-"}</td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{r.revenue ? f.rupiah(r.revenue) : "-"}</td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap font-bold">{roasText(r.roas)}</td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{cost(r, r.costPerLead, f)}</td>
                            <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{cost(r, r.costPerOrder, f)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </TableShell>
                  </>
                ) : (
                  <p className="text-body-sm text-fg-muted">{t("Tidak ada biaya, lead, atau pesanan dari iklan pada periode ini.")}</p>
                )}
              </div>
            );
          }}
        </Async>
      ) : null}
    </div>
  );
}
