"use client";
import { useDashboard } from "@/context/DashboardContext";
import Icon from "@/components/icons/Icon";

/** The message as the customer would see it. Pass the parts; empty parts are left out. */
export default function TemplatePreview({ header, body, footer, buttons = [] }) {
  const { t } = useDashboard();
  return (
    <div className="rounded-2xl bg-sunken border border-line p-4" aria-label={t("Pratinjau pesan")}>
      <div className="bg-white rounded-xl border border-line p-3.5 max-w-[22rem] flex flex-col gap-1.5">
        {header ? <div className="text-body-sm font-bold text-fg break-words">{header}</div> : null}
        <div className="text-body-sm text-fg whitespace-pre-wrap break-words">{body || <span className="text-fg-subtle">{t("Isi pesan akan tampil di sini.")}</span>}</div>
        {footer ? <div className="text-caption text-fg-subtle break-words">{footer}</div> : null}
      </div>
      {buttons.length ? (
        <div className="mt-2 flex flex-col gap-1.5 max-w-[22rem]">
          {buttons.map((b, i) => (
            <div key={i} className="bg-white rounded-xl border border-line px-3.5 py-2 text-body-sm font-semibold text-brand text-center flex items-center justify-center gap-1.5 break-words">
              {b.type === "url" ? <Icon name="external" className="w-3.5 h-3.5" /> : null}
              {b.text || t("Teks tombol")}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
