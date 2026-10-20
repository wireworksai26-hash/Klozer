"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { Async, Button, Modal, Switch, TextField } from "@/components/ui";
import EventPicker from "./EventPicker";
import { readFormError } from "./shared";

function isWebUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Create a webhook (`webhook` empty) or edit one. The URL rules that depend on the server (private addresses) come back as its own message. */
export default function WebhookFormModal({ open, onClose, webhook, catalog, onSaved }) {
  const { t } = useDashboard();
  const formId = useId();
  const editing = Boolean(webhook);
  const [name, setName] = useState(webhook?.name || "");
  const [url, setUrl] = useState(webhook?.url || "");
  const [events, setEvents] = useState(webhook?.events || []);
  const [isActive, setIsActive] = useState(webhook ? webhook.isActive : true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const close = () => {
    if (!pending) onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = t("Isi nama webhook.");
    if (!url.trim()) next.url = t("Isi alamat tujuan.");
    else if (!isWebUrl(url.trim())) next.url = t("Alamat harus diawali https://.");
    if (!events.length) next.events = t("Pilih minimal satu event, atau aktifkan Semua event.");
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setPending(true);
    try {
      const body = { name: name.trim(), url: url.trim(), events };
      const res = editing ? await api.put(`/integrations/webhooks/${webhook.id}`, { ...body, isActive }) : await api.post("/integrations/webhooks", body);
      onSaved(res, editing);
    } catch (err) {
      const parsed = readFormError(err);
      const fields = { ...parsed.fields };
      if (err?.code === "INVALID_WEBHOOK_URL") fields.url = err.message;
      setErrors(fields);
      setFormError(Object.keys(fields).length ? "" : parsed.message || t("Terjadi kesalahan."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={editing ? t("Ubah webhook") : t("Buat webhook")}
      description={t("Klozer mengirim event ke alamat ini setiap kali kejadian yang dipilih terjadi.")}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            {t("Batal")}
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {editing ? t("Simpan webhook") : t("Buat webhook")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
        <TextField label={t("Nama")} required value={name} maxLength={100} placeholder={t("Contoh: n8n pesanan")} error={errors.name} onChange={(e) => setName(e.target.value)} data-autofocus />
        <TextField label={t("Alamat tujuan (URL)")} required value={url} maxLength={500} inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://contoh.com/webhook" hint={t("Harus alamat publik dengan https. Alamat internal ditolak.")} error={errors.url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
        <fieldset className="flex flex-col gap-2 border-0 p-0 m-0 min-w-0">
          <legend className="text-label font-semibold text-fg mb-1">{t("Event yang dikirim")}</legend>
          <Async query={catalog} loadingLabel={t("Memuat daftar event...")}>
            {(body) => <EventPicker catalog={body.data} value={events} onChange={setEvents} error={errors.events} />}
          </Async>
        </fieldset>
        {editing ? <Switch checked={isActive} onChange={setIsActive} label={t("Webhook aktif")} description={t("Bila mati, tidak ada event yang dikirim ke alamat ini.")} /> : null}
        {formError ? (
          <p role="alert" className="text-label text-danger-700">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
