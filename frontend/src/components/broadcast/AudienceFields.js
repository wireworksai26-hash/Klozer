"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { ChipPicker, SelectField, Switch, TagInput, TextField } from "@/components/ui";
import { LEAD_STATUS_OPTIONS, ORDER_FILTER_OPTIONS } from "./broadcastModel";

export const EMPTY_AUDIENCE = { statuses: [], orders: "", cities: [], sources: [], adIds: [], quietForDays: "", activeWithinDays: "", onlyThisNumber: true };

const positiveInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : null;
};

/** The filter as the API wants it: only the fields the owner actually set. */
export function toAudience(state) {
  const out = {};
  if (state.statuses.length) out.statuses = state.statuses;
  if (state.orders) out.orders = state.orders;
  if (state.cities.length) out.cities = state.cities;
  if (state.sources.length) out.sources = state.sources;
  if (state.adIds.length) out.adIds = state.adIds;
  const quiet = positiveInt(state.quietForDays);
  if (quiet) out.quietForDays = quiet;
  const active = positiveInt(state.activeWithinDays);
  if (active) out.activeWithinDays = active;
  if (state.onlyThisNumber === false) out.onlyThisNumber = false;
  return out;
}

/** The saved filter in plain sentences, for the review step and the campaign detail. */
export function audienceLines(audience, t) {
  const a = audience || {};
  const lines = [];
  if (a.statuses?.length) lines.push(t("Status: {list}", { list: a.statuses.map((s) => t(LEAD_STATUS_OPTIONS.find((o) => o.value === s)?.label || s)).join(", ") }));
  if (a.orders) lines.push(t(ORDER_FILTER_OPTIONS.find((o) => o.value === a.orders)?.label || a.orders));
  if (a.cities?.length) lines.push(t("Kota: {list}", { list: a.cities.join(", ") }));
  if (a.sources?.length) lines.push(t("Sumber: {list}", { list: a.sources.join(", ") }));
  if (a.adIds?.length) lines.push(t("Iklan asal: {list}", { list: a.adIds.join(", ") }));
  if (a.quietForDays) lines.push(t("Terakhir dihubungi lebih dari {days} hari lalu", { days: a.quietForDays }));
  if (a.activeWithinDays) lines.push(t("Terakhir dihubungi dalam {days} hari terakhir", { days: a.activeWithinDays }));
  if (a.onlyThisNumber === false) lines.push(t("Termasuk kontak yang chat ke nomor lain"));
  return lines.length ? lines : [t("Semua kontak WhatsApp")];
}

export default function AudienceFields({ value, onChange }) {
  const { t } = useDashboard();
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-4">
      <ChipPicker label={t("Status kontak")} hint={t("Kosongkan untuk semua status.")} options={LEAD_STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} value={value.statuses} onChange={(statuses) => set({ statuses })} />
      <SelectField label={t("Riwayat pesanan")} value={value.orders} onChange={(e) => set({ orders: e.target.value })} options={ORDER_FILTER_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label={t("Tidak dihubungi selama (hari)")} type="number" inputMode="numeric" min={1} max={3650} value={value.quietForDays} onChange={(e) => set({ quietForDays: e.target.value })} hint={t("Terakhir dihubungi lebih dari sekian hari lalu.")} />
        <TextField label={t("Aktif dalam (hari)")} type="number" inputMode="numeric" min={1} max={3650} value={value.activeWithinDays} onChange={(e) => set({ activeWithinDays: e.target.value })} hint={t("Terakhir dihubungi dalam sekian hari terakhir.")} />
      </div>
      <TagInput label={t("Kota")} value={value.cities} onChange={(cities) => set({ cities })} placeholder={t("Ketik kota, tekan Enter")} max={50} />
      <TagInput label={t("Sumber kontak")} hint={t("Contoh: whatsapp, meta_ads, import.")} value={value.sources} onChange={(sources) => set({ sources })} placeholder={t("Ketik sumber, tekan Enter")} max={20} />
      <TagInput label={t("ID iklan asal")} hint={t("Kontak yang datang dari iklan Click-to-WhatsApp tertentu.")} value={value.adIds} onChange={(adIds) => set({ adIds })} placeholder={t("Tempel ID iklan, tekan Enter")} max={50} />
      <Switch label={t("Hanya kontak nomor ini")} description={t("Hanya kontak yang chat ke nomor pengirim atau hasil impor.")} checked={value.onlyThisNumber} onChange={(onlyThisNumber) => set({ onlyThisNumber })} />
    </div>
  );
}

/**
 * How many contacts the filter reaches right now (POST /broadcast/audience/preview), refreshed shortly after each change.
 * @returns {{ data: object|null, error: Error|null, loading: boolean }}
 */
export function useAudiencePreview({ channelId, templateId, audience, enabled = true }) {
  const key = JSON.stringify({ channelId, templateId, audience });
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .post("/broadcast/audience/preview", JSON.parse(key), { signal: controller.signal })
        .then((res) => setResult({ key, data: res.data, error: null }))
        .catch((error) => {
          if (error?.name !== "AbortError") setResult({ key, data: null, error });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, enabled]);

  const current = result.key === key;
  return { data: current ? result.data : null, error: current ? result.error : null, loading: enabled && !current };
}

/** The count line under the filter: how many will get the message, and why fewer than the filter matched. */
export function AudienceCount({ preview, marketing }) {
  const { t } = useDashboard();
  if (preview.loading) return <p role="status" className="text-label text-fg-muted">{t("Menghitung kontak...")}</p>;
  if (preview.error) return <p role="alert" className="text-label text-danger-700">{preview.error.message}</p>;
  const { count, sample = [], matchingFilterBeforeConsent } = preview.data;
  const held = marketing && typeof matchingFilterBeforeConsent === "number" ? matchingFilterBeforeConsent - count : 0;
  return (
    <div role="status" className="rounded-xl bg-sunken border border-line p-4 flex flex-col gap-2">
      <div className="text-body-sm text-fg">
        <span className="text-heading-sm font-bold tabular-nums">{count.toLocaleString("id-ID")}</span> {t("kontak akan menerima pesan ini")}
      </div>
      {held > 0 ? <p className="text-label text-fg-muted">{t("{count} kontak lain cocok dengan filter, tetapi belum setuju menerima promosi atau baru saja dikirimi kampanye.", { count: held })}</p> : null}
      {marketing ? <p className="text-label text-fg-muted">{t("Templat promosi hanya dikirim ke kontak yang sudah setuju menerima promosi.")}</p> : null}
      {sample.length ? (
        <p className="text-caption text-fg-subtle">
          {t("Contoh")}: {sample.map((s) => `${s.name} (${s.phone})`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
