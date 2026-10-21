"use client";
import { useDashboard } from "@/context/DashboardContext";
import { Badge, Tabs } from "@/components/ui";
import { MessageSquareIcon } from "@/components/icons";
import { relativeTimeKey } from "@/utils/mappers.mjs";
import ChannelMark from "./ChannelMark";
import { initials } from "./chatText";

/** Does a conversation belong under this filter? */
export const matchesFilter = (lead, filter) => filter === "all" || (filter === "human" ? lead.handledBy === "human" : lead.handledBy !== "human");

/** Search box, the answering filter (all, needs the team, answered by AI) and one row per conversation. */
export default function ConversationList({ leads, visible, search, onSearch, filter, onFilter, selectedId, onSelect }) {
  const { t, whatsappStatus } = useDashboard();
  const ago = (iso) => {
    const r = relativeTimeKey(iso);
    return t(r.key, r.vars);
  };
  const tabs = [
    { id: "all", label: t("Semua"), count: leads.length },
    { id: "human", label: t("Perlu tim"), count: leads.filter((l) => matchesFilter(l, "human")).length },
    { id: "ai", label: t("Dijawab AI"), count: leads.filter((l) => matchesFilter(l, "ai")).length },
  ];

  return (
    <>
      <div className="p-3.5 border-b border-line bg-soft flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-canvas border border-line rounded-xl px-3 py-2">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("Cari nama atau nomor...")}
            aria-label={t("Cari nama atau nomor...")}
            className="bg-transparent border-none outline-none text-body lg:text-label flex-1 text-ink placeholder:text-fg-subtle"
          />
        </div>
        <Tabs tabs={tabs} value={filter} onChange={onFilter} label={t("Saring percakapan")} compact />
      </div>

      <div className="relative flex-1 min-h-0 overflow-y-auto divide-y divide-line">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-fg-muted text-label flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-line flex items-center justify-center mb-2">
              <MessageSquareIcon className="w-5 h-5 text-brand" />
            </div>
            <span className="font-bold text-ink">{leads.length ? t("Tidak ada hasil") : t("Belum ada percakapan")}</span>
            <span className="text-caption text-fg-subtle mt-1">
              {leads.length
                ? t("Coba kata lain atau pilih Semua.")
                : whatsappStatus?.configured
                  ? t("Pesan WhatsApp baru akan tampil di sini otomatis.")
                  : t("Hubungkan nomor WhatsApp di Pengaturan untuk mulai menerima pesan.")}
            </span>
          </div>
        ) : (
          visible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.dbId)}
              aria-current={selectedId === c.dbId ? "true" : undefined}
              className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-none cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${selectedId === c.dbId ? "bg-brand-soft/60" : "bg-white hover:bg-canvas"}`}
            >
              <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-body-sm flex-shrink-0">{initials(c.name)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-body-sm font-bold text-ink truncate">{c.name}</span>
                  <span className="text-micro text-fg-subtle flex-shrink-0">{ago(c.lastInteractionAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0 text-label text-fg-muted">
                    <ChannelMark type={c.channelType} />
                    <span className="truncate tabular-nums">{c.phone}</span>
                  </span>
                  {c.handledBy === "human" ? <Badge tone="warning">{t("Perlu tim")}</Badge> : null}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}
