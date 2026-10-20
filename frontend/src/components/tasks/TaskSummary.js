"use client";
import { useDashboard } from "@/context/DashboardContext";
import { DEFAULT_FILTERS } from "./TaskFilters";

/** The four real counts from the server. Each one is a button that applies the matching filter. */
export default function TaskSummary({ summary, filters, onApply }) {
  const { t } = useDashboard();
  const cards = [
    { id: "active", label: t("Aktif"), value: summary.active, filter: { ...DEFAULT_FILTERS } },
    { id: "overdue", label: t("Terlambat"), value: summary.overdue, filter: { ...DEFAULT_FILTERS, overdue: true } },
    { id: "unassigned", label: t("Belum diambil"), value: summary.unassigned, filter: { ...DEFAULT_FILTERS, person: "unassigned" } },
    { id: "mine", label: t("Milik saya"), value: summary.mine, filter: { ...DEFAULT_FILTERS, person: "me" } },
  ];
  const same = (a, b) => Object.keys(DEFAULT_FILTERS).every((k) => a[k] === b[k]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const on = same(filters, card.filter);
        return (
          <button
            key={card.id}
            type="button"
            aria-pressed={on}
            onClick={() => onApply(card.filter)}
            className={`text-left p-4 sm:p-5 rounded-2xl border cursor-pointer min-w-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${on ? "bg-brand-soft border-brand/40" : "bg-white border-line hover:bg-sunken"}`}
          >
            <span className="block text-label font-semibold text-fg-muted">{card.label}</span>
            <span className={`block text-heading-md font-bold tabular-nums mt-1 ${card.id === "overdue" && card.value > 0 ? "text-danger-700" : "text-fg"}`}>{card.value}</span>
          </button>
        );
      })}
    </div>
  );
}
