"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { Badge, Button, Card, EmptyState, TableShell } from "@/components/ui";

export const ORDER_STATUS = {
  pending: { label: "Menunggu pembayaran", tone: "brand" },
  paid: { label: "Lunas", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
  expired: { label: "Sudah kedaluwarsa", tone: "neutral" },
};

/** The shop's package bills: what was bought, what it cost, whether it is paid, and the way to pay an open one. */
export default function OrderHistory({ orders, onPay }) {
  const { t } = useDashboard();
  const { dateTime, rupiah } = useFormat();

  return (
    <Card title={t("Tagihan paket")} padded={false}>
      {orders.length === 0 ? (
        <EmptyState icon="coins" title={t("Belum ada tagihan paket")} body={t("Pilih paket di atas. Tagihannya muncul di sini.")} />
      ) : (
        <div className="p-5 pt-4">
          <TableShell>
            <thead>
              <tr>
                <th>{t("Dibuat")}</th>
                <th>{t("Paket")}</th>
                <th className="text-right">{t("Nominal")}</th>
                <th>{t("Status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const status = ORDER_STATUS[order.status];
                return (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap text-fg-muted">{dateTime(order.createdAt)}</td>
                    <td className="font-semibold">
                      {order.planName} <span className="font-normal text-fg-muted">{order.period === "annual" ? t("tahunan") : t("bulanan")}</span>
                    </td>
                    <td className="text-right tabular-nums">{rupiah(order.payAmountIdr ?? order.baseAmountIdr)}</td>
                    <td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                      {order.status === "pending" && order.paymentClaimedAt ? <Badge tone="warning" className="ml-2">{t("Menunggu dicek tim")}</Badge> : null}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        {order.status === "pending" ? (
                          <Button size="sm" onClick={() => onPay(order)}>
                            {t("Bayar")}
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
    </Card>
  );
}
