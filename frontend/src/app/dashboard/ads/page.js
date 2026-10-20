"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";
import CapiTab from "@/components/ads/CapiTab";
import MetaAdsTab from "@/components/ads/MetaAdsTab";
import RoasTab from "@/components/ads/RoasTab";
import SpendTab from "@/components/ads/SpendTab";

const REPORT_ROLES = ["owner", "supervisor", "finance", "superadmin"];

export default function AdsPage() {
  const { t, serverRole, isManager, activeInstitution } = useDashboard();
  const [tab, setTab] = useState("roas");
  const [spendVersion, setSpendVersion] = useState(0);

  if (!REPORT_ROLES.includes(serverRole)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("Iklan dan ROAS")} />
        <div className="bg-white rounded-2xl border border-line">
          <EmptyState icon="lock" title={t("Hanya untuk owner, supervisor, dan finance")} body={t("Laporan iklan memuat biaya dan omzet toko. Minta owner untuk membuka halaman ini.")} />
        </div>
      </div>
    );
  }

  const capiOn = activeInstitution?.modules?.metaCapi !== false;
  const tabs = [
    { id: "roas", label: t("ROAS") },
    { id: "spend", label: t("Biaya iklan") },
    { id: "meta", label: t("Meta Ads") },
    ...(capiOn ? [{ id: "capi", label: t("Conversions API") }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Iklan dan ROAS")} description={t("Berapa omzet yang kembali dari tiap rupiah biaya iklan, dihitung dari pesanan berbayar milik kontak yang datang dari iklan.")} />
      <Tabs label={t("Bagian iklan")} value={tab} onChange={setTab} tabs={tabs} />
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "roas" ? <RoasTab key={spendVersion} /> : null}
        {tab === "spend" ? <SpendTab key={spendVersion} /> : null}
        {tab === "meta" ? <MetaAdsTab canEdit={isManager} onSynced={() => setSpendVersion((v) => v + 1)} /> : null}
        {tab === "capi" && capiOn ? <CapiTab canEdit={isManager} /> : null}
      </div>
    </div>
  );
}
