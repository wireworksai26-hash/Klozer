"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { fromLocalInput, toLocalInput, useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Badge, Button, ConfirmDialog, ErrorState, LoadingState, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";
import { STATUS_TONE, actionLabel, fieldErrors, isOpenStatus, nextStatuses, priorityLabel, priorityOptions, sourceLabel, statusLabel, typeLabel } from "./taskMeta";

const ACTION_VARIANT = { done: "primary", in_progress: "secondary", open: "secondary", cancelled: "quietDanger" };

/** One line of the history, in words. The server writes its detail in Indonesian with raw codes; names and labels are put back here. */
function useEventText(meta) {
  const { t } = useDashboard();
  const nameOf = (id) => (id === "-" || id === undefined ? t("Belum diambil") : meta.assignees.find((p) => String(p.id) === String(id).replace("#", ""))?.name ?? `#${String(id).replace("#", "")}`);
  const fieldWord = (word) => ({ tenggat: t("tenggat||field"), judul: t("judul||field"), catatan: t("catatan||field"), prioritas: t("prioritas||field") })[word] ?? word;
  return (event) => {
    const d = event.detail || "";
    if (event.event === "comment") return { title: t("Komentar"), body: d };
    if (event.event === "overdue") return { title: t("Melewati tenggat"), body: "" };
    if (event.event === "status") {
      const m = d.match(/^status: (\w+) → (\w+)$/);
      return { title: t("Status diubah"), body: m ? t("{from} menjadi {to}", { from: statusLabel(t, m[1]), to: statusLabel(t, m[2]) }) : d };
    }
    if (event.event === "assigned") {
      const m = d.match(/^penanggung jawab: (\S+) → (\S+)$/);
      if (m) return { title: t("Penanggung jawab diubah"), body: t("{from} menjadi {to}", { from: nameOf(m[1]), to: nameOf(m[2]) }) };
      return { title: t("Penanggung jawab diubah"), body: d === "diambil sendiri" ? t("Diambil sendiri") : d };
    }
    if (event.event === "updated") {
      const m = d.match(/^diubah: (.+)$/);
      return { title: t("Tugas diubah"), body: m ? t("Diubah: {fields}", { fields: m[1].split(", ").map(fieldWord).join(", ") }) : d };
    }
    if (event.event === "created") {
      const m = d.match(/^ditugaskan ke #(\d+)$/);
      return { title: t("Tugas dibuat"), body: m ? t("Ditugaskan ke {name}", { name: nameOf(m[1]) }) : d === "belum ada penanggung jawab" ? t("Belum ada penanggung jawab") : d };
    }
    return { title: event.event, body: d };
  };
}

function History({ events, meta }) {
  const { t } = useDashboard();
  const { dateTime } = useFormat();
  const describe = useEventText(meta);
  if (!events?.length) return <p className="text-label text-fg-muted">{t("Belum ada riwayat.")}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {events.map((e) => {
        const { title, body } = describe(e);
        const who = e.actor === "system" ? t("Sistem") : e.actorName || "-";
        return (
          <li key={e.id} className="text-label">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-fg">{title}</span>
              <span className="text-fg-muted">{who}</span>
              <time dateTime={e.createdAt} className="text-caption text-fg-subtle tabular-nums">
                {dateTime(e.createdAt)}
              </time>
            </div>
            {body ? <p className="text-fg-muted whitespace-pre-line break-words">{body}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Detail({ task, meta, reload, onChanged, onClose, goneRef }) {
  const { t, isManager, currentUser } = useDashboard();
  const { dateTime } = useFormat();
  const { run, pending } = useAction();
  const [form, setForm] = useState({ title: task.title, priority: task.priority, assignee: task.assignedTo ? String(task.assignedTo) : "", due: toLocalInput(task.dueAt), note: task.note || "" });
  const [errors, setErrors] = useState({});
  const [comment, setComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Escape in the confirm dialog must not also close the drawer behind it
  const confirming = useRef(false);
  const askDelete = useCallback((open) => {
    confirming.current = open;
    setConfirmDelete(open);
  }, []);
  const closeConfirm = useCallback(() => askDelete(false), [askDelete]);
  const closeDrawer = useCallback(() => {
    if (!confirming.current) onClose();
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const refreshAll = () => {
    reload();
    onChanged();
  };

  // only what changed goes to the server, so a person who may edit just the note never sends a forbidden field
  const patch = {};
  if (isManager && form.title.trim() !== task.title) patch.title = form.title.trim();
  if (isManager && form.priority !== task.priority) patch.priority = form.priority;
  if (isManager && form.assignee !== (task.assignedTo ? String(task.assignedTo) : "")) patch.assignedTo = form.assignee ? Number(form.assignee) : null;
  if (form.due !== toLocalInput(task.dueAt)) patch.dueAt = fromLocalInput(form.due);
  if (form.note.trim() !== (task.note || "")) patch.note = form.note.trim() || null;
  const dirty = Object.keys(patch).length > 0;

  const save = async (e) => {
    e.preventDefault();
    setErrors({});
    const result = await run(() => api.put(`/tasks/${task.id}`, patch), { success: t("Perubahan disimpan.") });
    if (result.ok) refreshAll();
    else setErrors(fieldErrors(result.error));
  };

  const move = async (status) => {
    const result = await run(() => api.put(`/tasks/${task.id}`, { status }), { success: t("Status tugas diperbarui.") });
    if (result.ok) refreshAll();
    else reload();
  };

  const claim = async () => {
    const result = await run(() => api.post(`/tasks/${task.id}/claim`), { success: t("Tugas diambil.") });
    // TASK_TAKEN: someone else was faster; the notice says so, and the drawer shows who has it now
    if (result.ok || result.error?.code === "TASK_TAKEN") refreshAll();
  };

  const sendComment = async (e) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    const result = await run(() => api.post(`/tasks/${task.id}/comments`, { text }));
    if (result.ok) {
      setComment("");
      reload();
    }
  };

  const remove = async () => {
    goneRef.current = true; // the delete event that follows must not make the drawer fetch a task that no longer exists
    const result = await run(() => api.delete(`/tasks/${task.id}`), { success: t("Tugas dihapus.") });
    if (result.ok) {
      onChanged();
      onClose();
    } else {
      goneRef.current = false;
    }
  };

  const people = meta.assignees.map((p) => ({ value: String(p.id), label: p.id === currentUser?.id ? t("{name} (saya)", { name: p.name }) : p.name }));
  const canClaim = !task.assignedTo && isOpenStatus(task.status);
  const moves = nextStatuses(task.status);

  return (
    <>
      <Modal
        open
        onClose={closeDrawer}
        variant="drawer"
        title={task.title}
        description={task.contactName ? t("Kontak: {name}", { name: task.contactName }) : undefined}
        footer={
          <>
            {isManager ? (
              <Button variant="quietDanger" icon="trash" className="mr-auto" onClick={() => askDelete(true)}>
                {t("Hapus tugas")}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              {t("Tutup")}
            </Button>
            <Button type="submit" form="task-edit-form" disabled={!dirty} loading={pending}>
              {t("Simpan perubahan")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <section aria-label={t("Status")} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[task.status]}>{statusLabel(t, task.status)}</Badge>
              <Badge tone={task.priority === "high" ? "warning" : "neutral"}>{t("Prioritas {level}", { level: priorityLabel(t, task.priority) })}</Badge>
              {task.overdue ? <Badge tone="danger">{t("Terlambat")}</Badge> : null}
              <span className="text-caption text-fg-muted">{typeLabel(t, task.type)}</span>
            </div>
            <p className="text-caption text-fg-muted">
              {sourceLabel(t, task)}. {t("Dibuat {when}", { when: dateTime(task.createdAt) })}
              {task.orderNumber ? `. ${t("Pesanan {number}", { number: task.orderNumber })}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {canClaim ? (
                <Button icon="userCheck" loading={pending} onClick={claim}>
                  {t("Ambil tugas")}
                </Button>
              ) : null}
              {moves.map((to) => (
                <Button key={to} variant={ACTION_VARIANT[to]} size="sm" disabled={pending} onClick={() => move(to)}>
                  {actionLabel(t, task.status, to)}
                </Button>
              ))}
              {task.leadId ? (
                <Button variant="ghost" size="sm" icon="message" href={`/dashboard/chat?lead=${task.leadId}`}>
                  {t("Buka chat")}
                </Button>
              ) : null}
            </div>
          </section>

          <form id="task-edit-form" onSubmit={save} className="flex flex-col gap-4">
            {isManager ? (
              <>
                <TextField label={t("Judul")} value={form.title} onChange={set("title")} maxLength={160} required error={errors.title} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField label={t("Prioritas")} value={form.priority} onChange={set("priority")} options={priorityOptions(t)} error={errors.priority} />
                  <SelectField label={t("Penanggung jawab")} value={form.assignee} onChange={set("assignee")} placeholder={t("Belum diambil")} options={people} error={errors.assignedTo} />
                </div>
              </>
            ) : (
              <p className="text-label text-fg-muted">
                {t("Penanggung jawab")}: <span className="font-semibold text-fg">{task.assigneeName || t("Belum diambil")}</span>
              </p>
            )}
            <TextField label={t("Tenggat")} type="datetime-local" value={form.due} onChange={set("due")} error={errors.dueAt} />
            <TextAreaField label={t("Catatan")} rows={3} value={form.note} onChange={set("note")} maxLength={2000} error={errors.note} />
          </form>

          <section aria-label={t("Riwayat")} className="flex flex-col gap-3">
            <h3 className="text-body-sm font-bold text-fg">{t("Riwayat")}</h3>
            <History events={task.events} meta={meta} />
            <form onSubmit={sendComment} className="flex flex-col gap-2">
              <TextAreaField label={t("Tulis komentar")} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} />
              <Button type="submit" variant="secondary" size="sm" className="self-end" disabled={!comment.trim()} loading={pending}>
                {t("Kirim komentar")}
              </Button>
            </form>
          </section>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={closeConfirm}
        onConfirm={remove}
        pending={pending}
        title={t("Hapus tugas ini?")}
        body={t("Tugas dan riwayatnya dihapus dan tidak bisa dikembalikan.")}
        confirmLabel={t("Hapus tugas")}
      />
    </>
  );
}

/** The task's detail in a drawer: fields the role may edit, status moves, history and comments. */
export default function TaskDrawer({ taskId, meta, taskEvent, onClose, onChanged }) {
  const { t } = useDashboard();
  const query = useApi(`/tasks/${taskId}`);
  const { reload } = query;
  const goneRef = useRef(false);

  useEffect(() => {
    if (taskEvent && !goneRef.current) reload();
  }, [taskEvent, reload]);

  const task = query.data?.data;
  if (task) return <Detail key={`${task.id}-${task.updatedAt}`} task={task} meta={meta} reload={reload} onChanged={onChanged} onClose={onClose} goneRef={goneRef} />;
  return (
    <Modal open onClose={onClose} variant="drawer" title={t("Detail tugas")}>
      {query.error ? <ErrorState error={query.error} onRetry={reload} /> : <LoadingState label={t("Memuat tugas...")} />}
    </Modal>
  );
}
