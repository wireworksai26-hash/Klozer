"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Badge, Button, Card, EmptyState, TextField } from "@/components/ui";

const QUERY_MAX = 500;

/** Type a customer-style question and see which passages the AI would read. */
export default function SearchTest() {
  const { t, locale } = useDashboard();
  const { run, pending } = useAction();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const text = question.trim();
    if (!text) return;
    const res = await run(() => api.post("/knowledge/search", { query: text }));
    if (res.ok) setResult({ asked: text, items: res.data.items ?? [] });
  };

  return (
    <Card title={t("Uji pencarian")} description={t("Tulis pertanyaan seperti dari pelanggan untuk memeriksa apakah dokumen Anda sudah menjawabnya.")}>
      <form onSubmit={submit} className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <TextField label={t("Pertanyaan pelanggan")} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={QUERY_MAX} placeholder={t("Tulis satu pertanyaan")} />
        </div>
        <Button type="submit" icon="search" loading={pending} disabled={!question.trim()}>
          {t("Cari di dokumen")}
        </Button>
      </form>

      {result ? (
        <div className="mt-5" aria-live="polite">
          {result.items.length === 0 ? (
            <EmptyState icon="search" title={t("Tidak ada bagian yang cocok")} body={t("Hanya dokumen aktif yang dicari. Untuk pertanyaan ini AI akan menjawab dari katalog dan persona saja.")} />
          ) : (
            <ol className="flex flex-col gap-3">
              {result.items.map((item, index) => (
                <li key={item.id} className="border border-line rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-label font-semibold text-fg">{item.title}</span>
                    <Badge tone={index === 0 ? "brand" : "neutral"}>{t("Skor {score}", { score: Number(item.score).toLocaleString(locale,{ maximumFractionDigits: 2 }) })}</Badge>
                  </div>
                  <p className="text-body-sm text-fg-muted mt-2 whitespace-pre-wrap break-words">{item.content}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </Card>
  );
}
