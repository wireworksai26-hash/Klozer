"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { whatsappUrl } from "@/utils/legal/config";
import PayWith from "@/components/payments/PayWith";
import { Badge, Button, Modal, TextAreaField } from "@/components/ui";

/** How to pay one bill, and the way to say it has been paid so the team can match the payment and add the tokens. */
export default function TopupPayModal({ topup, onClose, onChanged }) {
  const { t, currentUser } = useDashboard();
  const { number, rupiah, dateTime } = useFormat();
  const { run, pending } = useAction();
  const [reference, setReference] = useState("");
  const claimed = Boolean(topup.paymentClaimedAt);
  const wa = whatsappUrl();

  const paid = async (e) => {
    e.preventDefault();
    const result = await run(() => api.post(`/ai/topups/${topup.id}/paid`, { reference: reference.trim() || undefined }), { success: t("Terima kasih. Tim Klozer akan mengecek pembayaran Anda.") });
    if (result.ok) onChanged();
  };

  const message = t("Halo tim Klozer, saya {name} sudah membayar top up #{id}: {tokens} token, {amount}.", { name: currentUser?.institutionName || currentUser?.name || "", id: topup.id, tokens: number(topup.tokens), amount: rupiah(topup.quotedAmountIdr) });

  return (
    <Modal open onClose={onClose} title={t("Bayar top up #{id}", { id: topup.id })} description={t("{tokens} token", { tokens: number(topup.tokens) })} size="lg">
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-brand-soft border border-brand/20 px-5 py-4">
          <div className="text-label font-semibold text-fg-muted">{t("Bayar tepat sebesar")}</div>
          <div className="text-heading-md font-bold text-ink tabular-nums">{rupiah(topup.quotedAmountIdr)}</div>
          {topup.discountIdr > 0 ? (
            <div className="text-label text-fg-muted mt-1 tabular-nums">
              {t("Harga normal {price}, voucher {code} memotong {discount}.", { price: rupiah(topup.listPriceIdr), code: topup.voucherCode, discount: rupiah(topup.discountIdr) })}
            </div>
          ) : topup.quoteNote ? (
            <div className="text-label text-fg-muted mt-1">{topup.quoteNote}</div>
          ) : null}
        </div>

        <section aria-label={t("Metode pembayaran")} className="flex flex-col gap-3">
          <h3 className="card-title">{t("Bayar lewat")}</h3>
          <PayWith />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="card-title">{t("Sudah membayar?")}</h3>
          {claimed ? (
            <div className="flex flex-wrap items-center gap-2 text-body-sm text-fg-muted">
              <Badge tone="warning">{t("Menunggu dicek tim")}</Badge>
              <span>{t("Dikonfirmasi {time}. Token ditambahkan setelah pembayaran dicek.", { time: dateTime(topup.paymentClaimedAt) })}</span>
            </div>
          ) : (
            <form onSubmit={paid} className="flex flex-col gap-3">
              <TextAreaField label={t("Keterangan pembayaran (opsional)")} hint={t("Misalnya nama pengirim dan jam transfer, supaya mudah dicocokkan.")} rows={2} maxLength={300} value={reference} onChange={(e) => setReference(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" icon="check" loading={pending}>
                  {t("Saya sudah bayar")}
                </Button>
                {wa ? (
                  <Button variant="secondary" icon="whatsapp" href={`${wa}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                    {t("Kirim bukti lewat WhatsApp")}
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </section>
      </div>
    </Modal>
  );
}
