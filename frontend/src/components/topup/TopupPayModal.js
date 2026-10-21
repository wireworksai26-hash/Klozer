"use client";
import { useEffect, useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { whatsappUrl } from "@/utils/legal/config";
import PayPanel from "@/components/payments/PayPanel";
import { Badge, Button, Modal, TextAreaField } from "@/components/ui";

const POLL_MS = 5000;

/**
 * How to pay one bill. The exact amount carries a unique code, and the screen asks the server every few seconds whether the
 * payment has arrived: when it has, the tokens are already in the quota and this says so. "Saya sudah bayar" stays as the
 * way to tell the team when the payment is not picked up by itself.
 */
export default function TopupPayModal({ topup, onClose, onChanged }) {
  const { t, currentUser } = useDashboard();
  const { number, rupiah, dateTime } = useFormat();
  const { run, pending } = useAction();
  const [reference, setReference] = useState("");
  const [claimedAt, setClaimedAt] = useState(topup.paymentClaimedAt);
  const announced = useRef(false);
  const wa = whatsappUrl();

  // the amount, its dynamic QRIS and whether it is paid yet; asked again every few seconds while it is open
  const query = useApi(`/ai/topups/${topup.id}/pay`);
  const { reload } = query;
  const pay = query.data; // { status, paid, amountIdr, uniqueCode, qris }

  const open = !pay || pay.status === "quoted";
  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [open, reload]);

  useEffect(() => {
    if (pay?.paid && !announced.current) {
      announced.current = true;
      onChanged();
    }
  }, [pay?.paid, onChanged]);

  const claimed = Boolean(claimedAt);
  const amount = pay?.amountIdr ?? topup.payAmountIdr ?? topup.quotedAmountIdr;

  const paid = async (e) => {
    e.preventDefault();
    const result = await run(() => api.post(`/ai/topups/${topup.id}/paid`, { reference: reference.trim() || undefined }), { success: t("Terima kasih. Tim Klozer akan mengecek pembayaran Anda.") });
    if (result.ok) setClaimedAt(result.data.data.paymentClaimedAt);
  };

  const message = t("Halo tim Klozer, saya {name} sudah membayar top up #{id}: {tokens} token, {amount}.", { name: currentUser?.institutionName || currentUser?.name || "", id: topup.id, tokens: number(topup.tokens), amount: rupiah(amount) });

  if (pay?.paid) {
    return (
      <Modal open onClose={onClose} title={t("Pembayaran diterima")} footer={<Button onClick={onClose}>{t("Selesai")}</Button>}>
        <div className="rounded-xl bg-success-50 border border-success-200 px-5 py-4">
          <div className="text-body font-bold text-success-700">{t("{tokens} token ditambahkan ke kuota Anda.", { tokens: number(topup.tokens) })}</div>
          <div className="text-body-sm text-fg-muted mt-1">{t("Top up #{id} lunas.", { id: topup.id })}</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={t("Bayar top up #{id}", { id: topup.id })} description={t("{tokens} token", { tokens: number(topup.tokens) })} size="lg">
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-brand-soft border border-brand/20 px-5 py-4">
          <div className="text-label font-semibold text-fg-muted">{t("Bayar tepat sebesar")}</div>
          <div className="text-heading-md font-bold text-ink tabular-nums">{rupiah(amount)}</div>
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
          <PayPanel qris={pay?.qris ?? null} amountIdr={amount} uniqueCode={pay?.uniqueCode ?? topup.uniqueCode} />
          <p className="text-label text-fg-muted flex items-center gap-2" role="status">
            <Badge tone="brand">{t("Menunggu pembayaran")}</Badge>
            {t("Halaman ini memeriksa pembayaran Anda otomatis. Token masuk begitu pembayaran diterima.")}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="card-title">{t("Sudah membayar tapi belum masuk?")}</h3>
          {claimed ? (
            <div className="flex flex-wrap items-center gap-2 text-body-sm text-fg-muted">
              <Badge tone="warning">{t("Menunggu dicek tim")}</Badge>
              <span>{t("Dikonfirmasi {time}. Token ditambahkan setelah pembayaran dicek.", { time: dateTime(claimedAt) })}</span>
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
