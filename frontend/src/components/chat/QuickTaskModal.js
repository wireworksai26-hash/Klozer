"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { fromLocalInput } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";
import { fieldErrors, priorityOptions, typeOptions } from "@/components/tasks/taskMeta";
import { useModalGuard } from "./ModalGuard";

/** A task for the customer being chatted with. Managers can give it to anyone, everyone else to themselves or nobody. */
export default function QuickTaskModal({ lead, onClose, onCreated }) {
  const { t, isManager, currentUser } = useDashboard();
  const { run, pending } = useAction();
  useModalGuard();
  const meta = useApi("/tasks/meta", { enabled: isManager });
  const [form, setForm] = useState({ title: "", type: "follow_up", priority: "normal", due: "", assignee: String(currentUser?.id ?? ""), note: "" });
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const people = isManager ? meta.data?.data?.assignees ?? [] : [{ id: currentUser?.id, name: currentUser?.name }];
  const assigneeOptions = [{ value: "", label: t("Belum diambil") }, ...people.filter((p) => p.id).map((p) => ({ value: String(p.id), label: p.id === currentUser?.id ? t("{name} (saya)", { name: p.name }) : p.name }))];

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const body = { leadId: lead.dbId, type: form.type, priority: form.priority, assignedTo: form.assignee ? Number(form.assignee) : null };
    if (form.title.trim()) body.title = form.title.trim();
    if (form.note.trim()) body.note = form.note.trim();
    if (form.due) body.dueAt = fromLocalInput(form.due);
    const result = await run(() => api.post("/tasks", body), { success: t("Tugas dibuat.") });
    if (result.ok) {
      onCreated();
      onClose();
    } else setErrors(fieldErrors(result.error));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Buat tugas")}
      description={t("Kontak: {name}", { name: lead.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="quick-task-form" loading={pending}>
            {t("Buat tugas")}
          </Button>
        </>
      }
    >
      <form id="quick-task-form" onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Judul")} value={form.title} onChange={set("title")} maxLength={160} error={errors.title} hint={t("Kosongkan untuk memakai nama jenis tugas dan nama kontak.")} data-autofocus />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label={t("Jenis")} value={form.type} onChange={set("type")} options={typeOptions(t)} error={errors.type} />
          <SelectField label={t("Prioritas")} value={form.priority} onChange={set("priority")} options={priorityOptions(t)} error={errors.priority} />
          <TextField label={t("Tenggat")} type="datetime-local" value={form.due} onChange={set("due")} error={errors.dueAt} />
          <SelectField label={t("Penanggung jawab")} value={form.assignee} onChange={set("assignee")} options={assigneeOptions} error={errors.assignedTo} />
        </div>
        <TextAreaField label={t("Catatan")} rows={3} value={form.note} onChange={set("note")} maxLength={2000} error={errors.note} />
      </form>
    </Modal>
  );
}
