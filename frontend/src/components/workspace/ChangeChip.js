"use client";
import { useDashboard } from "@/context/DashboardContext";

/**
 * A change against the period before, as a signed percentage. With nothing to compare to (the earlier period had no sales)
 * it says so in words instead of showing a made-up figure. Up is green and down is red only because that is what it means.
 */
export default function ChangeChip({ value, className = "" }) {
  const { t, locale } = useDashboard();
  if (value === null || value === undefined) {
    return <span className={`text-caption text-fg-subtle ${className}`}>{t("belum ada pembanding")}</span>;
  }
  const up = value > 0;
  const flat = value === 0;
  const text = `${up ? "+" : ""}${Number(value).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const tone = flat ? "text-fg-muted" : up ? "text-success-700" : "text-danger-700";
  return (
    <span className={`inline-flex items-center gap-1 text-label font-medium tabular-nums ${tone} ${className}`} aria-label={`${up ? t("naik") : flat ? t("tetap") : t("turun")} ${text.replace("+", "")}`}>
      <span aria-hidden="true">{flat ? "=" : up ? "▲" : "▼"}</span>
      {text}
    </span>
  );
}
