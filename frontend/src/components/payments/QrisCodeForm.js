"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, Modal, TextAreaField } from "@/components/ui";

/** The text of the merchant's static QRIS, for when it cannot be read from the picture. Each bill's code is made from it. */
export default function QrisCodeForm({ method, onClose, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [payload, setPayload] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (payload.trim().length < 40) {
      setError(t("Tempel isi kode QRIS lengkap, dimulai dengan 000201."));
      return;
    }
    setError("");
    const result = await run(() => api.put(`/platform/payment-methods/${method.id}/qris-code`, { payload: payload.trim() }), { success: t("Kode QRIS disimpan. Nominal sekarang otomatis di tiap tagihan.") });
    if (result.ok) onSaved();
  };
  const remove = async () => {
    const result = await run(() => api.delete(`/platform/payment-methods/${method.id}/qris-code`), { success: t("Kode QRIS dihapus. Tagihan kembali memakai gambar statis.") });
    if (result.ok) onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Kode QRIS merchant")}
      description={t("Isi teks yang ada di dalam QR QRIS statis Anda. Dari sini dibuat QRIS dengan nominal untuk tiap tagihan.")}
      footer={
        <>
          {method.dynamicQris ? (
            <Button variant="quietDanger" onClick={remove} disabled={pending}>
              {t("Hapus kode")}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="qris-code-form" loading={pending}>
            {t("Simpan")}
          </Button>
        </>
      }
    >
      <form id="qris-code-form" onSubmit={submit} className="flex flex-col gap-4">
        {method.dynamicQris ? <p className="text-body-sm text-success-700 font-semibold">{t("Kode dinamis aktif untuk {name}.", { name: method.merchantName })}</p> : null}
        <TextAreaField label={t("Isi kode QRIS")} hint={t("Bisa didapat dari aplikasi pemindai QR yang menampilkan teksnya. Hanya QRIS statis tanpa nominal.")} rows={5} value={payload} onChange={(e) => setPayload(e.target.value)} error={error} data-autofocus />
      </form>
    </Modal>
  );
}
