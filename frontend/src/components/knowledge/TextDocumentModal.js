"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, TextAreaField, TextField } from "@/components/ui";
import { CONTENT_MAX, CONTENT_MIN, TITLE_MAX } from "./limits";

/** Add a document by typing or pasting its text. Mount it to open it; it forgets its fields when unmounted. */
export default function TextDocumentModal({ onClose, onSaved }) {
  const { t } = useDashboard();
  const fmt = useFormat();
  const formId = useId();
  const { run, pending } = useAction();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const length = content.trim().length;
  const titleError = title.trim().length > TITLE_MAX ? t("Maksimal {max} karakter", { max: fmt.number(TITLE_MAX) }) : null;
  const contentError = length > CONTENT_MAX ? t("Maksimal {max} karakter", { max: fmt.number(CONTENT_MAX) }) : null;
  const valid = title.trim() && length >= CONTENT_MIN && !titleError && !contentError;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const result = await run(() => api.post("/knowledge/text", { title: title.trim(), content: content.trim() }), { success: t("Dokumen ditambahkan. AI langsung bisa memakainya.") });
    if (result.ok) onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Tambah dokumen teks")}
      description={t("Tempel isi SOP, kebijakan, atau tanya jawab yang perlu diketahui AI.")}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form={formId} loading={pending} disabled={!valid}>
            {t("Simpan dokumen")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Judul")} value={title} onChange={(e) => setTitle(e.target.value)} required error={titleError} data-autofocus />
        <TextAreaField
          label={t("Isi dokumen")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          required
          error={contentError}
          hint={t("{count} dari {max} karakter (minimal {min})", { count: fmt.number(length), max: fmt.number(CONTENT_MAX), min: CONTENT_MIN })}
        />
      </form>
    </Modal>
  );
}
