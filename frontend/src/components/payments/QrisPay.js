"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { CopyButton } from "@/components/ui";

/**
 * The dynamic QRIS for one bill: the code with the exact amount inside, so the payer's app shows the amount and cannot
 * change it. The picture is drawn here from the payload the server made.
 */
export default function QrisPay({ qris, amountIdr, uniqueCode }) {
  const { t } = useDashboard();
  const { rupiah } = useFormat();
  const [image, setImage] = useState(null);
  const payload = qris?.payload;

  useEffect(() => {
    if (!payload) return undefined;
    let live = true;
    import("qrcode")
      .then((mod) => (mod.default || mod).toDataURL(payload, { errorCorrectionLevel: "M", margin: 2, width: 280 }))
      .then((url) => live && setImage(url))
      .catch(() => live && setImage(null));
    return () => {
      live = false;
    };
  }, [payload]);

  return (
    <div className="rounded-xl border border-line bg-white p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="w-[220px] h-[220px] flex-shrink-0 rounded-lg border border-line bg-white flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={image} alt={t("Kode QRIS {label}", { label: qris.merchantName })} width={210} height={210} className="w-[210px] h-[210px]" /> : <span className="text-label text-fg-muted">{t("Membuat kode QRIS...")}</span>}
      </div>
      <dl className="flex flex-col gap-3 text-body-sm min-w-0 w-full">
        <div>
          <dt className="text-caption font-semibold text-fg-subtle">{t("QRIS dinamis")}</dt>
          <dd className="text-body font-bold text-fg">{qris.merchantName}</dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-fg-subtle">{t("Nominal terkunci di kode")}</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="text-heading-sm font-bold text-ink tabular-nums">{rupiah(amountIdr)}</span>
            <CopyButton value={String(amountIdr)} label={t("Salin nominal")} />
          </dd>
        </div>
        {uniqueCode > 0 ? <p className="text-fg-muted">{t("Sudah termasuk kode unik Rp {code} supaya pembayaran Anda dikenali otomatis. Jangan mengubah nominalnya.", { code: uniqueCode })}</p> : null}
        <p className="text-fg-muted">{t("Pindai dengan aplikasi pembayaran apa pun yang mendukung QRIS.")}</p>
      </dl>
    </div>
  );
}
