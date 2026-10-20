"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction } from "@/hooks/useApi";
import { fromLocalInput } from "@/hooks/useFormat";
import { Button, Modal, Switch, TextField } from "@/components/ui";
import { AudienceCount, useAudiencePreview } from "./AudienceFields";

/**
 * The last question before a campaign goes out: how many contacts, who is left out, when. Sends now or at a chosen time.
 * `credits` ({ remaining }) is optional and only used to warn when the credit is short.
 */
export default function LaunchDialog({ open, onClose, campaign, template, credits, onLaunched }) {
  const { t, notify } = useDashboard();
  const { run, pending } = useAction();
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState("");
  const [openedAt] = useState(() => Date.now());
  const marketing = template?.category === "marketing";
  const preview = useAudiencePreview({ channelId: campaign?.channelId, templateId: campaign?.templateId, audience: campaign?.audience || {}, enabled: open && Boolean(campaign) });

  const scheduledAt = schedule ? fromLocalInput(when) : null;
  const tooSoon = schedule && (!scheduledAt || new Date(scheduledAt).getTime() < openedAt + 120_000);
  const count = preview.data?.count;
  const short = credits && typeof count === "number" && count > credits.remaining;

  const launch = async () => {
    const out = await run(() => api.post(`/broadcast/campaigns/${campaign.id}/launch`, scheduledAt ? { scheduledAt } : {}), { success: schedule ? t("Kampanye dijadwalkan.") : t("Kampanye mulai dikirim.") });
    if (!out.ok) return;
    if (out.data.creditsShort) notify("error", t("Kredit blast ({remaining}) kurang dari jumlah penerima ({count}). Kampanye berhenti saat kredit habis.", { remaining: out.data.credits.remaining, count: out.data.recipients }));
    onLaunched(out.data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Jalankan kampanye")}
      description={campaign?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button icon="send" loading={pending} disabled={preview.loading || Boolean(preview.error) || count === 0 || (schedule && tooSoon)} onClick={launch}>
            {schedule ? t("Jadwalkan kampanye") : t("Kirim sekarang")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-fg">
          {typeof count === "number" ? t("Pesan akan dikirim ke {count} kontak.", { count: count.toLocaleString("id-ID") }) : t("Menghitung penerima...")}{" "}
          {marketing ? t("Hanya kontak yang sudah setuju menerima promosi yang disertakan.") : t("Kontak yang berhenti menerima pesan tidak dikirimi.")}
        </p>
        {open && campaign ? <AudienceCount preview={preview} marketing={marketing} /> : null}
        {short ? <p role="alert" className="text-label text-danger-700">{t("Sisa kredit blast {remaining}, kurang dari jumlah penerima. Kampanye berhenti sendiri saat kredit habis.", { remaining: credits.remaining })}</p> : null}
        <p className="text-label text-fg-muted">{t("Daftar penerima dibekukan saat kampanye dimulai. Persetujuan dicek lagi tepat sebelum tiap pesan dikirim.")}</p>
        <Switch label={t("Kirim di waktu tertentu")} checked={schedule} onChange={setSchedule} />
        {schedule ? <TextField label={t("Waktu kirim")} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={when && tooSoon ? t("Pilih waktu minimal 2 menit dari sekarang.") : undefined} required /> : null}
      </div>
    </Modal>
  );
}
