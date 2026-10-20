"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";

/** The team adds tokens to a client directly. Kept in the client's history with the reason. */
export default function GrantModal({ onClose, onDone }) {
  const { t, institutions } = useDashboard();
  const { number } = useFormat();
  const { run, pending } = useAction();
  const [shop, setShop] = useState("");
  const [tokens, setTokens] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const picked = institutions.find((i) => String(i.dbId) === shop);

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(tokens);
    const next = {};
    if (!shop) next.shop = t("Pilih toko.");
    if (!amount || amount % 1000 !== 0) next.tokens = t("Isi jumlah token, kelipatan 1.000.");
    if (reason.trim().length < 3) next.reason = t("Tulis alasannya.");
    setErrors(next);
    if (Object.keys(next).length) return;
    const result = await run(() => api.post("/ai/topups/grant", { institutionId: Number(shop), tokens: amount, reason: reason.trim() }), { success: t("Token ditambahkan ke kuota toko.") });
    if (result.ok) onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Beri token langsung")}
      description={t("Token masuk ke kuota toko saat ini juga, tanpa tagihan.")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="grant-form" loading={pending}>
            {t("Tambahkan token")}
          </Button>
        </>
      }
    >
      <form id="grant-form" onSubmit={submit} className="flex flex-col gap-4">
        <SelectField label={t("Toko")} value={shop} onChange={(e) => {
            setShop(e.target.value);
            setErrors((prev) => ({ ...prev, shop: undefined }));
          }} placeholder={t("Pilih toko")} options={institutions.map((i) => ({ value: String(i.dbId), label: i.name }))} error={errors.shop} hint={picked ? t("Sisa token sekarang: {left} dari {total}", { left: number(Math.max(0, picked.quotaMax - picked.quotaUsed)), total: number(picked.quotaMax) }) : undefined} data-autofocus />
        <TextField label={t("Jumlah token")} inputMode="numeric" value={tokens} onChange={(e) => {
            setTokens(e.target.value.replace(/\D/g, ""));
            setErrors((prev) => ({ ...prev, tokens: undefined }));
          }} error={errors.tokens} />
        <TextAreaField label={t("Alasan")} hint={t("Tampil di riwayat toko dan tercatat di log aktivitas.")} rows={2} maxLength={300} value={reason} onChange={(e) => {
            setReason(e.target.value);
            setErrors((prev) => ({ ...prev, reason: undefined }));
          }} error={errors.reason} />
      </form>
    </Modal>
  );
}
