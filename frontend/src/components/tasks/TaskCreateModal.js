"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { fromLocalInput } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, SearchInput, SelectField, TextAreaField, TextField } from "@/components/ui";
import { fieldErrors, priorityOptions, typeOptions } from "./taskMeta";

/** Look contacts up by name or number as the person types. Keeps nothing from an older word on screen. */
function useContactSearch(text) {
  const [found, setFound] = useState({ text: "", items: [], failed: false });
  const word = text.trim();
  useEffect(() => {
    if (word.length < 2) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .get("/leads", { query: { search: word, limit: 8 }, signal: controller.signal })
        .then((res) => setFound({ text: word, items: res.items || res.data || [], failed: false }))
        .catch((err) => {
          if (err?.name !== "AbortError") setFound({ text: word, items: [], failed: true });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [word]);
  const settled = word.length >= 2 && found.text === word;
  return { items: settled ? found.items : [], failed: settled && found.failed, settled };
}

/**
 * The create form. Managers may give the task to anyone; everyone else only to themselves or to nobody.
 * Mount it only while open, so every opening starts from an empty form.
 */
export default function TaskCreateModal({ meta, onClose, onCreated }) {
  const { t, isManager, currentUser, orders } = useDashboard();
  const { run, pending } = useAction();
  const [form, setForm] = useState({ title: "", type: "follow_up", priority: "normal", due: "", assignee: String(currentUser?.id ?? ""), note: "", orderId: "" });
  const [contact, setContact] = useState(null);
  const [contactText, setContactText] = useState("");
  const [errors, setErrors] = useState({});
  const search = useContactSearch(contactText);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const contactOrders = contact ? orders.filter((o) => o.leadDbId === contact.id) : [];

  const people = isManager ? meta.assignees : meta.assignees.filter((p) => p.id === currentUser?.id);
  const assigneeOptions = [{ value: "", label: t("Belum diambil") }, ...people.map((p) => ({ value: String(p.id), label: p.id === currentUser?.id ? t("{name} (saya)", { name: p.name }) : p.name }))];

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const body = { type: form.type, priority: form.priority, assignedTo: form.assignee ? Number(form.assignee) : null };
    if (form.title.trim()) body.title = form.title.trim();
    if (form.note.trim()) body.note = form.note.trim();
    if (form.due) body.dueAt = fromLocalInput(form.due);
    if (contact) body.leadId = contact.id;
    if (contact && form.orderId) body.orderId = Number(form.orderId);
    const result = await run(() => api.post("/tasks", body), { success: t("Tugas dibuat.") });
    if (result.ok) {
      onCreated(result.data?.data);
      onClose();
    } else setErrors(fieldErrors(result.error));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Buat tugas")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="task-create-form" loading={pending}>
            {t("Buat tugas")}
          </Button>
        </>
      }
    >
      <form id="task-create-form" onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Judul")} value={form.title} onChange={set("title")} maxLength={160} error={errors.title} hint={t("Kosongkan untuk memakai nama jenis tugas dan nama kontak.")} data-autofocus />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label={t("Jenis")} value={form.type} onChange={set("type")} options={typeOptions(t)} error={errors.type} />
          <SelectField label={t("Prioritas")} value={form.priority} onChange={set("priority")} options={priorityOptions(t)} error={errors.priority} />
          <TextField label={t("Tenggat")} type="datetime-local" value={form.due} onChange={set("due")} error={errors.dueAt} />
          <SelectField label={t("Penanggung jawab")} value={form.assignee} onChange={set("assignee")} options={assigneeOptions} error={errors.assignedTo} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-label font-semibold text-fg">{t("Kontak (opsional)")}</span>
          {contact ? (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-sunken border border-line rounded-xl">
              <span className="text-body-sm font-semibold text-fg truncate">{contact.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setContact(null);
                  setContactText("");
                  setForm((f) => ({ ...f, orderId: "" }));
                }}
              >
                {t("Ganti kontak")}
              </Button>
            </div>
          ) : (
            <>
              <SearchInput value={contactText} onChange={(e) => setContactText(e.target.value)} placeholder={t("Cari nama atau nomor kontak")} aria-label={t("Cari kontak")} />
              {search.failed ? <p className="text-caption text-danger-700">{t("Kontak tidak bisa dicari sekarang.")}</p> : null}
              {search.settled && !search.failed && search.items.length === 0 ? <p className="text-caption text-fg-subtle">{t("Tidak ada kontak yang cocok.")}</p> : null}
              {search.items.length ? (
                <ul className="flex flex-col border border-line rounded-xl divide-y divide-line overflow-hidden">
                  {search.items.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => setContact({ id: lead.id, name: lead.name })}
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-11 text-left bg-white border-none cursor-pointer hover:bg-sunken focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        <span className="text-body-sm font-semibold text-fg truncate">{lead.name}</span>
                        <span className="text-caption text-fg-muted tabular-nums flex-shrink-0">{lead.phone_number ? `+${lead.phone_number}` : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
          {errors.leadId ? (
            <p role="alert" className="text-caption text-danger-700">
              {errors.leadId}
            </p>
          ) : null}
        </div>

        {contact ? (
          contactOrders.length ? (
            <SelectField
              label={t("Pesanan (opsional)")}
              value={form.orderId}
              onChange={set("orderId")}
              placeholder={t("Tidak dikaitkan ke pesanan")}
              options={contactOrders.map((o) => ({ value: String(o.dbId), label: `${o.id} | Rp ${Number(o.total).toLocaleString("id-ID")}` }))}
              error={errors.orderId}
            />
          ) : (
            <p className="text-caption text-fg-subtle">{t("Kontak ini belum punya pesanan.")}</p>
          )
        ) : null}

        <TextAreaField label={t("Catatan")} rows={3} value={form.note} onChange={set("note")} maxLength={2000} error={errors.note} />
      </form>
    </Modal>
  );
}
