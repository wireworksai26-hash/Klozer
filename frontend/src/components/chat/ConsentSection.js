"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { SelectField, Switch } from "@/components/ui";
import PanelSection from "./PanelSection";

/** Promotion consent for broadcasts, and the switch that stops automatic follow-up messages to this customer. */
export default function ConsentSection({ lead }) {
  const { t, refreshLeads } = useDashboard();
  const { run, pending } = useAction();

  const setConsent = async (state) => {
    const result = await run(() => api.put(`/leads/${lead.dbId}/consent`, { state }), { success: t("Persetujuan promosi disimpan.") });
    if (result.ok) await refreshLeads().catch(() => {});
  };
  const setOptOut = async (optOut) => {
    const result = await run(() => api.put(`/leads/${lead.dbId}/followup-opt-out`, { optOut }), { success: optOut ? t("Follow-up otomatis dimatikan.") : t("Follow-up otomatis dinyalakan.") });
    if (result.ok) await refreshLeads().catch(() => {});
  };

  return (
    <PanelSection title={t("Pesan promosi")}>
      <SelectField
        label={t("Persetujuan promosi")}
        value={lead.marketingConsent}
        onChange={(e) => setConsent(e.target.value)}
        disabled={pending}
        options={[
          { value: "unknown", label: t("Belum ada persetujuan") },
          { value: "opted_in", label: t("Setuju menerima promosi") },
          { value: "opted_out", label: t("Menolak promosi") },
        ]}
      />
      <Switch checked={lead.followupOptOut} onChange={setOptOut} disabled={pending} label={t("Matikan follow-up otomatis")} description={t("Pelanggan ini tidak dikirimi pesan tindak lanjut otomatis.")} />
    </PanelSection>
  );
}
