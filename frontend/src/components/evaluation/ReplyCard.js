"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { Badge, Button } from "@/components/ui";

function Block({ label, tone = "text-fg", children }) {
  return (
    <div className="min-w-0">
      <div className="text-label font-semibold text-fg-muted">{label}</div>
      <p className={`text-body-sm ${tone} whitespace-pre-wrap break-words mt-0.5`}>{children}</p>
    </div>
  );
}

/** One AI reply to review: what the customer asked, what the AI said, its sources, and the rating controls. */
export default function ReplyCard({ item, canCorrect, busy, onRate, onCorrect }) {
  const { t } = useDashboard();
  const fmt = useFormat();
  const sources = Array.isArray(item.sources) ? item.sources : [];
  const corrected = Boolean(item.correction);

  return (
    <article className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-fg break-words">{item.leadName || "-"}</div>
          <div className="text-caption text-fg-subtle">
            <time dateTime={item.createdAt} title={fmt.dateTime(item.createdAt)}>
              {fmt.relative(item.createdAt)}
            </time>
            {item.model ? <span>{` / ${item.model}`}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {corrected ? <Badge tone="accent">{t("Dikoreksi")}</Badge> : null}
          {item.feedback === "good" ? <Badge tone="success">{t("Dinilai baik")}</Badge> : null}
          {item.feedback === "bad" ? <Badge tone="danger">{t("Dinilai kurang")}</Badge> : null}
          {!item.feedback && !corrected ? <Badge>{t("Belum ditinjau")}</Badge> : null}
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <Block label={t("Pesan pelanggan")}>{item.customerMessage || "-"}</Block>
        <Block label={t("Balasan AI")}>{item.aiReply}</Block>
        {corrected ? (
          <Block label={item.correction.isActive ? t("Jawaban yang benar") : t("Jawaban yang benar (nonaktif)")}>{item.correction.correctedReply}</Block>
        ) : null}
      </div>

      {sources.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-label font-semibold text-fg-muted">{t("Dokumen yang dipakai")}</span>
          {sources.map((source) => (
            <Badge key={source.documentId ?? source.title} tone="brand">
              {source.title}
            </Badge>
          ))}
        </div>
      ) : null}

      <div role="group" aria-label={t("Nilai balasan ini")} className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={item.feedback === "good" ? "primary" : "secondary"} icon="thumbUp" aria-pressed={item.feedback === "good"} disabled={busy} onClick={() => onRate(item.feedback === "good" ? null : "good")}>
          {t("Baik")}
        </Button>
        <Button size="sm" variant={item.feedback === "bad" ? "danger" : "secondary"} icon="thumbDown" aria-pressed={item.feedback === "bad"} disabled={busy} onClick={() => onRate(item.feedback === "bad" ? null : "bad")}>
          {t("Kurang")}
        </Button>
        {canCorrect ? (
          <Button size="sm" variant="ghost" icon="edit" onClick={onCorrect}>
            {corrected ? t("Ubah koreksi") : t("Perbaiki jawaban")}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
