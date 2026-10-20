"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Badge, Button, LoadingState } from "@/components/ui";
import PanelSection from "./PanelSection";
import QuickTaskModal from "./QuickTaskModal";

/** The customer's open tasks, with a quick way to add one. Hidden when the package has no tasks. */
export default function ContactTasks({ lead }) {
  const { t, activeInstitution, taskEvent } = useDashboard();
  const { dateTime } = useFormat();
  const enabled = activeInstitution?.modules?.tasks !== false;
  const query = useMemo(() => ({ leadId: lead.dbId, status: "active", limit: 5 }), [lead.dbId]);
  const tasks = useApi("/tasks", { query, enabled });
  const { reload } = tasks;
  const [creating, setCreating] = useState(false);
  const closeCreate = useCallback(() => setCreating(false), []);

  useEffect(() => {
    if (taskEvent) reload();
  }, [taskEvent, reload]);

  // the package or the role has no tasks: the section is simply not there
  if (!enabled || tasks.error?.status === 403) return null;

  return (
    <PanelSection title={t("Tugas untuk pelanggan ini")}>
      {tasks.error ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-label text-danger-700">{tasks.error.message}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            {t("Coba lagi")}
          </Button>
        </div>
      ) : !tasks.data ? (
        <LoadingState label={t("Memuat tugas...")} />
      ) : tasks.data.data.length === 0 ? (
        <p className="text-label text-fg-muted">{t("Tidak ada tugas yang masih terbuka.")}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {tasks.data.data.map((task) => (
            <li key={task.id} className="text-label">
              <div className="font-semibold text-fg break-words">{task.title}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-muted">
                <span>{task.assigneeName || t("Belum diambil")}</span>
                {task.dueAt ? <span className={`tabular-nums ${task.overdue ? "text-danger-700 font-semibold" : ""}`}>{dateTime(task.dueAt)}</span> : null}
                {task.overdue ? <Badge tone="danger">{t("Terlambat")}</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon="plus" onClick={() => setCreating(true)}>
          {t("Buat tugas")}
        </Button>
        <Button variant="ghost" size="sm" href="/dashboard/tasks">
          {t("Lihat semua tugas")}
        </Button>
      </div>
      {creating ? <QuickTaskModal lead={lead} onClose={closeCreate} onCreated={reload} /> : null}
    </PanelSection>
  );
}
