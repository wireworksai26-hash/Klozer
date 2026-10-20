"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Badge, Button, Card, ConfirmDialog, EmptyState, TableShell } from "@/components/ui";
import { TOPUP_STATUS, displayStatus, isOpenTopup } from "./topupStatus";

/** The shop's own bills: what each costs, whether it is paid, and what it can still do about each. */
export default function TopupHistory({ topups, onPay, onChanged }) {
  const { t } = useDashboard();
  const { dateTime, number, rupiah } = useFormat();
  const { run, pending } = useAction();
  const [cancelling, setCancelling] = useState(null);

  const cancel = async () => {
    const result = await run(() => api.post(`/ai/topups/${cancelling.id}/cancel`), { success: t("Tagihan dibatalkan.") });
    if (result.ok) {
      setCancelling(null);
      onChanged();
    }
  };

  return (
    <Card title={t("Tagihan Anda")} padded={false}>
      {topups.length === 0 ? (
        <EmptyState icon="coins" title={t("Belum ada tagihan top up")} body={t("Pilih paket di atas. Token ditambahkan ke kuota setelah pembayaran dicek tim.")} />
      ) : (
        <div className="p-5 pt-4">
          <TableShell>
            <thead>
              <tr>
                <th>{t("Dibuat")}</th>
                <th className="text-right">{t("Token")}</th>
                <th>{t("Status")}</th>
                <th className="text-right">{t("Harga")}</th>
                <th>{t("Pesan dari tim")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {topups.map((topup) => {
                const status = TOPUP_STATUS[displayStatus(topup)];
                const unpaid = topup.status === "quoted" && !topup.paymentClaimedAt;
                return (
                  <tr key={topup.id}>
                    <td className="whitespace-nowrap text-fg-muted">{dateTime(topup.createdAt)}</td>
                    <td className="text-right tabular-nums font-semibold">{number(topup.tokens)}</td>
                    <td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </td>
                    <td className="text-right tabular-nums">
                      {topup.isGrant ? t("Gratis") : topup.quotedAmountIdr === null ? "-" : rupiah(topup.quotedAmountIdr)}
                      {topup.discountIdr > 0 ? <div className="text-caption text-success-700">{t("Voucher {code}", { code: topup.voucherCode })}</div> : null}
                    </td>
                    <td className="text-fg-muted max-w-[260px]">{topup.isGrant ? [t("Diberikan oleh tim Klozer."), topup.note].filter(Boolean).join(" ") : topup.quoteNote || "-"}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        {topup.status === "quoted" ? (
                          <Button size="sm" variant={unpaid ? "primary" : "secondary"} onClick={() => onPay(topup)}>
                            {unpaid ? t("Bayar") : t("Lihat cara bayar")}
                          </Button>
                        ) : null}
                        {isOpenTopup(topup.status) && !topup.paymentClaimedAt ? (
                          <Button size="sm" variant="quietDanger" onClick={() => setCancelling(topup)}>
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
        </div>
      )}
      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={cancel}
        pending={pending}
        title={t("Batalkan tagihan top up?")}
        body={cancelling ? t("Tagihan {tokens} token akan dibatalkan. Anda bisa membuat lagi kapan saja.", { tokens: number(cancelling.tokens) }) : ""}
        confirmLabel={t("Batalkan tagihan")}
      />
    </Card>
  );
}
