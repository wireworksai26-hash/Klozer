"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { PageHeader, Tabs } from "@/components/ui";
import ChannelsTab from "@/components/channels/ChannelsTab";
import RoutingTab from "@/components/channels/RoutingTab";

export default function ChannelsPage() {
  const { t } = useDashboard();
  const [tab, setTab] = useState("channels");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Saluran Chat")} description={t("Akun tempat pelanggan menghubungi toko Anda, dan cara chat dibagi ke tim.")} />
      <Tabs
        label={t("Bagian Saluran Chat")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "channels", label: t("Saluran") },
          { id: "routing", label: t("Pembagian chat") },
        ]}
      />
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "channels" ? <ChannelsTab /> : <RoutingTab />}
      </div>
    </div>
  );
}
