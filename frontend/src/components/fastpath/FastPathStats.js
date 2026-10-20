"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Stat, Tabs } from "@/components/ui";

/** How many replies each path made lately, and the tokens the code answers saved. */
export default function FastPathStats() {
  const { t } = useDashboard();
  const { number } = useFormat();
  const [days, setDays] = useState("30");
  const query = useApi("/ai/fast-path/stats", { query: { days } });
  const tabs = [
    { id: "7", label: t("7 hari") },
    { id: "30", label: t("30 hari") },
    { id: "90", label: t("90 hari") },
  ];

  return (
    <section aria-label={t("Hasil Jalur Cepat")} className="flex flex-col gap-4">
      <Tabs label={t("Rentang waktu")} tabs={tabs} value={days} onChange={setDays} />
      <Async query={query} loadingLabel={t("Memuat hasil...")}>
        {({ data }) => (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label={t("Dijawab Jalur Cepat")} value={number(data.fast)} note={t("Tanpa token")} />
              <Stat label={t("Dijawab alur pesanan")} value={number(data.rules)} note={t("Tanpa token")} />
              <Stat label={t("Dijawab AI")} value={number(data.model)} note={data.averageTokensPerAiReply ? t("Rata-rata {n} token per balasan", { n: number(data.averageTokensPerAiReply) }) : undefined} />
              <Stat label={t("Perkiraan token hemat")} value={number(data.estimatedTokensSaved)} note={t("Jawaban Jalur Cepat dikali rata-rata token AI")} />
            </div>
            {data.fast + data.rules + data.model === 0 ? <p className="text-label text-fg-muted">{t("Belum ada balasan otomatis di rentang ini.")}</p> : null}
          </>
        )}
      </Async>
    </section>
  );
}
