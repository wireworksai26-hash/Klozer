"use client";
import { useDashboard } from "@/context/DashboardContext";
import { SelectField, TextField } from "@/components/ui";
import { FIELD_OPTIONS } from "./broadcastModel";

/** One blank setup per template variable. */
export const blankVariables = (count) => Array.from({ length: count }, () => ({ type: "text", value: "", field: "first_name", fallback: "" }));

/** The setup as the API wants it (no empty fallback, no leftover fields). */
export function toVariableSpec(vars) {
  return vars.map((v) => (v.type === "text" ? { type: "text", value: v.value.trim() } : { type: "field", field: v.field, ...(v.fallback.trim() ? { fallback: v.fallback.trim() } : {}) }));
}

/** What each variable would read like in the preview: the fixed text, or the field's name in brackets. */
export function previewValues(vars, t) {
  return vars.map((v) => (v.type === "text" ? v.value.trim() : `[${t(FIELD_OPTIONS.find((o) => o.value === v.field)?.label || v.field)}]`));
}

export const variablesComplete = (vars) => vars.every((v) => v.type === "field" || v.value.trim());

/** Fill each {{n}} of a template with a fixed text or a field of the contact. `examples` are the values given to Meta. */
export default function VariablesForm({ value, onChange, examples = [] }) {
  const { t } = useDashboard();
  const update = (i, patch) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <div className="flex flex-col gap-4">
      {value.map((v, i) => (
        <fieldset key={i} className="border border-line rounded-xl p-4 flex flex-col gap-3 min-w-0">
          <legend className="px-1 text-label font-semibold text-fg">{t("Variabel {n}", { n: i + 1 })}</legend>
          <SelectField
            label={t("Diisi dengan")}
            value={v.type}
            onChange={(e) => update(i, { type: e.target.value })}
            options={[
              { value: "text", label: t("Teks yang sama untuk semua") },
              { value: "field", label: t("Data kontak") },
            ]}
          />
          {v.type === "text" ? (
            <TextField label={t("Teks")} value={v.value} maxLength={200} onChange={(e) => update(i, { value: e.target.value })} hint={examples[i] ? t("Contoh yang diajukan ke Meta: {example}", { example: examples[i] }) : undefined} required />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label={t("Data")} value={v.field} onChange={(e) => update(i, { field: e.target.value })} options={FIELD_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
              <TextField label={t("Bila data kosong, tulis")} value={v.fallback} maxLength={100} onChange={(e) => update(i, { fallback: e.target.value })} hint={t("Tanpa ini, tertulis tanda hubung.")} />
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}
