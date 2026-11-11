"use client";
import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { EmptyState } from "@/components/ui";
import { PIPELINE } from "./crmModel";

const PER_COLUMN = 12;

/**
 * Contacts by stage. Moving a contact is a select on the card, so it works with a keyboard and on a phone; opening one shows
 * the full profile. Only the first cards of a long column are drawn, with the rest counted, so the board stays quick.
 */
export default function PipelineTab({ onOpen }) {
  const { t, leads, updateLead, role } = useDashboard();
  const { rupiah } = useFormat();
  const canMove = role === "owner" || role === "spv" || role === "cs";

  const columns = useMemo(() => {
    const by = Object.fromEntries(PIPELINE.map((c) => [c.id, []]));
    for (const l of leads) (by[l.status] ?? by.new).push(l);
    for (const list of Object.values(by)) list.sort((a, b) => (b.estValue || 0) - (a.estValue || 0));
    return by;
  }, [leads]);

  if (leads.length === 0) {
    return <EmptyState icon="user" title={t("Belum ada kontak")} body={t("Kontak masuk otomatis dari chat pelanggan, atau tambahkan lewat Pelanggan & CRM.")} action={null} />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2" role="list" aria-label={t("Pipeline kontak")}>
      {PIPELINE.map((col) => {
        const list = columns[col.id];
        return (
          <section key={col.id} role="listitem" aria-label={t(col.label)} className="w-[260px] flex-shrink-0 flex flex-col gap-2">
            <header className="flex items-baseline justify-between px-1">
              <h3 className="m-0 text-body-sm font-semibold text-ink">{t(col.label)}</h3>
              <span className="text-label text-fg-subtle tabular-nums">{list.length}</span>
            </header>
            <ul className="list-none m-0 p-0 flex flex-col gap-2">
              {list.slice(0, PER_COLUMN).map((l) => (
                <li key={l.dbId} className="rounded-xl border border-line bg-white p-3 flex flex-col gap-2">
                  <button type="button" onClick={() => onOpen(l.dbId)} className="text-left bg-transparent border-none p-0 cursor-pointer">
                    <div className="text-body-sm font-medium text-ink truncate">
                      {l.name}
                      {l.isVip ? <span className="ml-1.5 text-caption font-medium text-accent-700">VIP</span> : null}
                    </div>
                    <div className="text-caption text-fg-subtle tabular-nums">{l.phone}</div>
                    {l.estValue ? <div className="text-caption text-fg-muted mt-0.5">{rupiah(l.estValue)}</div> : null}
                  </button>
                  {canMove ? (
                    <select
                      aria-label={t("Pindahkan {name} ke tahap", { name: l.name })}
                      value={l.status}
                      onChange={(e) => updateLead(l.id, { status: e.target.value })}
                      className="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-caption text-fg-muted cursor-pointer outline-none focus:border-brand"
                    >
                      {PIPELINE.map((c) => (
                        <option key={c.id} value={c.id}>
                          {t(c.label)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </li>
              ))}
              {list.length === 0 ? <li className="rounded-xl border border-dashed border-line px-3 py-4 text-caption text-fg-subtle text-center">{t("Kosong")}</li> : null}
              {list.length > PER_COLUMN ? <li className="px-1 text-caption text-fg-subtle">{t("dan {count} kontak lain, buka Pelanggan & CRM untuk semuanya", { count: list.length - PER_COLUMN })}</li> : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
