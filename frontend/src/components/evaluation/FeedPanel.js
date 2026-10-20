"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, EmptyState, SelectField } from "@/components/ui";
import CorrectModal from "./CorrectModal";
import PagedList from "./PagedList";
import ReplyCard from "./ReplyCard";
import { FEED_PAGE_SIZE } from "./limits";

/** The list of replies for one filter. Ratings and corrections are kept here so the list never refetches under the reader. */
function Feed({ filter, canCorrect, onChanged, onShowAll }) {
  const { t } = useDashboard();
  const { run } = useAction();
  const [changes, setChanges] = useState({}); // messageId -> fields that changed since the page loaded
  const [busyId, setBusyId] = useState(null);
  const [correcting, setCorrecting] = useState(null);

  const patch = (messageId, fields) => setChanges((prev) => ({ ...prev, [messageId]: { ...prev[messageId], ...fields } }));

  const rate = async (item, rating) => {
    setBusyId(item.messageId);
    const result = await run(() => api.post(`/ai/evaluation/${item.messageId}/feedback`, { rating }), { success: rating ? t("Penilaian tersimpan.") : t("Penilaian dihapus.") });
    setBusyId(null);
    if (result.ok) {
      patch(item.messageId, { feedback: result.data.feedback });
      onChanged();
    }
  };

  const corrected = (item, correction) => {
    patch(item.messageId, { feedback: "bad", correction: { id: correction.id, correctedReply: correction.correctedReply, isActive: correction.isActive } });
    setCorrecting(null);
    onChanged();
  };

  const renderEmpty = () =>
    filter === "all" ? (
      <div className="bg-white border border-line rounded-2xl">
        <EmptyState icon="message" title={t("Belum ada balasan AI")} body={t("Balasan muncul di sini setelah AI menjawab pelanggan. Anda bisa menilainya Baik atau Kurang.")} action={<Button href="/dashboard/chat" icon="message">{t("Buka chat")}</Button>} />
      </div>
    ) : (
      <div className="bg-white border border-line rounded-2xl">
        <EmptyState icon="filter" title={t("Tidak ada balasan dengan status ini")} action={<Button variant="secondary" onClick={onShowAll}>{t("Tampilkan semua balasan")}</Button>} />
      </div>
    );

  return (
    <>
      <PagedList
        path="/ai/evaluation"
        query={{ filter }}
        limit={FEED_PAGE_SIZE}
        renderEmpty={renderEmpty}
        renderItem={(raw) => {
          const item = { ...raw, ...changes[raw.messageId] };
          return <ReplyCard key={item.messageId} item={item} canCorrect={canCorrect} busy={busyId === item.messageId} onRate={(rating) => rate(item, rating)} onCorrect={() => setCorrecting(item)} />;
        }}
      />
      {correcting ? <CorrectModal item={correcting} onClose={() => setCorrecting(null)} onSaved={(correction) => corrected(correcting, correction)} /> : null}
    </>
  );
}

export default function FeedPanel({ canCorrect, onChanged }) {
  const { t } = useDashboard();
  const [filter, setFilter] = useState("all");
  const options = [
    { value: "all", label: t("Semua balasan") },
    { value: "unreviewed", label: t("Belum ditinjau") },
    { value: "good", label: t("Dinilai baik") },
    { value: "bad", label: t("Dinilai kurang") },
    { value: "corrected", label: t("Dikoreksi") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-[16rem]">
        <SelectField label={t("Tampilkan")} value={filter} onChange={(e) => setFilter(e.target.value)} options={options} />
      </div>
      <Feed key={filter} filter={filter} canCorrect={canCorrect} onChanged={onChanged} onShowAll={() => setFilter("all")} />
    </div>
  );
}
