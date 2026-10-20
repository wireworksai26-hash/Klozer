"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, TextAreaField, TextField } from "@/components/ui";

/** The team sets the price of a request and tells the shop how to pay. */
export default function QuoteModal({ topup, onClose, onDone }) {
  const { t } = useDashboard();
  const { number } = useFormat();
  const { run, pending } = useAction();
  const [amount, setAmount] = useState(topup.quotedAmountIdr ? String(topup.quotedAmountIdr) : "");
  const [note, setNote] = useState(topup.quoteNote || "");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount.replace(/\D/g, ""));
    if (!value) {
      setError(t("Isi harga lebih dari 0."));
      return;
    }
    setError("");
    const result = await run(() => api.put(`/ai/topups/${topup.id}/quote`, { amountIdr: value, note: note.trim() || undefined }), { success: t("Harga disimpan. Toko melihatnya di halaman top up.") });
    if (result.ok) onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={topup.status === "quoted" ? t("Ubah harga") : t("Beri harga")}
      description={t("{shop}: {tokens} token", { shop: topup.institutionName, tokens: number(topup.tokens) })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="quote-form" loading={pending}>
            {t("Simpan harga")}
          </Button>
        </>
      }
    >
      <form id="quote-form" onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Harga (Rp)")} inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} error={error} data-autofocus />
        <TextAreaField label={t("Cara bayar dan catatan untuk toko")} hint={t("Tampil di halaman top up toko.")} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        {topup.note ? <p className="text-label text-fg-muted">{t("Catatan dari toko: {note}", { note: topup.note })}</p> : null}
      </form>
    </Modal>
  );
}
