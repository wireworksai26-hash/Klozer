"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { ErrorState, PageHeader, Select, Stat, Tabs } from "@/components/ui";
import CorrectionsPanel from "@/components/evaluation/CorrectionsPanel";
import FeedPanel from "@/components/evaluation/FeedPanel";

const PERIODS = [7, 30, 90];

export default function AiEvaluationPage() {
  const { t, isManager } = useDashboard();
  const fmt = useFormat();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState("replies");
  const summary = useApi("/ai/evaluation/summary", { query: { days } });
  const s = summary.data;
  const count = (key) => (s && s[key] !== undefined && s[key] !== null ? fmt.number(s[key]) : "-");

  const tabs = [
    { id: "replies", label: t("Balasan AI") },
    { id: "corrections", label: t("Koreksi dan aturan") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("Evaluasi AI")}
        description={t("Tinjau balasan AI, nilai, dan perbaiki jawaban yang salah supaya AI menjawab lebih tepat.")}
        actions={
          <Select aria-label={t("Periode ringkasan")} value={days} onChange={(e) => setDays(Number(e.target.value))} className="sm:w-auto">
            {PERIODS.map((n) => (
              <option key={n} value={n}>
                {t("{days} hari terakhir", { days: n })}
              </option>
            ))}
          </Select>
        }
      />

      {summary.error && !s ? (
        <div className="bg-white border border-line rounded-2xl">
          <ErrorState error={summary.error} onRetry={summary.reload} />
        </div>
      ) : (
        <section aria-label={t("Ringkasan balasan AI")} aria-busy={!s} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat label={t("Balasan AI")} value={count("total")} />
          <Stat label={t("Dinilai baik")} value={count("good")} />
          <Stat label={t("Dinilai kurang")} value={count("bad")} />
          <Stat label={t("Dikoreksi")} value={count("corrected")} />
          <Stat label={t("Belum ditinjau")} value={count("unreviewed")} />
          <Stat label={t("Tingkat persetujuan")} value={s ? fmt.percent(s.approvalRate) : "-"} note={t("dari balasan yang dinilai")} />
        </section>
      )}

      {isManager ? <Tabs tabs={tabs} value={tab} onChange={setTab} label={t("Bagian evaluasi")} /> : null}

      <div role={isManager ? "tabpanel" : undefined} aria-labelledby={isManager ? `tab-${tab}` : undefined}>
        {tab === "corrections" && isManager ? <CorrectionsPanel /> : <FeedPanel canCorrect={isManager} onChanged={summary.reload} />}
      </div>
    </div>
  );
}
