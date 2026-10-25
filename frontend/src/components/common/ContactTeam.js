"use client";

import { useDashboard } from "@/context/DashboardContext";
import { LEGAL, whatsappUrl } from "@/utils/legal/config";

const linkClass = "text-brand font-medium hover:underline";

// The three ways a client reaches the Klozer team, in one line.
export default function ContactTeam({ message }) {
  const { t } = useDashboard();
  const wa = whatsappUrl(message);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {t("WhatsApp")} {LEGAL.phone}
        </a>
      )}
      <a href={`mailto:${LEGAL.contactEmail}`} className={linkClass}>
        {LEGAL.contactEmail}
      </a>
      {LEGAL.instagramUrl && (
        <a href={LEGAL.instagramUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {t("Instagram")} {LEGAL.instagramHandle}
        </a>
      )}
    </span>
  );
}
