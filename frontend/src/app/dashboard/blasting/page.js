"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";
import CampaignsTab from "@/components/broadcast/CampaignsTab";
import ConsentTab from "@/components/broadcast/ConsentTab";
import SettingsTab from "@/components/broadcast/SettingsTab";
import TemplatesTab from "@/components/broadcast/TemplatesTab";

export default function BlastingPage() {
  const { t, isManager } = useDashboard();
  const [tab, setTab] = useState("campaigns");
  const templates = useApi("/broadcast/templates", { enabled: isManager });
  const channels = useApi("/channels", { enabled: isManager });

  if (!isManager) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("Smart Broadcast")} />
        <div className="bg-white rounded-2xl border border-line">
          <EmptyState icon="lock" title={t("Hanya untuk owner dan supervisor")} body={t("Broadcast dikelola oleh owner dan supervisor toko. Minta mereka untuk membuka halaman ini.")} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Smart Broadcast")} description={t("Kirim pesan WhatsApp ke banyak kontak dengan templat yang disetujui Meta, hanya ke kontak yang setuju.")} />
      <Tabs
        label={t("Bagian broadcast")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "campaigns", label: t("Kampanye") },
          { id: "templates", label: t("Templat") },
          { id: "consent", label: t("Persetujuan") },
          { id: "settings", label: t("Pengaturan") },
        ]}
      />
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "campaigns" ? <CampaignsTab templates={templates} channels={channels} onGoTemplates={() => setTab("templates")} /> : null}
        {tab === "templates" ? <TemplatesTab templates={templates} channels={channels} /> : null}
        {tab === "consent" ? <ConsentTab /> : null}
        {tab === "settings" ? <SettingsTab /> : null}
      </div>
    </div>
  );
}
