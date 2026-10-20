"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, TextField } from "@/components/ui";
import { FILE_ACCEPT, FILE_EXTENSIONS, FILE_MAX_BYTES, TITLE_MAX, extensionOf, formatBytes } from "./limits";

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Upload a PDF, TXT or MD file. The browser checks type and size first, then sends it as base64 in JSON. */
export default function FileDocumentModal({ onClose, onSaved }) {
  const { t, locale } = useDashboard();
  const fmt = useFormat();
  const formId = useId();
  const fileInputId = useId();
  const { run, pending } = useAction();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState(null);

  const choose = (e) => {
    const picked = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!FILE_EXTENSIONS.includes(extensionOf(picked.name))) {
      setFile(null);
      setFileError(t("Format berkas belum didukung. Gunakan PDF, TXT, atau MD."));
      return;
    }
    if (picked.size > FILE_MAX_BYTES) {
      setFile(null);
      setFileError(t("Berkas terlalu besar (maksimal {max}).", { max: formatBytes(FILE_MAX_BYTES, locale) }));
      return;
    }
    if (picked.size === 0) {
      setFile(null);
      setFileError(t("Berkas kosong."));
      return;
    }
    setFile(picked);
  };

  const titleError = title.trim().length > TITLE_MAX ? t("Maksimal {max} karakter", { max: fmt.number(TITLE_MAX) }) : null;
  const busy = reading || pending;
  const valid = Boolean(file) && !titleError;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setReading(true);
    let dataUrl;
    try {
      dataUrl = await readAsDataUrl(file);
    } catch {
      setFileError(t("Berkas tidak bisa dibaca di browser. Pilih berkasnya lagi."));
      return;
    } finally {
      setReading(false);
    }
    const body = { fileName: file.name, contentBase64: dataUrl };
    if (title.trim()) body.title = title.trim();
    const result = await run(() => api.post("/knowledge/file", body), { success: t("Berkas dibaca dan ditambahkan. AI langsung bisa memakainya.") });
    if (result.ok) onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Unggah berkas")}
      description={t("PDF harus punya lapisan teks (bukan hasil scan). TXT dan MD harus berenkode UTF-8.")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form={formId} icon="upload" loading={busy} disabled={!valid}>
            {busy ? t("Membaca berkas...") : t("Unggah berkas")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fileInputId} className="text-label font-semibold text-fg">
            {t("Berkas")}
            <span className="text-danger-700" aria-label={t("wajib diisi")}> *</span>
          </label>
          <input
            id={fileInputId}
            type="file"
            accept={FILE_ACCEPT}
            onChange={choose}
            disabled={busy}
            data-autofocus
            aria-invalid={fileError ? true : undefined}
            aria-describedby={`${fileInputId}-note`}
            className="w-full text-body-sm text-fg file:mr-3 file:px-4 file:py-2 file:rounded-full file:border file:border-line-strong file:bg-white file:text-label file:font-semibold file:text-fg file:cursor-pointer hover:file:bg-sunken"
          />
          {fileError ? (
            <p id={`${fileInputId}-note`} role="alert" className="text-caption text-danger-700">
              {fileError}
            </p>
          ) : (
            <p id={`${fileInputId}-note`} className="text-caption text-fg-subtle">
              {file ? t("{name} ({size})", { name: file.name, size: formatBytes(file.size, locale) }) : t("PDF, TXT, atau MD. Maksimal {max}.", { max: formatBytes(FILE_MAX_BYTES, locale) })}
            </p>
          )}
        </div>
        <TextField label={t("Judul (opsional)")} value={title} onChange={(e) => setTitle(e.target.value)} error={titleError} hint={t("Kosongkan untuk memakai nama berkas.")} disabled={busy} />
      </form>
    </Modal>
  );
}
