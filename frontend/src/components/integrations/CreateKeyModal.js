"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { Button, ChipPicker, Modal, TextField } from "@/components/ui";
import { readFormError, useScopeInfo } from "./shared";

const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Create an API key. On success the parent gets the response (with the plain key) and shows it once. */
export default function CreateKeyModal({ open, onClose, onCreated }) {
  const { t } = useDashboard();
  const formId = useId();
  const { list } = useScopeInfo();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState([]);
  const [expires, setExpires] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const close = () => {
    if (pending) return;
    setName("");
    setScopes([]);
    setExpires("");
    setErrors({});
    setFormError("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = t("Isi nama key.");
    if (!scopes.length) next.scopes = t("Pilih minimal satu cakupan.");
    let expiresAt;
    if (expires) {
      const at = new Date(`${expires}T23:59:59`);
      if (Number.isNaN(at.getTime()) || at <= new Date()) next.expiresAt = t("Tanggal kedaluwarsa harus di masa depan.");
      else expiresAt = at.toISOString();
    }
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setPending(true);
    try {
      const res = await api.post("/integrations/api-keys", { name: name.trim(), scopes, ...(expiresAt ? { expiresAt } : {}) });
      setName("");
      setScopes([]);
      setExpires("");
      onCreated(res);
    } catch (err) {
      const parsed = readFormError(err);
      setErrors(parsed.fields);
      setFormError(parsed.message || t("Terjadi kesalahan."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("Buat API key")}
      description={t("Key dipakai kode atau alat seperti n8n untuk mengakses data toko ini.")}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            {t("Batal")}
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {t("Buat key")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
        <TextField label={t("Nama key")} required value={name} maxLength={100} placeholder={t("Contoh: n8n pesanan")} error={errors.name} onChange={(e) => setName(e.target.value)} data-autofocus />
        <div className="flex flex-col gap-2">
          <ChipPicker label={t("Cakupan")} options={list.map((s) => ({ value: s.value, label: s.label, hint: s.meaning }))} value={scopes} onChange={setScopes} />
          {errors.scopes ? (
            <p role="alert" className="text-caption text-danger-700">
              {errors.scopes}
            </p>
          ) : null}
          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            {list.map((s) => (
              <li key={s.value} className="text-caption text-fg-muted">
                <span className="font-semibold text-fg">{s.label}</span> <span className="font-mono text-fg-subtle break-all">{s.value}</span>
                <br />
                {s.meaning}
              </li>
            ))}
          </ul>
        </div>
        <TextField label={t("Kedaluwarsa (opsional)")} type="date" value={expires} min={localDate(new Date())} hint={t("Kosongkan bila key tidak perlu kedaluwarsa.")} error={errors.expiresAt} onChange={(e) => setExpires(e.target.value)} />
        {formError ? (
          <p role="alert" className="text-label text-danger-700">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
