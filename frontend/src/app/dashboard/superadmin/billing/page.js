"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, TableShell, Tabs } from "@/components/ui";
import { ORDER_STATUS } from "@/components/billing/OrderHistory";
import PaymentNotices from "@/components/billing/PaymentNotices";
import PaymentSummary from "@/components/billing/PaymentSummary";
import BillDetailModal from "@/components/billing/BillDetailModal";

const PAGE = 25;

/** Package bills from every shop: payments that match arrive here already settled; the rest can be confirmed by hand. */
export default function BillingQueuePage() {
  const { t, role } = useDashboard();
  const { dateTime, rupiah } = useFormat();
  const { run, pending } = useAction();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [noticeKey, setNoticeKey] = useState(0);
  const [detail, setDetail] = useState(null);
  const query = useApi("/billing/orders/admin", { query: { status, limit: PAGE, offset: page * PAGE }, enabled: role === "superadmin" });
  const { reload } = query;

  // payments that match by themselves arrive while this is open: look again now and then
  useEffect(() => {
    if (role !== "superadmin") return undefined;
    const timer = setInterval(() => {
      reload();
      setNoticeKey((n) => n + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, [role, reload]);

  const tabs = [
    { id: "pending", label: t("Menunggu pembayaran") },
    { id: "paid", label: t("Lunas") },
    { id: "cancelled", label: t("Dibatalkan") },
    { id: "expired", label: t("Sudah kedaluwarsa") },
  ];

  const confirm = async () => {
    const result = await run(() => api.post(`/billing/orders/${confirming.id}/confirm`), { success: t("Paket diaktifkan.") });
    if (result.ok) {
      setConfirming(null);
      setNoticeKey((n) => n + 1);
      reload();
    }
  };
  const cancel = async () => {
    const result = await run(() => api.post(`/billing/orders/${cancelling.id}/cancel-by-team`), { success: t("Tagihan dibatalkan.") });
    if (result.ok) {
      setCancelling(null);
      reload();
    }
  };

  if (role !== "superadmin") return <EmptyState icon="lock" title={t("Hanya untuk tim Klozer")} />;
  const planOf = (o) => `${o.planName} ${o.period === "annual" ? t("tahunan") : t("bulanan")}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Pembayaran Langganan")} description={t("Toko yang memilih paket mendapat tagihan dengan nominal unik. Pembayaran yang cocok mengaktifkan paket, fitur, dan token otomatis. Yang tidak cocok bisa Anda konfirmasi manual.")} />
      <PaymentSummary refreshKey={noticeKey} />
      <Tabs
        label={t("Status tagihan")}
        tabs={tabs}
        value={status}
        onChange={(id) => {
          setStatus(id);
          setPage(0);
        }}
      />
      <Async query={query} loadingLabel={t("Memuat tagihan...")}>
        {(data) =>
          data.orders.length === 0 ? (
            <Card>
              <EmptyState icon="coins" title={t("Tidak ada tagihan di status ini")} body={status === "pending" ? t("Tagihan baru dari toko muncul di sini.") : undefined} />
            </Card>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Toko")}</th>
                    <th>{t("Paket")}</th>
                    <th className="text-right">{t("Nominal")}</th>
                    <th>{t("Dibuat")}</th>
                    <th>{t("Status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => {
                    const state = ORDER_STATUS[o.status];
                    const open = o.status === "pending" || o.status === "expired";
                    return (
                      <tr key={o.id}>
                        <td>
                          <div className="font-semibold text-fg">{o.institutionName}</div>
                          {o.requestedByName ? <div className="text-caption text-fg-muted">{o.requestedByName}</div> : null}
                        </td>
                        <td className="font-semibold">{planOf(o)}</td>
                        <td className="text-right tabular-nums">
                          {rupiah(o.payAmountIdr ?? o.baseAmountIdr)}
                          {o.discountIdr > 0 ? <div className="text-caption text-success-700">{t("Diskon pembelian pertama")}</div> : null}
                        </td>
                        <td className="whitespace-nowrap text-fg-muted">{dateTime(o.createdAt)}</td>
                        <td>
                          <Badge tone={state.tone}>{t(state.label)}</Badge>
                          {o.status === "paid" ? <div className="text-caption text-fg-muted mt-0.5">{o.paidVia === "auto" ? t("Otomatis dari notifikasi") : t("Dikonfirmasi manual")}</div> : null}
                          <div className="mt-1 text-caption text-fg-muted">{o.proofCount > 0 ? t("{n} bukti transfer", { n: o.proofCount }) : t("Belum ada bukti transfer")}</div>
                          {o.paymentClaimedAt ? (
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge tone="warning">{t("Sudah bayar")}</Badge>
                              {o.paymentReference ? <span className="text-caption text-fg-muted max-w-[200px]">{o.paymentReference}</span> : null}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setDetail({ type: "order", id: o.id })}>
                              {t("Detail")}
                            </Button>
                            {open ? (
                              <Button size="sm" icon="check" onClick={() => setConfirming(o)}>
                                {t("Aktifkan paket")}
                              </Button>
                            ) : null}
                            {o.status === "pending" ? (
                              <Button size="sm" variant="quietDanger" onClick={() => setCancelling(o)}>
                                {t("Batalkan")}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
              {data.total > PAGE ? (
                <div className="flex items-center justify-between text-label text-fg-muted">
                  <span>{t("{from} sampai {to} dari {total}", { from: page * PAGE + 1, to: Math.min(data.total, (page + 1) * PAGE), total: data.total })}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      {t("Sebelumnya")}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage((p) => p + 1)}>
                      {t("Berikutnya")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )
        }
      </Async>

      <PaymentNotices refreshKey={noticeKey} />
      {detail ? <BillDetailModal type={detail.type} id={detail.id} onClose={() => setDetail(null)} /> : null}

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={confirm}
        pending={pending}
        tone="primary"
        title={t("Aktifkan paket sekarang?")}
        body={confirming ? t("{shop} mendapat paket {plan}, fiturnya, dan token bawaan paket. Lakukan ini hanya setelah pembayaran {amount} dicek. Tidak bisa diulang untuk tagihan yang sama.", { shop: confirming.institutionName, plan: planOf(confirming), amount: rupiah(confirming.payAmountIdr ?? confirming.baseAmountIdr) }) : ""}
        confirmLabel={t("Aktifkan paket")}
      />
      <ConfirmDialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} onConfirm={cancel} pending={pending} title={t("Batalkan tagihan?")} body={cancelling ? t("Tagihan {plan} dari {shop} dibatalkan.", { plan: planOf(cancelling), shop: cancelling.institutionName }) : ""} confirmLabel={t("Batalkan tagihan")} />
    </div>
  );
}
