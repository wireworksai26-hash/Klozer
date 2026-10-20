"use client";
import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { Async, PageHeader, Tabs } from "@/components/ui";
import AgentList from "@/components/agents/AgentList";
import AgentEditor from "@/components/agents/AgentEditor";
import RoutingSettings from "@/components/agents/RoutingSettings";
import RoutePreview from "@/components/agents/RoutePreview";
import RoutingLog from "@/components/agents/RoutingLog";
import ToolActivity from "@/components/agents/ToolActivity";

export default function AgentsPage() {
  const { t, isManager } = useDashboard();
  const agentsQuery = useApi("/ai/agents");
  const [tab, setTab] = useState("agents");
  // `false` closed, `null` a new agent, an agent object to edit it
  const [editing, setEditing] = useState(false);

  const tabs = useMemo(() => {
    const all = [{ id: "agents", label: t("Agen") }, { id: "routing", label: t("Pemilihan") }];
    if (isManager) all.push({ id: "preview", label: t("Uji aturan") }, { id: "log", label: t("Log pemilihan") }, { id: "tools", label: t("Aktivitas alat") });
    return all;
  }, [t, isManager]);
  const activeTab = tabs.some((x) => x.id === tab) ? tab : "agents";
  const agents = agentsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Agen AI")} description={t("Beberapa peran AI dalam satu toko, misalnya penjualan dan layanan pesanan. Tiap chat ditangani satu agen.")} />
      <Tabs tabs={tabs} value={activeTab} onChange={setTab} label={t("Bagian Agen AI")} />

      <div role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="flex flex-col gap-6">
        {activeTab === "agents" ? (
          <Async query={agentsQuery} loadingLabel={t("Memuat agen...")}>
            {(res) => <AgentList agents={res.data} limit={res.limit} isManager={isManager} onEdit={setEditing} onCreate={() => setEditing(null)} onChanged={agentsQuery.reload} />}
          </Async>
        ) : null}
        {activeTab === "routing" ? <RoutingSettings canEdit={isManager} /> : null}
        {activeTab === "preview" ? <RoutePreview agents={agents} /> : null}
        {activeTab === "log" ? <RoutingLog /> : null}
        {activeTab === "tools" ? <ToolActivity agents={agents} /> : null}
      </div>

      {editing !== false ? (
        <AgentEditor
          key={editing?.id ?? "new"}
          agent={editing}
          agents={agents}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            agentsQuery.reload();
          }}
        />
      ) : null}
    </div>
  );
}
