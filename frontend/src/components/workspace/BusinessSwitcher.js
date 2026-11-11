"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { switchBusiness } from "./switchBusiness";

/**
 * Header control for an owner whose workspace holds several businesses. Picking another business starts a session for that
 * business's owner account, then reloads, so every screen and every request after it reads that one business.
 * A native select keeps it keyboard and screen reader friendly with no extra code.
 */
export default function BusinessSwitcher({ workspace, currentInstitutionId }) {
  const { t, notify } = useDashboard();
  const [busy, setBusy] = useState(false);
  if (!workspace || workspace.institutions.length < 2) return null;

  const change = async (e) => {
    const institutionId = Number(e.target.value);
    if (!institutionId || institutionId === currentInstitutionId) return;
    setBusy(true);
    try {
      await switchBusiness(institutionId);
    } catch (err) {
      notify("error", err.message || t("Gagal berpindah bisnis."));
      setBusy(false);
    }
  };

  return (
    <label className="flex items-center gap-2 text-label text-fg-muted">
      <span className="sr-only">{t("Bisnis aktif")}</span>
      <select
        value={currentInstitutionId}
        onChange={change}
        disabled={busy}
        aria-label={t("Bisnis aktif")}
        className="h-9 max-w-[132px] sm:max-w-[200px] truncate rounded-lg border border-line bg-white px-3 text-body-sm font-medium text-ink cursor-pointer outline-none focus:border-brand disabled:opacity-60"
      >
        {workspace.institutions.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </label>
  );
}
