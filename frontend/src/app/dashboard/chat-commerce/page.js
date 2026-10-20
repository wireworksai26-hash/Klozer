"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { PageHeader, Tabs } from "@/components/ui";
import SettingsTab from "@/components/commerce/SettingsTab";
import DraftsTab from "@/components/commerce/DraftsTab";
import FollowupsTab from "@/components/commerce/FollowupsTab";

export default function ChatCommercePage() {
  const { t, isManager } = useDashboard();
  const [tab, setTab] = useState("drafts");

  const tabs = [
    { id: "settings", label: t("Pengaturan") },
    { id: "drafts", label: t("Pesanan yang sedang disusun") },
    ...(isManager ? [{ id: "followups", label: t("Pengingat") }] : []),
  ];
  const active = tabs.some((x) => x.id === tab) ? tab : "drafts";
  const goSettings = () => setTab("settings");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Pesanan di Chat")} description={t("AI mengambil pesanan sampai pelanggan mengonfirmasi, dari semua saluran chat.")} />
      <Tabs label={t("Bagian Pesanan di Chat")} value={active} onChange={setTab} tabs={tabs} />
      <div role="tabpanel" aria-labelledby={`tab-${active}`}>
        {active === "settings" ? <SettingsTab /> : null}
        {active === "drafts" ? <DraftsTab onOpenSettings={goSettings} /> : null}
        {active === "followups" ? <FollowupsTab onOpenSettings={goSettings} /> : null}
      </div>
    </div>
  );
}
