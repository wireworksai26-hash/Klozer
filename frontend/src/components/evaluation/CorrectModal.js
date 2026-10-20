"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, TextAreaField } from "@/components/ui";
import { NOTE_MAX, REPLY_MAX } from "./limits";

/** Write the answer the AI should have given for one reply. Mount it to open it. */
export default function CorrectModal({ item, onClose, onSaved }) {
  const { t } = useDashboard();
  const fmt = useFormat();
  const formId = useId();
  const { run, pending } = useAction();
  const [reply, setReply] = useState(item.correction?.correctedReply ?? "");
  const [note, setNote] = useState("");

  const length = reply.trim().length;
  const replyError = length > REPLY_MAX ? t("Maksimal {max} karakter", { max: fmt.number(REPLY_MAX) }) : null;
  const noteError = note.trim().length > NOTE_MAX ? t("Maksimal {max} karakter", { max: fmt.number(NOTE_MAX) }) : null;
  const valid = length > 0 && !replyError && !noteError;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const body = { correctedReply: reply.trim() };
    if (note.trim()) body.note = note.trim();
    const result = await run(() => api.post(`/ai/evaluation/${item.messageId}/correct`, body), { success: t("Koreksi tersimpan. AI akan memakainya untuk pertanyaan serupa.") });
    if (result.ok) onSaved(result.data.data);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Perbaiki jawaban")}
      description={t("AI memakai koreksi ini untuk pertanyaan serupa berikutnya. Balasan ini ikut ditandai Kurang.")}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form={formId} loading={pending} disabled={!valid}>
            {t("Simpan koreksi")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-label font-semibold text-fg-muted">{t("Pesan pelanggan")}</div>
            <p className="text-body-sm text-fg whitespace-pre-wrap break-words">{item.customerMessage || "-"}</p>
          </div>
          <div>
            <div className="text-label font-semibold text-fg-muted">{t("Balasan AI")}</div>
            <p className="text-body-sm text-fg-muted whitespace-pre-wrap break-words">{item.aiReply}</p>
          </div>
        </div>
        <TextAreaField
          label={t("Jawaban yang benar")}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          required
          error={replyError}
          hint={t("{count} dari {max} karakter", { count: fmt.number(length), max: fmt.number(REPLY_MAX) })}
          data-autofocus
        />
        <TextAreaField label={t("Catatan (opsional)")} value={note} onChange={(e) => setNote(e.target.value)} rows={2} error={noteError} hint={t("Alasan koreksi. Maksimal {max} karakter.", { max: NOTE_MAX })} />
      </form>
    </Modal>
  );
}
