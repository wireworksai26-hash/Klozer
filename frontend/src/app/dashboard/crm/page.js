"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { PageHeader, Tabs } from "@/components/ui";
import PipelineTab from "@/components/crm/PipelineTab";
import SegmentsTab from "@/components/crm/SegmentsTab";
import ContactProfile from "@/components/crm/ContactProfile";

function CrmScreen() {
  const { t, refreshLeads } = useDashboard();
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") === "segments" ? "segments" : "pipeline";
  const [profileId, setProfileId] = useState(null);

  const tabs = useMemo(() => [{ id: "pipeline", label: t("Pipeline") }, { id: "segments", label: t("Segmen") }], [t]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Pipeline dan Segmen")} description={t("Lihat di tahap mana tiap pelanggan berada, dan simpan kelompok pelanggan yang perlu dihubungi.")} />
      <Tabs label={t("Bagian CRM")} tabs={tabs} value={tab} onChange={(id) => router.replace(id === "pipeline" ? "/dashboard/crm" : "/dashboard/crm?tab=segments")} />
      {tab === "pipeline" ? <PipelineTab onOpen={setProfileId} /> : <SegmentsTab onOpen={setProfileId} />}
      <ContactProfile leadId={profileId} onClose={() => setProfileId(null)} onChanged={() => refreshLeads?.()} />
    </div>
  );
}

// useSearchParams needs a Suspense boundary so the page can still be prerendered.
export default function CrmPage() {
  return (
    <Suspense fallback={null}>
      <CrmScreen />
    </Suspense>
  );
}
