"use client";
import { useEffect, useRef } from "react";
import { useDashboard } from "@/context/DashboardContext";
import Icon from "@/components/icons/Icon";
import { Button, CheckboxField, Spinner } from "@/components/ui";
import { channelName } from "./ChannelMark";

/**
 * Where a person writes to the customer. Besides typing, they can ask the assistant for a draft (it only fills this box,
 * nothing is sent), or edit an AI reply here and send it as their own. A manager can also have the assistant learn the
 * corrected wording when the edited reply was written by the model.
 */
export default function Composer({ channelType, value, onChange, onSubmit, sending, editing, onCancelEdit, learn, onLearn, suggesting, onSuggest }) {
  const { t } = useDashboard();
  const box = useRef(null);

  // an edit starts with the box focused and the cursor at the end of the reply
  useEffect(() => {
    if (!editing || !box.current) return;
    box.current.focus();
    box.current.setSelectionRange(box.current.value.length, box.current.value.length);
  }, [editing]);

  const label = t("Ketik balasan {channel}...", { channel: channelName(t, channelType) });
  const onKeyDown = (e) => {
    // Enter sends, Shift+Enter makes a new line
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (value.trim() && !sending) onSubmit(e);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-white border-t border-line p-3 sm:p-4 flex flex-col gap-2.5 flex-shrink-0">
      {editing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-soft border border-brand/20 rounded-xl px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="text-label font-semibold text-ink">{t("Mengedit balasan AI")}</div>
            <div className="text-caption text-fg-muted">{t("Yang terkirim adalah versi Anda, atas nama tim.")}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={onCancelEdit}>
            {t("Batal")}
          </Button>
          {editing.canLearn ? <CheckboxField checked={learn} onChange={onLearn} label={t("Ajarkan AI memakai versi ini")} description={t("Dipakai untuk pertanyaan serupa berikutnya.")} /> : null}
        </div>
      ) : null}
      <div className="flex items-end gap-2 sm:gap-3">
        <textarea
          ref={box}
          rows={editing ? 5 : 1}
          placeholder={label}
          aria-label={label}
          value={value}
          maxLength={4000}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-canvas border border-line rounded-2xl px-4 py-2.5 text-body lg:text-body-sm text-ink placeholder:text-fg-subtle outline-none font-medium focus:bg-white focus:border-brand min-w-0 resize-none max-h-40"
        />
        <button
          type="button"
          onClick={onSuggest}
          disabled={suggesting || sending}
          className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white border border-line-strong text-fg-muted hover:bg-sunken flex items-center justify-center cursor-pointer flex-shrink-0 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label={t("Minta saran balasan dari AI")}
          title={t("Minta saran balasan dari AI")}
        >
          {suggesting ? <Spinner /> : <Icon name="agents" className="w-4 h-4" />}
        </button>
        <button
          type="submit"
          disabled={sending || !value.trim()}
          className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center border-none cursor-pointer flex-shrink-0 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label={t("Kirim")}
        >
          <Icon name="send" className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
