"use client";
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button, EmptyState, Stat, TableShell } from "@/components/ui";
import CampaignDrawer from "./CampaignDrawer";
import CampaignWizard from "./CampaignWizard";
import { CAMPAIGN_STATUS, PAUSE_REASON } from "./broadcastModel";

const REFRESH_MS = 15000;

/** The campaign list, "Buat kampanye", and the detail drawer. `templates` and `channels` are the loaded API results. */
export default function CampaignsTab({ templates, channels, onGoTemplates }) {
  const { t } = useDashboard();
  const f = useFormat();
  const campaigns = useApi("/broadcast/campaigns");
  const settings = useApi("/broadcast/settings");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  const templateList = useMemo(() => templates.data?.data || [], [templates.data]);
  const channelList = useMemo(() => (channels.data?.data || []).filter((c) => c.type === "whatsapp" && c.isActive), [channels.data]);
  const rows = campaigns.data?.data;
  const reload = campaigns.reload;
  const busy = Boolean(rows?.some((c) => ["sending", "scheduled"].includes(c.status)));

  useEffect(() => {
    if (!busy) return undefined;
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [busy, reload]);

  const credits = settings.data?.credits;
  const pacing = settings.data ? { ...settings.data.data, credits } : undefined;
  const nameOf = (id) => templateList.find((x) => x.id === id)?.name || "-";
  const timeOf = (c) => (c.finishedAt ? t("Selesai {time}", { time: f.dateTime(c.finishedAt) }) : c.startedAt ? t("Mulai {time}", { time: f.dateTime(c.startedAt) }) : c.scheduledAt ? t("Dijadwalkan {time}", { time: f.dateTime(c.scheduledAt) }) : t("Dibuat {time}", { time: f.dateTime(c.createdAt) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {credits ? (
          <div className="min-w-[12rem]">
            <Stat label={t("Sisa kredit blast")} value={f.number(credits.remaining)} note={t("dari {quota}", { quota: f.number(credits.quota) })} />
          </div>
        ) : (
          <span />
        )}
        <Button icon="plus" onClick={() => setCreating(true)}>
          {t("Buat kampanye")}
        </Button>
      </div>

      <Async query={campaigns} loadingLabel={t("Memuat kampanye...")}>
        {() =>
          rows.length ? (
            <TableShell>
              <thead>
                <tr className="bg-canvas border-b border-line text-caption font-semibold text-fg-muted">
                  <th scope="col" className="py-3 px-4">{t("Kampanye")}</th>
                  <th scope="col" className="py-3 px-4">{t("Status")}</th>
                  <th scope="col" className="py-3 px-4 text-right">{t("Penerima")}</th>
                  <th scope="col" className="py-3 px-4 text-right">{t("Diterima Meta")}</th>
                  <th scope="col" className="py-3 px-4">{t("Waktu")}</th>
                  <th scope="col" className="py-3 px-4">
                    <span className="sr-only">{t("Aksi")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const s = CAMPAIGN_STATUS[c.status] || { label: c.status, tone: "neutral" };
                  return (
                    <tr key={c.id} className="hover:bg-soft">
                      <td className="py-3.5 px-4 min-w-[12rem]">
                        <div className="font-bold text-fg break-words">{c.name}</div>
                        <div className="text-caption text-fg-subtle font-mono break-all">{nameOf(c.templateId)}</div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[9rem]">
                        <Badge tone={s.tone}>{t(s.label)}</Badge>
                        {c.status === "paused" && c.pauseReason ? <div className="text-caption text-fg-muted mt-1">{t(PAUSE_REASON[c.pauseReason]?.label || c.pauseReason)}</div> : null}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">{c.recipients ? f.number(c.recipients) : "-"}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums">{c.recipients ? f.number(c.sent) : "-"}</td>
                      <td className="py-3.5 px-4 text-label text-fg-muted min-w-[10rem]">{timeOf(c)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => setOpenId(c.id)} aria-label={t("Buka kampanye {name}", { name: c.name })}>
                          {t("Detail")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          ) : (
            <div className="bg-white rounded-2xl border border-line">
              <EmptyState
                icon="megaphone"
                title={t("Belum ada kampanye")}
                body={t("Pilih templat yang disetujui Meta, tentukan kontaknya, lalu kirim. Hanya kontak yang setuju menerima promosi yang dikirimi.")}
                action={
                  <Button icon="plus" onClick={() => setCreating(true)}>
                    {t("Buat kampanye")}
                  </Button>
                }
              />
            </div>
          )
        }
      </Async>

      {creating ? (
        <CampaignWizard
          open
          onClose={() => setCreating(false)}
          templates={templateList}
          channels={channelList}
          onGoTemplates={onGoTemplates}
          onCreated={(campaign) => {
            setCreating(false);
            reload();
            setOpenId(campaign.id);
          }}
        />
      ) : null}
      {openId ? <CampaignDrawer key={openId} campaignId={openId} open onClose={() => setOpenId(null)} templates={templateList} settings={pacing} onChanged={reload} onGoTemplates={() => (setOpenId(null), onGoTemplates())} /> : null}
    </div>
  );
}
