"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { Async, EmptyState, PageHeader } from "@/components/ui";
import FastPathSettings from "@/components/fastpath/FastPathSettings";
import FastPathStats from "@/components/fastpath/FastPathStats";

/** Replies made by code instead of the AI: what is answered that way, and how many tokens that saved. */
export default function FastPathPage() {
  const { t, isManager, role } = useDashboard();
  const allowed = isManager && role !== "superadmin";
  const query = useApi("/ai/fast-path", { enabled: allowed });

  if (!allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("Jalur Cepat")} />
        <EmptyState icon="lock" title={t("Hanya owner dan supervisor")} body={t("Minta owner atau supervisor toko Anda mengatur Jalur Cepat.")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Jalur Cepat")} description={t("Pertanyaan rutin seperti rekening dan daftar produk dijawab langsung dari data toko, tanpa token. Yang perlu ngobrol atau rumit tetap dijawab AI, dan bila AI tidak yakin, diteruskan ke tim CS.")} />
      <FastPathStats />
      <Async query={query} loadingLabel={t("Memuat pengaturan...")}>
        {(data) => <FastPathSettings key={JSON.stringify(data.data)} settings={data.data} topics={data.topics} limits={data.limits} onSaved={query.reload} />}
      </Async>
    </div>
  );
}
