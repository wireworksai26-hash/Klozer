"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, SelectField } from "@/components/ui";
import PanelSection from "./PanelSection";

const ASSIGNABLE = ["cs", "supervisor", "owner"];

/** Who on the team holds this chat. Anyone can take a chat nobody has; managers can move it to someone else. */
export default function AssignmentSection({ lead }) {
  const { t, isManager, currentUser, refreshLeads } = useDashboard();
  const { run, pending } = useAction();
  const users = useApi("/users", { enabled: isManager });

  const mine = lead.csDbId && lead.csDbId === currentUser?.id;
  const staff = (users.data?.items || []).filter((u) => u.is_active && ASSIGNABLE.includes(u.role));

  const claim = async () => {
    const result = await run(() => api.post(`/leads/${lead.dbId}/claim`), { success: t("Chat ini sekarang milik Anda.") });
    // ALREADY_ASSIGNED: someone took it first; the notice says so, and the panel shows who has it
    if (result.ok || result.error?.code === "ALREADY_ASSIGNED") await refreshLeads().catch(() => {});
  };

  const assign = async (value) => {
    if (value === "") return;
    const userId = value === "auto" ? null : Number(value);
    const result = await run(() => api.post(`/leads/${lead.dbId}/assign`, { userId }), { success: t("Chat dipindahkan.") });
    if (result.ok) await refreshLeads().catch(() => {});
  };

  const options = [
    ...(lead.csDbId ? [] : [{ value: "", label: t("Belum ada CS") }]),
    { value: "auto", label: t("Pilih otomatis") },
    ...staff.map((u) => ({ value: String(u.id), label: u.id === currentUser?.id ? t("{name} (saya)", { name: u.name }) : u.name })),
  ];

  return (
    <PanelSection title={t("Penanganan chat")}>
      <p className="text-label text-fg-muted">
        {lead.csDbId ? (
          <>
            {t("CS")}: <span className="font-bold text-ink">{lead.cs}</span>
            {mine ? ` (${t("saya")})` : ""}
          </>
        ) : (
          t("Belum ada CS yang memegang chat ini.")
        )}
      </p>
      {!lead.csDbId ? (
        <Button size="sm" icon="userCheck" loading={pending} onClick={claim}>
          {t("Ambil chat ini")}
        </Button>
      ) : null}
      {isManager && users.data ? <SelectField label={t("Pindahkan ke")} value={lead.csDbId ? String(lead.csDbId) : ""} onChange={(e) => assign(e.target.value)} disabled={pending} options={options} /> : null}
    </PanelSection>
  );
}
