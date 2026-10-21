"use client";
import { useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Badge, Button } from "@/components/ui";

const MAX_BYTES = 3_000_000;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_PROOFS = 3;

/** Upload a picture of the transfer proof for one bill, so the team can check the payment against it. */
export default function ProofUpload({ kind, id, count, onUploaded }) {
  const { t, notify } = useDashboard();
  const { run, pending } = useAction();
  const input = useRef(null);
  const [reading, setReading] = useState(false);
  const path = kind === "topup" ? `/ai/topups/${id}/proof` : `/billing/orders/${id}/proof`;

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      notify("error", t("Pilih gambar PNG, JPG, atau WebP."));
      return;
    }
    if (file.size > MAX_BYTES) {
      notify("error", t("Gambar terlalu besar. Maksimal 3 MB."));
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
      const result = await run(() => api.post(path, { fileBase64: String(reader.result), fileName: file.name }), { success: t("Bukti pembayaran terunggah.") });
      if (result.ok) onUploaded(result.data.proofCount);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="sr-only" tabIndex={-1} aria-label={t("Pilih gambar bukti transfer")} />
      <Button type="button" variant="secondary" icon="upload" loading={pending || reading} disabled={count >= MAX_PROOFS} onClick={() => input.current?.click()}>
        {t("Unggah bukti transfer")}
      </Button>
      {count > 0 ? <Badge tone="success">{t("{n} bukti terunggah", { n: count })}</Badge> : null}
      {count >= MAX_PROOFS ? <span className="text-label text-fg-muted">{t("Maksimal {n} bukti per tagihan.", { n: MAX_PROOFS })}</span> : null}
    </div>
  );
}
