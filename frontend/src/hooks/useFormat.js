"use client";
import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { relativeTimeKey } from "@/utils/mappers.mjs";

const TIME_ZONE = "Asia/Jakarta";

/** Dates, times and amounts in the dashboard's language. All return "-" for a missing value. */
export function useFormat() {
  const { locale, t } = useDashboard();

  return useMemo(() => {
    const dateTime = (iso) => (iso ? new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }) : "-");
    const date = (iso) => (iso ? new Date(iso).toLocaleDateString(locale, { dateStyle: "medium", timeZone: TIME_ZONE }) : "-");
    const relative = (iso) => {
      const r = relativeTimeKey(iso);
      return t(r.key, r.vars);
    };
    const rupiah = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? "-" : `Rp ${Number(n).toLocaleString("id-ID")}`);
    const number = (n) => (n === null || n === undefined ? "-" : Number(n).toLocaleString(locale));
    const percent = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? "-" : `${Number(n).toLocaleString(locale, { maximumFractionDigits: 1 })}%`);
    return { dateTime, date, relative, rupiah, number, percent };
  }, [locale, t]);
}

/** `datetime-local` input value ("2026-03-01T14:30", local time) from an ISO string, and back. */
export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);
