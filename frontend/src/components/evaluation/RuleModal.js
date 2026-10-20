"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, TextAreaField } from "@/components/ui";
import { NOTE_MAX, REPLY_MAX, RULE_MAX, RULE_MIN } from "./limits";

/**
 * Add a standing rule, or edit a rule or a corrected answer when `correction` is given. Mount it to open it.
 * `onSaved(correction)` receives the stored item.
 */
export default function RuleModal({ correction = null, onClose, onSaved }) {
  const { t } = useDashboard();
  const fmt = useFormat();
  const formId = useId();
  const { run, pending } = useAction();
  const isRule = !correction || correction.kind === "rule";
  const max = isRule ? RULE_MAX : REPLY_MAX;
  const min = isRule ? RULE_MIN : 1;
  const [text, setText] = useState(correction ? (isRule ? correction.ruleText : correction.correctedReply) ?? "" : "");
  const [note, setNote] = useState(correction?.note ?? "");

  const length = text.trim().length;
  const textError = length > max ? t("Maksimal {max} karakter", { max: fmt.number(max) }) : null;
  const noteError = note.trim().length > NOTE_MAX ? t("Maksimal {max} karakter", { max: fmt.number(NOTE_MAX) }) : null;
  const valid = length >= min && !textError && !noteError;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const result = correction
      ? await run(() => api.put(`/ai/corrections/${correction.id}`, { ...(isRule ? { ruleText: text.trim() } : { correctedReply: text.trim() }), note: note.trim() }), { success: t("Perubahan disimpan.") })
      : await run(() => api.post("/ai/rules", { ruleText: text.trim() }), { success: t("Aturan tersimpan. AI akan selalu mengikutinya.") });
    if (result.ok) onSaved(result.data.data);
  };

  const title = !correction ? t("Tambah aturan") : isRule ? t("Ubah aturan") : t("Ubah jawaban yang benar");

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={isRule ? t("Aturan dikirim ke AI pada setiap balasan.") : t("Dipakai AI untuk pertanyaan yang mirip dengan pesan pelanggan aslinya.")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form={formId} loading={pending} disabled={!valid}>
            {correction ? t("Simpan perubahan") : t("Simpan aturan")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        <TextAreaField
          label={isRule ? t("Aturan") : t("Jawaban yang benar")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={isRule ? 4 : 7}
          required
          placeholder={isRule ? t("Tulis satu instruksi untuk semua balasan AI") : undefined}
          error={textError}
          hint={t("{count} dari {max} karakter", { count: fmt.number(length), max: fmt.number(max) })}
          data-autofocus
        />
        {correction ? <TextAreaField label={t("Catatan (opsional)")} value={note} onChange={(e) => setNote(e.target.value)} rows={2} error={noteError} hint={t("Alasan koreksi. Maksimal {max} karakter.", { max: NOTE_MAX })} /> : null}
      </form>
    </Modal>
  );
}
