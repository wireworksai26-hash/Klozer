"use client";
import { useEffect, useRef, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import PayPanel from "@/components/payments/PayPanel";
import ProofUpload from "./ProofUpload";
import { Badge, Button, Modal, TextAreaField } from "@/components/ui";

const POLL_MS = 5000;

/**
 * Pay one package bill. The screen asks the server every few seconds whether the payment has arrived, and when it has,
 * the plan, features and tokens are already applied: it says so and refreshes the dashboard behind it.
 */
export default function OrderPayModal({ orderId, initial, onClose, onChanged }) {
  const { t } = useDashboard();
  const { number, rupiah, date, dateTime } = useFormat();
  const { run, pending } = useAction();
  const [reference, setReference] = useState("");
  const [uploaded, setUploaded] = useState(null); // proof count after an upload here
  const announced = useRef(false);

  // the bill and its dynamic QRIS; asked again every few seconds while it is open. `initial` is what creating it returned.
  const query = useApi(`/billing/orders/${orderId}`);
  const { reload } = query;
  const info = query.data ?? initial ?? null; // { order, qris }
  const failed = Boolean(query.error) && !info;

  const status = info?.order.status;
  useEffect(() => {
    if (status !== "pending") return undefined;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [status, reload]);

  useEffect(() => {
    if (status === "paid" && !announced.current) {
      announced.current = true;
      onChanged();
    }
  }, [status, onChanged]);

  const claim = async (e) => {
    e.preventDefault();
    const result = await run(() => api.post(`/billing/orders/${orderId}/paid`, { reference: reference.trim() || undefined }), { success: t("Terima kasih. Tim Klozer akan mengecek pembayaran Anda.") });
    if (result.ok) reload();
  };
  const cancel = async () => {
    const result = await run(() => api.post(`/billing/orders/${orderId}/cancel`), { success: t("Tagihan dibatalkan.") });
    if (result.ok) {
      onChanged();
      onClose();
    }
  };

  if (!info) {
    return (
      <Modal open onClose={onClose} title={t("Bayar paket")}>
        <p className="text-body-sm text-fg-muted">{failed ? t("Tagihan belum bisa dimuat. Coba lagi sebentar.") : t("Memuat tagihan...")}</p>
      </Modal>
    );
  }

  const { order, qris } = info;
  const planLabel = `${order.planName} ${order.period === "annual" ? t("tahunan") : t("bulanan")}`;

  if (order.status === "paid") {
    return (
      <Modal open onClose={onClose} title={t("Pembayaran diterima")} footer={<Button onClick={onClose}>{t("Selesai")}</Button>}>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-success-50 border border-success-200 px-5 py-4">
            <div className="text-body font-bold text-success-700">{t("Paket {plan} aktif.", { plan: planLabel })}</div>
            <div className="text-body-sm text-fg-muted mt-1">{t("Berlaku sampai {date}.", { date: date(order.activatedUntil) })}</div>
          </div>
          <ul className="text-body-sm text-fg flex flex-col gap-1">
            <li>{t("Fitur paket sudah aktif.")}</li>
            <li>{t("{tokens} token AI ditambahkan ke kuota Anda.", { tokens: number(order.tokensGranted) })}</li>
          </ul>
        </div>
      </Modal>
    );
  }

  if (order.status !== "pending") {
    return (
      <Modal open onClose={onClose} title={t("Tagihan paket {plan}", { plan: planLabel })} footer={<Button onClick={onClose}>{t("Tutup")}</Button>}>
        <p className="text-body-sm text-fg-muted">{order.status === "expired" ? t("Tagihan ini sudah kedaluwarsa. Pilih paketnya lagi untuk membuat tagihan baru.") : t("Tagihan ini sudah dibatalkan.")}</p>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={t("Bayar paket {plan}", { plan: planLabel })} description={t("Tagihan berlaku sampai {time}", { time: dateTime(order.expiresAt) })} size="lg">
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-brand-soft border border-brand/20 px-5 py-4">
          <div className="text-label font-semibold text-fg-muted">{t("Bayar tepat sebesar")}</div>
          <div className="text-heading-md font-bold text-ink tabular-nums">{rupiah(order.payAmountIdr)}</div>
          {order.discountIdr > 0 ? <div className="text-label text-fg-muted mt-1 tabular-nums">{t("Harga normal {price}, diskon pembelian pertama {discount}.", { price: rupiah(order.listPriceIdr), discount: rupiah(order.discountIdr) })}</div> : null}
        </div>

        <section aria-label={t("Metode pembayaran")} className="flex flex-col gap-3">
          <h3 className="card-title">{t("Bayar lewat")}</h3>
          <PayPanel qris={qris} amountIdr={order.payAmountIdr} uniqueCode={order.uniqueCode} />
          <p className="text-label text-fg-muted flex items-center gap-2" role="status">
            <Badge tone="brand">{t("Menunggu pembayaran")}</Badge>
            {t("Halaman ini memeriksa pembayaran Anda otomatis. Paket aktif begitu pembayaran masuk.")}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="card-title">{t("Sudah membayar tapi belum aktif?")}</h3>
          <p className="text-body-sm text-fg-muted">{t("Unggah bukti transfer supaya tim bisa mengecek pembayaran Anda.")}</p>
          <ProofUpload kind="order" id={order.id} count={uploaded ?? order.proofCount ?? 0} onUploaded={setUploaded} />
          {order.paymentClaimedAt ? (
            <div className="flex flex-wrap items-center gap-2 text-body-sm text-fg-muted">
              <Badge tone="warning">{t("Menunggu dicek tim")}</Badge>
              <span>{t("Dikonfirmasi {time}. Paket aktif setelah pembayaran dicek.", { time: dateTime(order.paymentClaimedAt) })}</span>
            </div>
          ) : (
            <form onSubmit={claim} className="flex flex-col gap-3">
              <TextAreaField label={t("Keterangan pembayaran (opsional)")} hint={t("Misalnya nama pengirim dan jam transfer, supaya mudah dicocokkan.")} rows={2} maxLength={300} value={reference} onChange={(e) => setReference(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="secondary" icon="check" loading={pending}>
                  {t("Saya sudah bayar")}
                </Button>
                <Button variant="quietDanger" onClick={cancel} disabled={pending}>
                  {t("Batalkan tagihan")}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </Modal>
  );
}
