"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";
import ApiKeysPanel from "@/components/integrations/ApiKeysPanel";
import WebhooksPanel from "@/components/integrations/WebhooksPanel";
import EventsPanel from "@/components/integrations/EventsPanel";

export default function IntegrationsPage() {
  const { t, isManager } = useDashboard();
  const [tab, setTab] = useState("keys");
  const catalog = useApi("/integrations/events", { enabled: isManager });

  if (!isManager) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("API dan Webhook")} />
        <div className="bg-white rounded-2xl border border-line">
          <EmptyState icon="lock" title={t("Hanya untuk owner dan supervisor")} body={t("API key dan webhook memberi akses ke data toko, jadi hanya owner dan supervisor yang bisa mengelolanya.")} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("API dan Webhook")} description={t("Hubungkan Klozer ke n8n, Make, Zapier, atau kode Anda: API key untuk mengambil dan menulis data, webhook untuk menerima kabar.")} />
      <Tabs
        label={t("Bagian API dan Webhook")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "keys", label: t("API key") },
          { id: "webhooks", label: t("Webhook") },
          { id: "events", label: t("Daftar event") },
        ]}
      />
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "keys" ? <ApiKeysPanel /> : null}
        {tab === "webhooks" ? <WebhooksPanel catalog={catalog} /> : null}
        {tab === "events" ? <EventsPanel catalog={catalog} /> : null}
      </div>
    </div>
  );
}
