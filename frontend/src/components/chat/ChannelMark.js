"use client";
import { useDashboard } from "@/context/DashboardContext";
import Icon from "@/components/icons/Icon";
import { InstagramIcon } from "@/components/icons";

const GLYPH = { whatsapp: "whatsapp", messenger: "messenger", telegram: "send", webchat: "webchat" };

export function channelName(t, type) {
  return { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", telegram: "Telegram", webchat: t("Chat web") }[type] ?? type;
}

/**
 * Which channel a conversation is on: the platform's icon, with its name as text for screen readers.
 * `showName` prints the name next to the icon (the thread header).
 */
export default function ChannelMark({ type, showName = false, className = "" }) {
  const { t } = useDashboard();
  const name = channelName(t, type);
  return (
    <span className={`inline-flex items-center gap-1 text-fg-muted ${className}`} title={name}>
      {type === "instagram" ? <InstagramIcon className="w-3.5 h-3.5" aria-hidden="true" /> : GLYPH[type] ? <Icon name={GLYPH[type]} className="w-3.5 h-3.5" /> : null}
      <span className={showName ? "text-caption" : "sr-only"}>{name}</span>
    </span>
  );
}
