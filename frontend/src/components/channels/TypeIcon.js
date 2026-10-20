import Icon from "@/components/icons/Icon";
import { InstagramIcon } from "@/components/icons";

const GLYPH = { whatsapp: "whatsapp", messenger: "messenger", telegram: "send", webchat: "webchat" };

/** The platform's mark for a channel type. */
export default function TypeIcon({ type, className = "w-5 h-5" }) {
  if (type === "instagram") return <InstagramIcon className={className} />;
  return <Icon name={GLYPH[type] || "inbox"} className={className} />;
}
