"use client";
import { useDashboard } from "@/context/DashboardContext";
import { formatRupiah } from "@/utils/plans";
import { Button } from "@/components/ui";

const DOC_LINK = "/dashboard/documentation?topik=biaya-whatsapp-meta";

/**
 * What Meta bills a WhatsApp number for: a red warning when Meta refuses messages over payment, and how much of this
 * month's free replies are left. `channel.metaUsage` is an estimate from the messages Klozer recorded.
 */
export default function MetaBilling({ channel }) {
  const { t } = useDashboard();
  const usage = channel.metaUsage;
  const paymentIssue = Boolean(channel.config?.paymentIssueAt);
  if (!usage && !paymentIssue) return null;

  const used = usage ? Math.min(usage.used, usage.freeTier) : 0;
  const percent = usage ? Math.round((used / usage.freeTier) * 100) : 0;
  const over = usage && usage.billable > 0;

  return (
    <div className="flex flex-col gap-2.5">
      {paymentIssue ? (
        <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 flex flex-col gap-2">
          <p className="text-label text-danger-700 font-bold m-0">{t("Meta menolak pesan dari nomor ini karena pembayaran")}</p>
          <p className="text-label text-danger-700 m-0">
            {t("Akun WhatsApp Business Anda belum punya metode pembayaran yang valid. Pasang di WhatsApp Manager milik Anda di Meta. Peringatan ini hilang sendiri setelah satu pesan berhasil terkirim.")}
          </p>
          <div>
            <Button variant="secondary" size="sm" href={DOC_LINK}>
              {t("Baca caranya")}
            </Button>
          </div>
        </div>
      ) : null}

      {usage ? (
        <div className="rounded-xl bg-sunken border border-line px-3.5 py-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-label text-fg font-bold">{t("Balasan bulan ini")}</span>
            <span className="text-label text-fg-muted tabular-nums">
              {t("{used} dari {free} gratis", { used: usage.used.toLocaleString("id-ID"), free: usage.freeTier.toLocaleString("id-ID") })}
            </span>
          </div>
          <div role="progressbar" aria-label={t("Jatah balasan gratis terpakai")} aria-valuemin={0} aria-valuemax={usage.freeTier} aria-valuenow={used} className="h-2 rounded-full bg-line overflow-hidden">
            <div className={`h-full rounded-full ${over ? "bg-danger-600" : percent >= 80 ? "bg-warning-600" : "bg-brand"}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="text-caption text-fg-subtle m-0">
            {over
              ? t("{count} balasan berbayar, perkiraan Rp {cost} (belum termasuk PPN 11%). Ditagih Meta ke akun WhatsApp Business Anda.", { count: usage.billable.toLocaleString("id-ID"), cost: formatRupiah(usage.estimatedCost) })
              : t("Sisa {left} balasan gratis. Perkiraan dari pesan yang tercatat di Klozer; angka resmi ada di tagihan Meta.", { left: usage.remainingFree.toLocaleString("id-ID") })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
