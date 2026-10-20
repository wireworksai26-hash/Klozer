"use client";
import { useDashboard } from "@/context/DashboardContext";
import AiAgentSection from "./AiAgentSection";
import AssignmentSection from "./AssignmentSection";
import ConsentSection from "./ConsentSection";
import ContactTasks from "./ContactTasks";
import { initials } from "./chatText";

/** Customer summary and the controls for this chat. Rendered in the side panel on wide screens and in a drawer on narrower ones. */
export default function CustomerDetail({ lead }) {
  const { t } = useDashboard();
  return (
    <>
      <div className="text-center pb-4 border-b border-line mb-4">
        <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center font-bold text-title mx-auto mb-2">{initials(lead.name)}</div>
        <h3 className="text-body font-bold text-ink">{lead.name}</h3>
        <p className="text-label text-fg-muted">{lead.phone}</p>
      </div>
      <div className="flex flex-col gap-3 text-label">
        {[
          ["Kota", lead.city || "-"],
          ["Sumber", lead.source],
          ["Skor risiko COD", `${lead.codScore}/100`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-fg-muted">
            <span>{t(k)}:</span>
            <span className="font-bold text-ink text-right">{v}</span>
          </div>
        ))}
        {lead.notes && <p className="mt-2 p-2.5 bg-canvas rounded-lg text-fg-muted">{lead.notes}</p>}
      </div>
      <AssignmentSection lead={lead} />
      <AiAgentSection lead={lead} />
      <ConsentSection lead={lead} />
      <ContactTasks lead={lead} />
    </>
  );
}
