"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";

const LIMITS = { label: 80, accountName: 120, accountNumber: 60, instructions: 300 };

/** Add or change a way to pay Klozer. A QRIS needs its picture, which is uploaded from the card after saving. */
export default function PaymentMethodForm({ method, onClose, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const editing = Boolean(method);
  const [kind, setKind] = useState(method?.kind ?? "qris");
  const [label, setLabel] = useState(method?.label ?? "");
  const [accountName, setAccountName] = useState(method?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(method?.accountNumber ?? "");
  const [instructions, setInstructions] = useState(method?.instructions ?? "");
  const [sortOrder, setSortOrder] = useState(String(method?.sortOrder ?? 100));
  const [errors, setErrors] = useState({});

  const needsAccount = kind !== "qris";

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (label.trim().length < 2) next.label = t("Isi nama metode, minimal 2 huruf.");
    if (needsAccount && !accountName.trim()) next.accountName = t("Isi nama pemilik.");
    if (needsAccount && !accountNumber.trim()) next.accountNumber = t("Isi nomor rekening atau akun.");
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = { label: label.trim(), accountName: accountName.trim(), accountNumber: accountNumber.trim(), instructions: instructions.trim(), sortOrder: Number(sortOrder) || 0 };
    const result = await run(() => (editing ? api.put(`/platform/payment-methods/${method.id}`, body) : api.post("/platform/payment-methods", { kind, ...body })), { success: editing ? t("Metode pembayaran disimpan.") : t("Metode pembayaran ditambahkan.") });
    if (result.ok) onSaved(result.data.data);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t("Ubah metode pembayaran") : t("Tambah metode pembayaran")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="payment-method-form" loading={pending}>
            {t("Simpan")}
          </Button>
        </>
      }
    >
      <form id="payment-method-form" onSubmit={submit} className="flex flex-col gap-4">
        <SelectField
          label={t("Jenis")}
          value={kind}
          disabled={editing}
          onChange={(e) => setKind(e.target.value)}
          options={[
            { value: "qris", label: t("QRIS merchant") },
            { value: "bank", label: t("Transfer bank") },
            { value: "ewallet", label: t("Dompet digital") },
          ]}
          hint={editing ? t("Jenis tidak bisa diubah. Hapus dan buat baru bila perlu.") : undefined}
        />
        <TextField label={t("Nama metode")} required maxLength={LIMITS.label} value={label} onChange={(e) => setLabel(e.target.value)} error={errors.label} data-autofocus />
        <TextField label={needsAccount ? t("Nama pemilik") : t("Nama merchant (opsional)")} required={needsAccount} maxLength={LIMITS.accountName} value={accountName} onChange={(e) => setAccountName(e.target.value)} error={errors.accountName} />
        {needsAccount ? <TextField label={kind === "ewallet" ? t("Nomor akun") : t("Nomor rekening")} required inputMode="numeric" maxLength={LIMITS.accountNumber} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} error={errors.accountNumber} /> : null}
        <TextAreaField label={t("Petunjuk untuk pembayar (opsional)")} rows={2} maxLength={LIMITS.instructions} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        <TextField label={t("Urutan tampil")} hint={t("Angka kecil tampil lebih dulu.")} inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ""))} />
      </form>
    </Modal>
  );
}
