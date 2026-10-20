"use client";
import { useDashboard } from "@/context/DashboardContext";
import { SparklesIcon } from "@/components/icons";
import Icon from "@/components/icons/Icon";
import { clock, parseMeta, toolLabel } from "./chatText";

const SENDER = { customer: "customer", ai_agent: "ai", cs: "cs", system: "system" };

/** Which agent wrote an AI reply and which tools it used, from the message's own record. Nothing is shown when the record has none. */
function AgentNote({ meta }) {
  const { t } = useDashboard();
  const name = meta?.agent?.name;
  const tools = Array.isArray(meta?.tools) ? meta.tools : [];
  const used = [...new Set(tools.filter((x) => x?.ok).map((x) => toolLabel(t, x.name)))];
  const failed = [...new Set(tools.filter((x) => x && !x.ok).map((x) => toolLabel(t, x.name)))];
  if (!name && !used.length && !failed.length) return null;
  return (
    <div className="mt-1.5 text-caption text-fg-muted">
      {name ? <div>{t("Agen: {name}", { name })}</div> : null}
      {used.length ? <div>{t("memakai: {tools}", { tools: used.join(", ") })}</div> : null}
      {failed.length ? <div>{t("gagal dipakai: {tools}", { tools: failed.join(", ") })}</div> : null}
    </div>
  );
}

/** One message in the thread: from the customer, the AI, a person on the team, or a system note. */
export default function MessageBubble({ message: m, onEdit }) {
  const { t, locale } = useDashboard();
  const kind = SENDER[m.sender_type] || "cs";

  // hand-off and assignment notes are timeline markers, not messages from anyone
  if (kind === "system") {
    return (
      <div className="flex justify-center">
        <p className="text-micro text-fg-subtle bg-soft border border-line rounded-full px-3 py-1 text-center">{m.content_text}</p>
      </div>
    );
  }

  const mine = kind !== "customer";
  const meta = kind === "ai" ? parseMeta(m.meta_json) : null;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${
          kind === "customer" ? "bg-white border border-line text-charcoal" : kind === "ai" ? "bg-brand-soft border border-brand/20 text-ink" : "bg-ink text-white"
        }`}
      >
        {kind === "ai" && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-micro font-bold uppercase tracking-wider bg-brand text-white px-1.5 py-0.5 rounded flex items-center gap-1">
              <SparklesIcon className="w-3 h-3" />
              <span>{t("Balasan AI")}</span>
            </span>
            {m.reply_path?.startsWith("fast:") ? <span className="text-caption text-fg-muted">{t("Dijawab otomatis tanpa token")}</span> : null}
          </div>
        )}
        <p className="text-body-sm leading-relaxed whitespace-pre-line break-words">{m.message_type && m.message_type !== "text" && !m.content_text ? `[${m.message_type}]` : m.content_text}</p>
        {meta ? <AgentNote meta={meta} /> : null}
        {kind === "ai" && onEdit ? (
          <button type="button" onClick={() => onEdit(m)} className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg text-caption font-semibold text-brand bg-transparent border-none cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-brand">
            <Icon name="edit" className="w-3.5 h-3.5" />
            {t("Edit dan kirim")}
          </button>
        ) : null}
        <span className="text-micro mt-1 flex items-center justify-end gap-1.5 opacity-70">
          {mine && m.is_delivered === 0 && (
            <span className="text-danger-500 font-bold" title={m.delivery_error || ""}>
              {t("Gagal terkirim")}
            </span>
          )}
          <span>{clock(m.created_at, locale)}</span>
        </span>
      </div>
    </div>
  );
}
