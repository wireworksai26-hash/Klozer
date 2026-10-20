"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { Badge, TableShell } from "@/components/ui";
import { PRIORITY_TONE, STATUS_TONE, priorityLabel, sourceLabel, statusLabel, typeLabel } from "./taskMeta";

/** Late is shown with the word and the colour together, never the colour alone. */
function Due({ task }) {
  const { t } = useDashboard();
  const { dateTime } = useFormat();
  if (!task.dueAt) return <span className="text-fg-subtle">{t("Tanpa tenggat")}</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`tabular-nums ${task.overdue ? "text-danger-700 font-semibold" : "text-fg-muted"}`}>{dateTime(task.dueAt)}</span>
      {task.overdue ? <Badge tone="danger">{t("Terlambat")}</Badge> : null}
    </div>
  );
}

/** The task list: one row per task, the title opens the detail drawer. */
export default function TaskTable({ tasks, onOpen }) {
  const { t } = useDashboard();
  const head = "py-3 px-4 text-label font-semibold text-fg-muted whitespace-nowrap";
  return (
    <TableShell>
      <thead>
        <tr className="bg-sunken border-b border-line">
          <th scope="col" className={head}>
            {t("Tugas")}
          </th>
          <th scope="col" className={head}>
            {t("Status")}
          </th>
          <th scope="col" className={head}>
            {t("Jenis")}
          </th>
          <th scope="col" className={head}>
            {t("Prioritas")}
          </th>
          <th scope="col" className={head}>
            {t("Tenggat")}
          </th>
          <th scope="col" className={head}>
            {t("Penanggung jawab")}
          </th>
          <th scope="col" className={head}>
            {t("Sumber")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {tasks.map((task) => (
          <tr key={task.id} className="hover:bg-soft align-top cursor-pointer" onClick={() => onOpen(task.id)}>
            <td className="py-3.5 px-4 min-w-[14rem] max-w-[22rem]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(task.id);
                }}
                className="text-left font-semibold text-fg bg-transparent border-none p-0 cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand break-words"
              >
                {task.title}
              </button>
              {task.contactName ? <div className="text-caption text-fg-muted mt-0.5">{task.contactName}</div> : null}
            </td>
            <td className="py-3.5 px-4">
              <Badge tone={STATUS_TONE[task.status]}>{statusLabel(t, task.status)}</Badge>
            </td>
            <td className="py-3.5 px-4 text-fg-muted whitespace-nowrap">{typeLabel(t, task.type)}</td>
            <td className="py-3.5 px-4">
              <Badge tone={PRIORITY_TONE[task.priority]}>{priorityLabel(t, task.priority)}</Badge>
            </td>
            <td className="py-3.5 px-4 whitespace-nowrap">
              <Due task={task} />
            </td>
            <td className="py-3.5 px-4 whitespace-nowrap">{task.assigneeName ? <span className="text-fg">{task.assigneeName}</span> : <span className="text-fg-subtle">{t("Belum diambil")}</span>}</td>
            <td className="py-3.5 px-4 text-fg-muted whitespace-nowrap">{sourceLabel(t, task)}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
