"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconButton } from "@/components/ui";
import { useAgentText } from "./labels";

const PRESET_COUNT = 3;

function Fact({ value, label }) {
  return (
    <div className="min-w-0">
      <dd className="text-body font-bold text-fg tabular-nums m-0">{value}</dd>
      <dt className="text-caption text-fg-muted">{label}</dt>
    </div>
  );
}

function AgentCard({ agent, isManager, busy, onEdit, onToggle, onDelete }) {
  const { t } = useDashboard();
  const { number } = useFormat();
  const text = useAgentText();
  const stats = agent.stats;
  const rated = stats.good + stats.bad;
  const hasStats = stats.replies > 0 || stats.currentConversations > 0;
  const toolCount = agent.capabilities.tools.length;

  return (
    <Card className={agent.isActive ? "" : "bg-soft"}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-body font-bold text-fg break-words">{agent.name}</h3>
              <Badge tone={agent.isActive ? "success" : "neutral"}>{agent.isActive ? t("Aktif") : t("Nonaktif")}</Badge>
              {agent.isDefault ? <Badge tone="brand">{t("Bawaan")}</Badge> : null}
            </div>
            <p className="text-label text-fg-muted mt-1 break-words">{agent.description}</p>
          </div>
          {isManager ? (
            <div className="flex flex-shrink-0 items-center">
              <IconButton icon="edit" label={t("Ubah agen {name}", { name: agent.name })} onClick={() => onEdit(agent)} />
              <IconButton icon="trash" label={t("Hapus agen {name}", { name: agent.name })} onClick={() => onDelete(agent)} />
            </div>
          ) : null}
        </div>

        <p className="text-label text-fg-muted">
          {text.commerceLabel(agent.capabilities.commerce)}
          {" · "}
          {toolCount ? t("{count} alat", { count: toolCount }) : t("Tanpa alat")}
          {" · "}
          {t("Prioritas {priority}", { priority: agent.priority })}
        </p>

        {hasStats ? (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 m-0 pt-3 border-t border-line">
            <Fact value={number(stats.replies)} label={t("balasan")} />
            <Fact value={number(stats.conversations)} label={t("percakapan")} />
            <Fact value={number(stats.currentConversations)} label={t("sedang ditangani")} />
            {rated ? <Fact value={`${number(stats.good)} / ${number(stats.bad)}`} label={t("dinilai baik / buruk")} /> : null}
          </dl>
        ) : (
          <p className="text-label text-fg-subtle pt-3 border-t border-line">{t("Belum ada balasan dalam 30 hari terakhir.")}</p>
        )}

        {isManager ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" icon={agent.isActive ? "pause" : "play"} loading={busy} onClick={() => onToggle(agent)}>
              {agent.isActive ? t("Nonaktifkan") : t("Aktifkan")}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/** The agents of the shop as cards, with the plan limit and the actions to edit, switch off or delete. */
export default function AgentList({ agents, limit, isManager, onEdit, onCreate, onChanged }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const atLimit = agents.length >= limit;

  const toggle = async (agent) => {
    setBusyId(agent.id);
    const res = await run(() => api.put(`/ai/agents/${agent.id}`, { isActive: !agent.isActive }), { success: agent.isActive ? t("Agen dinonaktifkan.") : t("Agen diaktifkan.") });
    setBusyId(null);
    if (res.ok) onChanged();
  };

  const confirmDelete = async () => {
    const res = await run(() => api.delete(`/ai/agents/${toDelete.id}`), { success: t("Agen dihapus.") });
    if (res.ok) {
      setToDelete(null);
      onChanged();
    }
  };

  const createPresets = async () => {
    const res = await run(() => api.post("/ai/agents/presets", {}), { success: t("3 agen awal dibuat. Sesuaikan petunjuknya dengan toko Anda.") });
    if (res.ok || res.error?.code === "AGENTS_EXIST" || res.error?.code === "AGENT_LIMIT") onChanged();
  };

  if (!agents.length) {
    const presetsBlocked = limit < PRESET_COUNT;
    return (
      <Card>
        <EmptyState
          icon="agents"
          title={t("Belum ada agen AI")}
          body={t("Tanpa agen, AI menjawab seperti biasa dengan persona toko. Buat agen bila Anda ingin peran terpisah, misalnya penjualan dan layanan pesanan.")}
          action={
            isManager ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap justify-center gap-2">
                  <Button icon="plus" loading={pending} disabled={presetsBlocked} onClick={createPresets}>
                    {t("Pakai 3 agen awal")}
                  </Button>
                  <Button variant="secondary" onClick={onCreate}>
                    {t("Buat agen sendiri")}
                  </Button>
                </div>
                {presetsBlocked ? <p className="text-caption text-fg-muted">{t("Paket Anda dibatasi {limit} agen, kurang dari 3 agen awal.", { limit })}</p> : null}
              </div>
            ) : null
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label text-fg-muted">
          {t("{count} dari {limit} agen dipakai.", { count: agents.length, limit })} {t("Angka balasan dan percakapan untuk 30 hari terakhir.")}
        </p>
        {isManager ? (
          <div className="flex flex-col items-end gap-1">
            <Button icon="plus" disabled={atLimit} onClick={onCreate}>
              {t("Buat agen")}
            </Button>
            {atLimit ? <p className="text-caption text-fg-muted">{t("Batas paket tercapai: {limit} agen.", { limit })}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} isManager={isManager} busy={busyId === agent.id} onEdit={onEdit} onToggle={toggle} onDelete={setToDelete} />
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        pending={pending}
        title={t("Hapus agen {name}?", { name: toDelete?.name ?? "" })}
        body={t("Percakapan yang ditangani agen ini kembali ke pemilihan otomatis. Agen yang dihapus tidak bisa dikembalikan.")}
        confirmLabel={t("Hapus agen")}
      />
    </div>
  );
}
