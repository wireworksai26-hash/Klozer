"use client";
import { useDashboard } from "@/context/DashboardContext";
import { Button, CheckboxField, SearchInput, SelectField } from "@/components/ui";
import { priorityOptions, typeOptions } from "./taskMeta";

export const DEFAULT_FILTERS = { status: "active", person: "", type: "", priority: "", overdue: false, q: "" };

/** True when something narrows the list beyond "everything that is still open" (or everything at all). */
export const isNarrowed = (f) => Boolean(f.person || f.type || f.priority || f.overdue || f.q) || !["active", "all"].includes(f.status);

/** Status, person, type, priority, late-only and search. Search text is held by the page so the numbers above can clear it. */
export default function TaskFilters({ filters, onChange, searchText, onSearchText, meta, onClear }) {
  const { t, isManager, currentUser } = useDashboard();
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const personOptions = [
    { value: "me", label: t("Saya") },
    { value: "unassigned", label: t("Belum diambil") },
    ...(isManager ? meta.assignees.filter((p) => p.id !== currentUser?.id).map((p) => ({ value: String(p.id), label: p.name })) : []),
  ];

  return (
    <div className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SelectField
          label={t("Status")}
          value={filters.status}
          onChange={set("status")}
          options={[
            { value: "active", label: t("Aktif") },
            { value: "done", label: t("Selesai") },
            { value: "cancelled", label: t("Dibatalkan") },
            { value: "all", label: t("Semua") },
          ]}
        />
        <SelectField label={t("Penanggung jawab")} value={filters.person} onChange={set("person")} placeholder={t("Semua orang")} options={personOptions} />
        <SelectField label={t("Jenis")} value={filters.type} onChange={set("type")} placeholder={t("Semua jenis")} options={typeOptions(t)} />
        <SelectField label={t("Prioritas")} value={filters.priority} onChange={set("priority")} placeholder={t("Semua prioritas")} options={priorityOptions(t)} />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput className="flex-1" value={searchText} onChange={(e) => onSearchText(e.target.value)} placeholder={t("Cari judul, catatan atau nama kontak")} aria-label={t("Cari tugas")} maxLength={80} />
        <CheckboxField checked={filters.overdue} onChange={(overdue) => onChange({ ...filters, overdue })} label={t("Hanya yang terlambat")} />
        {isNarrowed(filters) || searchText ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t("Hapus filter")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
