"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Badge, Button, IconButton } from "@/components/ui";
import { QrIcon } from "@/components/icons";
import ChannelMark from "./ChannelMark";
import { handoffReasonText, initials } from "./chatText";

/**
 * The thread's top bar: who the customer is and on which channel, who is answering (AI or the team) with the
 * button to switch, and the QRIS action. `onChanged` runs after the answering side changed.
 */
export default function ConversationHeader({ lead, onBack, onShowDetail, onQris, onChanged }) {
  const { t, notify, refreshLeads } = useDashboard();
  const { run, pending } = useAction();
  const team = lead.handledBy === "human";

  const switchSide = async () => {
    const result = await run(() => api.post(`/leads/${lead.dbId}/${team ? "handback" : "handoff"}`));
    if (result.ok) notify("success", result.data?.message || t("Tersimpan."));
    await refreshLeads().catch(() => {});
    if (result.ok) onChanged?.();
  };

  return (
    <div className="bg-white border-b border-line flex-shrink-0">
      <div className="min-h-[64px] flex items-center justify-between gap-2 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <IconButton icon="arrowLeft" label={t("Kembali ke daftar percakapan")} onClick={onBack} className="lg:hidden -ml-2 flex-shrink-0" />
          <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-label flex-shrink-0">{initials(lead.name)}</div>
          <div className="min-w-0">
            <div className="text-body-sm font-bold text-ink truncate">{lead.name}</div>
            <div className="flex items-center gap-2 text-caption text-fg-muted min-w-0">
              <ChannelMark type={lead.channelType} showName />
              <span className="truncate tabular-nums">{lead.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <IconButton icon="user" label={t("Lihat detail pelanggan")} onClick={onShowDetail} aria-haspopup="dialog" className="min-[1360px]:hidden border-line bg-canvas" />
          <Button size="sm" onClick={onQris} aria-label={t("Terbitkan QRIS")}>
            <QrIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Terbitkan QRIS")}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 py-2 bg-soft border-t border-line">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-label">
          <span className="text-fg-muted">{t("Dijawab oleh")}</span>
          <Badge tone={team ? "warning" : "brand"}>{team ? t("Tim") : t("AI")}</Badge>
          {team ? <span className="text-fg-muted">{handoffReasonText(t, lead.handoffReason)}</span> : null}
        </div>
        <Button variant="secondary" size="sm" icon={team ? "refresh" : "userCheck"} loading={pending} onClick={switchSide}>
          {team ? t("Kembalikan ke AI") : t("Ambil alih")}
        </Button>
      </div>
    </div>
  );
}
