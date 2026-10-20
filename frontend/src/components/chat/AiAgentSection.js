"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { SelectField, Switch } from "@/components/ui";
import PanelSection from "./PanelSection";

/**
 * Which AI agent answers this chat, and whether it stays there. Only exists when the package has several agents:
 * with the switch off, or when the server refuses the list, nothing is drawn.
 */
export default function AiAgentSection({ lead }) {
  const { t, activeInstitution, refreshLeads } = useDashboard();
  const { run, pending } = useAction();
  const enabled = activeInstitution?.modules?.multiAgent !== false;
  const agents = useApi("/ai/agents", { enabled });

  if (!enabled || agents.error || !agents.data) return null;
  const list = (agents.data.data || []).filter((a) => a.isActive || a.id === lead.aiAgentId);
  if (!list.length) return null;

  const save = async (agentId, pinned) => {
    const result = await run(() => api.put(`/leads/${lead.dbId}/agent`, { agentId, pinned }), { success: t("Agen untuk chat ini disimpan.") });
    if (result.ok) await refreshLeads().catch(() => {});
  };

  return (
    <PanelSection title={t("Agen AI||singular")}>
      <SelectField
        label={t("Agen yang menjawab")}
        value={lead.aiAgentId ? String(lead.aiAgentId) : ""}
        onChange={(e) => save(e.target.value ? Number(e.target.value) : null, lead.aiAgentPinned)}
        disabled={pending}
        placeholder={t("Pilih otomatis")}
        options={list.map((a) => ({ value: String(a.id), label: a.isActive ? a.name : t("{name} (nonaktif)", { name: a.name }) }))}
      />
      <Switch
        checked={Boolean(lead.aiAgentId) && lead.aiAgentPinned}
        onChange={(pinned) => save(lead.aiAgentId, pinned)}
        disabled={pending || !lead.aiAgentId}
        label={t("Kunci pada agen ini")}
        description={lead.aiAgentId ? t("Chat ini tidak dipindah ke agen lain secara otomatis.") : t("Pilih agen dulu untuk mengunci.")}
      />
    </PanelSection>
  );
}
