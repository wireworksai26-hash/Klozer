"use client";
import { useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button } from "@/components/ui";

const MAX_BYTES = 1_500_000;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Upload or replace the picture of a QRIS merchant code. Checked here for type and size, and again by the server by its bytes. */
export default function QrisUpload({ method, onChanged }) {
  const { t, notify } = useDashboard();
  const { run, pending } = useAction();
  const input = useRef(null);
  const [reading, setReading] = useState(false);

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      notify("error", t("Pilih gambar PNG, JPG, atau WebP."));
      return;
    }
    if (file.size > MAX_BYTES) {
      notify("error", t("Gambar terlalu besar. Maksimal 1,5 MB."));
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setReading(false);
      notify("error", t("Gambar tidak bisa dibaca."));
    };
    reader.onload = async () => {
      setReading(false);
      const result = await run(() => api.put(`/platform/payment-methods/${method.id}/qris`, { fileBase64: String(reader.result), fileName: file.name }), { success: t("Gambar QRIS disimpan.") });
      if (result.ok) onChanged();
    };
    reader.readAsDataURL(file);
  };

  const remove = async () => {
    const result = await run(() => api.delete(`/platform/payment-methods/${method.id}/qris`), { success: t("Gambar QRIS dihapus. Metode ini disembunyikan.") });
    if (result.ok) onChanged();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="sr-only" tabIndex={-1} aria-label={t("Pilih gambar QRIS")} />
      <Button size="sm" variant={method.hasQris ? "secondary" : "primary"} icon="upload" loading={pending || reading} onClick={() => input.current?.click()}>
        {method.hasQris ? t("Ganti gambar QRIS") : t("Unggah gambar QRIS")}
      </Button>
      {method.hasQris ? (
        <Button size="sm" variant="quietDanger" onClick={remove} disabled={pending}>
          {t("Hapus gambar")}
        </Button>
      ) : null}
    </div>
  );
}
