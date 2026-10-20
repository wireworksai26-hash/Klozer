"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, ErrorState, LoadingState, Modal, Switch, TextAreaField, TextField } from "@/components/ui";
import { CONTENT_MAX, CONTENT_MIN, TITLE_MAX, formatBytes } from "./limits";

function EditForm({ doc, onClose, onSaved }) {
  const { t, locale } = useDashboard();
  const fmt = useFormat();
  const formId = useId();
  const { run, pending } = useAction();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.text ?? "");
  const [isActive, setIsActive] = useState(doc.isActive);

  const length = content.trim().length;
  const titleError = !title.trim() ? t("wajib diisi") : title.trim().length > TITLE_MAX ? t("Maksimal {max} karakter", { max: fmt.number(TITLE_MAX) }) : null;
  const contentError = length < CONTENT_MIN ? t("Minimal {min} karakter", { min: CONTENT_MIN }) : length > CONTENT_MAX ? t("Maksimal {max} karakter", { max: fmt.number(CONTENT_MAX) }) : null;

  const changes = {};
  if (title.trim() !== doc.title) changes.title = title.trim();
  if (content.trim() !== (doc.text ?? "").trim()) changes.content = content.trim();
  if (isActive !== doc.isActive) changes.isActive = isActive;
  const dirty = Object.keys(changes).length > 0;
  const valid = dirty && !titleError && !contentError;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const result = await run(() => api.put(`/knowledge/${doc.id}`, changes), { success: t("Dokumen diperbarui.") });
    if (result.ok) onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={doc.title}
      description={doc.sourceType === "file" ? t("Dari berkas {name}. Teks di bawah adalah hasil bacaannya.", { name: doc.fileName || "-" }) : t("Dokumen teks")}
      variant="drawer"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Tutup")}
          </Button>
          <Button type="submit" form={formId} loading={pending} disabled={!valid}>
            {t("Simpan perubahan")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-3 text-label">
          <div>
            <dt className="text-fg-muted">{t("Potongan")}</dt>
            <dd className="font-semibold text-fg tabular-nums">{fmt.number(doc.chunkCount)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t("Ukuran")}</dt>
            <dd className="font-semibold text-fg tabular-nums">{formatBytes(doc.byteSize, locale)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t("Diperbarui")}</dt>
            <dd className="font-semibold text-fg">{fmt.dateTime(doc.updatedAt)}</dd>
          </div>
        </dl>
        <Switch checked={isActive} onChange={setIsActive} label={t("Dipakai AI")} description={t("Dokumen nonaktif tidak dibaca AI, tetapi tetap tersimpan.")} />
        <TextField label={t("Judul")} value={title} onChange={(e) => setTitle(e.target.value)} required error={titleError} />
        <TextAreaField
          label={t("Isi dokumen")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          required
          error={contentError}
          hint={t("{count} dari {max} karakter. Mengubah isi membagi ulang dokumen menjadi potongan.", { count: fmt.number(length), max: fmt.number(CONTENT_MAX) })}
        />
      </form>
    </Modal>
  );
}

/** Opens one document with its text. Mount it with the document id to open it. */
export default function DocumentModal({ id, onClose, onSaved }) {
  const { t } = useDashboard();
  const query = useApi(`/knowledge/${id}`);
  const doc = query.data?.data;

  if (doc) return <EditForm doc={doc} onClose={onClose} onSaved={onSaved} />;
  return (
    <Modal open onClose={onClose} title={t("Dokumen")} variant="drawer">
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : <LoadingState label={t("Memuat dokumen...")} />}
    </Modal>
  );
}
