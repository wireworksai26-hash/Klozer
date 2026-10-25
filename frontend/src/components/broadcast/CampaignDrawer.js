"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, Modal, SelectField, TableShell } from "@/components/ui";
import { audienceLines } from "./AudienceFields";
import LaunchDialog from "./LaunchDialog";
import TestSendDialog from "./TestSendDialog";
import { CAMPAIGN_STATUS, PAUSE_REASON, RECIPIENT_STATUS } from "./broadcastModel";

const PAGE = 20;
const REFRESH_MS = 15000;

function PauseNotice({ campaign, onGoTemplates }) {
  const { t } = useDashboard();
  const info = PAUSE_REASON[campaign.pauseReason] || { label: "Dijeda", help: "" };
  return (
    <div role="status" className="rounded-xl border border-warning-200 bg-warning-50 p-4 flex flex-col gap-2">
      <div className="font-bold text-warning-800">{t(info.label)}</div>
      {info.help ? <p className="text-label text-fg-muted">{t(info.help)}</p> : null}
      <div className="flex flex-wrap gap-2">
        {campaign.pauseReason === "out_of_credits" ? (
          <Button variant="secondary" size="sm" href="/dashboard/credits">
            {t("Buka halaman kredit")}
          </Button>
        ) : null}
        {campaign.pauseReason === "channel_auth" || campaign.pauseReason === "payment_problem" ? (
          <Button variant="secondary" size="sm" href="/dashboard/channels">
            {t("Buka Saluran Chat")}
          </Button>
        ) : null}
        {campaign.pauseReason === "template_problem" ? (
          <Button variant="secondary" size="sm" onClick={onGoTemplates}>
            {t("Buka tab Templat")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Recipients({ campaignId, active }) {
  const { t } = useDashboard();
  const f = useFormat();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const list = useApi(`/broadcast/campaigns/${campaignId}/recipients`, { query: { status, limit: PAGE, offset } });
  const reload = list.reload;

  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [active, reload]);

  const rows = list.data?.data || [];
  return (
    <section aria-labelledby="recipients-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 id="recipients-title" className="card-title">
          {t("Penerima")}
        </h3>
        <div className="w-48">
          <SelectField
            label={t("Status pengiriman")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            options={[{ value: "", label: t("Semua") }, ...Object.entries(RECIPIENT_STATUS).map(([value, s]) => ({ value, label: t(s.label) }))]}
          />
        </div>
      </div>
      {list.error && !list.data ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <LoadingState label={t("Memuat penerima...")} /> : null}
      {list.data && !rows.length && offset === 0 ? (
        <EmptyState icon="user" title={status ? t("Tidak ada penerima dengan status ini") : t("Belum ada penerima")} body={status ? undefined : t("Daftar penerima dibuat saat kampanye dijalankan.")} />
      ) : null}
      {rows.length ? (
        <>
          <TableShell>
            <thead>
              <tr className="bg-canvas border-b border-line text-caption font-semibold text-fg-muted">
                <th scope="col" className="py-2.5 px-3">{t("Kontak")}</th>
                <th scope="col" className="py-2.5 px-3">{t("Status")}</th>
                <th scope="col" className="py-2.5 px-3">{t("Waktu")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const s = RECIPIENT_STATUS[r.status] || { label: r.status, tone: "neutral" };
                const at = r.readAt || r.deliveredAt || r.sentAt;
                return (
                  <tr key={r.id}>
                    <td className="py-2.5 px-3 min-w-[9rem]">
                      <div className="font-semibold text-fg break-words">{r.name}</div>
                      <div className="text-caption text-fg-subtle tabular-nums">{r.phone}</div>
                    </td>
                    <td className="py-2.5 px-3 min-w-[9rem]">
                      <Badge tone={s.tone}>{t(s.label)}</Badge>
                      {r.repliedAt ? <div className="text-caption text-fg-muted mt-1">{t("Sudah membalas")}</div> : null}
                      {r.errorMessage ? <div className="text-caption text-fg-muted mt-1 break-words max-w-[14rem]">{r.errorMessage}</div> : null}
                    </td>
                    <td className="py-2.5 px-3 text-caption text-fg-muted whitespace-nowrap">{f.dateTime(at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
              {t("Sebelumnya")}
            </Button>
            <span className="text-caption text-fg-muted tabular-nums">{t("Baris {from} sampai {to}", { from: offset + 1, to: offset + rows.length })}</span>
            <Button variant="secondary" size="sm" disabled={rows.length < PAGE} onClick={() => setOffset(offset + PAGE)}>
              {t("Berikutnya")}
            </Button>
          </div>
        </>
      ) : null}
      {list.data && !rows.length && offset > 0 ? (
        <Button variant="secondary" size="sm" onClick={() => setOffset(Math.max(0, offset - PAGE))}>
          {t("Sebelumnya")}
        </Button>
      ) : null}
    </section>
  );
}

function Metric({ label, value, note }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3.5 min-w-0">
      <div className="text-caption font-semibold text-fg-muted">{label}</div>
      <div className="text-heading-sm font-bold text-fg tabular-nums mt-0.5 break-words">{value}</div>
      {note ? <div className="text-caption text-fg-subtle mt-0.5">{note}</div> : null}
    </div>
  );
}

function Results({ report }) {
  const { t } = useDashboard();
  const f = useFormat();
  if (!report.total) return <p className="text-label text-fg-muted">{t("Belum ada hasil. Daftar penerima dan angka pengiriman muncul setelah kampanye dijalankan.")}</p>;
  const sent = report.funnel.accepted > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Metric label={t("Penerima")} value={f.number(report.total)} />
        <Metric label={t("Diterima Meta")} value={f.number(report.funnel.accepted)} />
        <Metric label={t("Sampai")} value={sent ? f.number(report.funnel.delivered) : "-"} />
        <Metric label={t("Dibaca")} value={sent ? f.number(report.funnel.read) : "-"} />
        <Metric label={t("Gagal atau dilewati")} value={f.number(report.counts.failed + report.counts.skipped)} note={report.counts.pending ? t("{count} masih menunggu", { count: report.counts.pending }) : undefined} />
        <Metric label={t("Balasan")} value={sent ? f.number(report.replies) : "-"} note={sent ? f.percent(report.replyRatePercent) : undefined} />
        <Metric label={t("Pesanan dibayar")} value={sent ? f.number(report.attributedOrders) : "-"} note={sent ? t("dalam {days} hari setelah pesan", { days: report.attributionWindowDays }) : undefined} />
        <Metric label={t("Omzet dari penerima")} value={sent ? f.rupiah(report.attributedRevenue) : "-"} note={t("{count} kredit terpakai", { count: report.creditsUsed })} />
      </div>
      {report.failures.length ? (
        <div className="bg-white border border-line rounded-2xl p-4">
          <div className="text-label font-semibold text-fg mb-2">{t("Penyebab gagal atau dilewati")}</div>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {report.failures.map((x) => (
              <li key={x.reason} className="flex items-start justify-between gap-3 text-label">
                <span className="text-fg-muted break-words min-w-0">{x.reason}</span>
                <span className="font-bold text-fg tabular-nums">{f.number(x.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** One campaign: status, results, recipients, and the actions the server allows for that status. */
export default function CampaignDrawer({ campaignId, open, onClose, templates, settings, onChanged, onGoTemplates }) {
  const { t } = useDashboard();
  const f = useFormat();
  const { run, pending } = useAction();
  const report = useApi(`/broadcast/campaigns/${campaignId}`, { enabled: open && Boolean(campaignId) });
  const [launching, setLaunching] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [testing, setTesting] = useState(false);
  const reload = report.reload;
  const status = report.data?.data?.campaign?.status;
  const live = status === "sending" || status === "scheduled";

  useEffect(() => {
    if (!open || !live) return undefined;
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [open, live, reload]);

  const refresh = () => {
    report.reload();
    onChanged();
  };

  const act = async (verb, success) => {
    const out = await run(() => api.post(`/broadcast/campaigns/${campaignId}/${verb}`, {}), { success });
    if (out.ok) refresh();
    return out.ok;
  };

  const detail = report.data?.data;
  const campaign = detail?.campaign;
  const template = campaign ? templates.find((x) => x.id === campaign.templateId) : null;
  const canTest = campaign && template && ["draft", "scheduled", "paused"].includes(campaign.status);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        variant="drawer"
        title={campaign?.name || t("Kampanye")}
        description={template ? template.name : undefined}
        footer={
          campaign ? (
            <>
              {canTest ? (
                <Button variant="secondary" icon="send" onClick={() => setTesting(true)}>
                  {t("Kirim uji")}
                </Button>
              ) : null}
              {["draft", "scheduled", "sending", "paused"].includes(campaign.status) ? (
                <Button variant="quietDanger" onClick={() => setCancelling(true)}>
                  {t("Batalkan kampanye")}
                </Button>
              ) : null}
              {["scheduled", "sending"].includes(campaign.status) ? (
                <Button variant="secondary" icon="pause" loading={pending} onClick={() => act("pause", t("Kampanye dijeda."))}>
                  {t("Jeda")}
                </Button>
              ) : null}
              {campaign.status === "paused" ? (
                <Button icon="play" loading={pending} onClick={() => act("resume", t("Kampanye dilanjutkan."))}>
                  {t("Lanjutkan")}
                </Button>
              ) : null}
              {["draft", "scheduled"].includes(campaign.status) ? (
                <Button icon="send" onClick={() => setLaunching(true)}>
                  {campaign.status === "draft" ? t("Jalankan") : t("Kirim sekarang")}
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        <Async query={report} loadingLabel={t("Memuat kampanye...")}>
          {() => (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge tone={CAMPAIGN_STATUS[campaign.status]?.tone}>{t(CAMPAIGN_STATUS[campaign.status]?.label || campaign.status)}</Badge>
                <span className="text-label text-fg-muted">
                  {campaign.finishedAt
                    ? t("Selesai {time}", { time: f.dateTime(campaign.finishedAt) })
                    : campaign.startedAt
                      ? t("Mulai {time}", { time: f.dateTime(campaign.startedAt) })
                      : campaign.scheduledAt
                        ? t("Dijadwalkan {time}", { time: f.dateTime(campaign.scheduledAt) })
                        : t("Dibuat {time}", { time: f.dateTime(campaign.createdAt) })}
                </span>
              </div>

              {campaign.status === "paused" ? <PauseNotice campaign={campaign} onGoTemplates={onGoTemplates} /> : null}
              {campaign.status === "sending" && settings ? (
                <p className="text-label text-fg-muted">
                  {t("Pesan dikirim bertahap. Pengiriman berhenti sementara pada jam tenang ({start}.00 sampai {end}.00 WIB) dan setelah batas harian {limit} penerima tercapai, lalu lanjut sendiri.", { start: String(settings.quietStartHour).padStart(2, "0"), end: String(settings.quietEndHour).padStart(2, "0"), limit: settings.dailyLimit })}
                </p>
              ) : null}
              {!template && campaign.templateId ? <p className="text-label text-danger-700">{t("Templat kampanye ini sudah dihapus atau tidak tersedia.")}</p> : null}

              <section aria-labelledby="audience-title">
                <h3 id="audience-title" className="card-title mb-2">
                  {t("Audiens")}
                </h3>
                <ul className="list-none p-0 m-0 flex flex-col gap-0.5 text-body-sm text-fg-muted">
                  {audienceLines(campaign.audience, t).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="results-title">
                <h3 id="results-title" className="card-title mb-2">
                  {t("Hasil")}
                </h3>
                <Results report={detail} />
              </section>

              <Recipients key={`${campaign.status}-${detail.total}`} campaignId={campaignId} active={live} />
            </div>
          )}
        </Async>
      </Modal>
      {launching && campaign ? (
        <LaunchDialog
          open
          onClose={() => setLaunching(false)}
          campaign={campaign}
          template={template}
          credits={settings?.credits}
          onLaunched={() => {
            setLaunching(false);
            refresh();
          }}
        />
      ) : null}
      {testing && campaign && template ? <TestSendDialog open onClose={() => setTesting(false)} template={template} variables={campaign.variables} headerMediaUrl={campaign.headerMediaUrl || undefined} /> : null}
      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        pending={pending}
        title={t("Batalkan kampanye?")}
        body={t("Pesan yang belum terkirim tidak akan dikirim lagi. Pesan yang sudah terkirim tetap sampai. Ini tidak bisa dibatalkan.")}
        confirmLabel={t("Batalkan kampanye")}
        onConfirm={async () => {
          if (await act("cancel", t("Kampanye dibatalkan."))) setCancelling(false);
        }}
      />
    </>
  );
}
