"use client";
import { useDashboard } from "@/context/DashboardContext";
import { ChipPicker, Switch } from "@/components/ui";
import { groupEvents, useGroupLabel } from "./shared";

/** Choose what a webhook listens to: every event (["*"]) or a selection from the catalog, grouped by topic. */
export default function EventPicker({ catalog, value, onChange, error }) {
  const { t } = useDashboard();
  const groupLabel = useGroupLabel();
  const all = value.includes("*");
  const groups = groupEvents(catalog);

  const setGroup = (group, picked) => {
    const names = new Set(group.events.map((e) => e.name));
    onChange([...value.filter((v) => !names.has(v)), ...picked]);
  };

  return (
    <div className="flex flex-col gap-3">
      <Switch checked={all} onChange={(on) => onChange(on ? ["*"] : [])} label={t("Semua event")} description={t("Termasuk event baru yang ditambahkan nanti.")} />
      {all ? null : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <ChipPicker
              key={group.prefix}
              label={groupLabel(group.prefix)}
              options={group.events.map((e) => ({ value: e.name, label: <span className="font-mono">{e.name}</span>, hint: e.description }))}
              value={value.filter((v) => group.events.some((e) => e.name === v))}
              onChange={(picked) => setGroup(group, picked)}
            />
          ))}
        </div>
      )}
      {error ? (
        <p role="alert" className="text-caption text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
