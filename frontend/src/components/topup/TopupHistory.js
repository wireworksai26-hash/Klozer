"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { whatsappUrl } from "@/utils/legal/config";
import { Badge, Button, Card, ConfirmDialog, EmptyState, TableShell } from "@/components/ui";
import { TOPUP_STATUS, isOpenTopup } from "./topupStatus";

/** The shop's own requests, what the team quoted, and what it can still do about each. */
export default function TopupHistory({ topups, onChanged }) {
  const { t, currentUser } = useDashboard();
  const { dateTime, number, rupiah } = useFormat();
  const { run, pending } = useAction();
  const [cancelling, setCancelling] = useState(null);
  const wa = whatsappUrl();

  const cancel = async () => {
    const result = await run(() => api.post(`/ai/topups/${cancelling.id}/cancel`), { success: t("Permintaan dibatalkan.") });
    if (result.ok) {
      setCancelling(null);
      onChanged();
    }
  };

  const confirmLink = (topup) =>
    `${wa}?text=${encodeURIComponent(t("Halo tim Klozer, saya {name} ingin konfirmasi pembayaran top up #{id}: {tokens} token, {amount}.", { name: currentUser?.institutionName || currentUser?.name || "", id: topup.id, tokens: number(topup.tokens), amount: rupiah(topup.quotedAmountIdr) }))}`;

  return (
    <Card title={t("Permintaan Anda")} padded={false}>
      {topups.length === 0 ? (
        <EmptyState icon="coins" title={t("Belum ada permintaan top up")} body={t("Ajukan di atas. Token ditambahkan ke kuota setelah pembayaran dikonfirmasi tim.")} />
      ) : (
        <div className="p-5 pt-4">
          <TableShell>
            <thead>
              <tr>
                <th>{t("Diajukan")}</th>
                <th className="text-right">{t("Token")}</th>
                <th>{t("Status")}</th>
                <th className="text-right">{t("Harga")}</th>
                <th>{t("Pesan dari tim")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {topups.map((topup) => {
                const status = TOPUP_STATUS[topup.status];
                return (
                  <tr key={topup.id}>
                    <td className="whitespace-nowrap text-fg-muted">{dateTime(topup.createdAt)}</td>
                    <td className="text-right tabular-nums font-semibold">{number(topup.tokens)}</td>
                    <td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </td>
                    <td className="text-right tabular-nums">{topup.quotedAmountIdr === null ? "-" : rupiah(topup.quotedAmountIdr)}</td>
                    <td className="text-fg-muted max-w-[260px]">{topup.quoteNote || "-"}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        {topup.status === "quoted" && wa ? (
                          <Button size="sm" variant="secondary" href={confirmLink(topup)} target="_blank" rel="noopener noreferrer" icon="whatsapp">
                            {t("Konfirmasi pembayaran")}
                          </Button>
                        ) : null}
                        {isOpenTopup(topup.status) ? (
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
        title={t("Batalkan permintaan top up?")}
        body={cancelling ? t("Permintaan {tokens} token akan dibatalkan. Anda bisa mengajukan lagi kapan saja.", { tokens: number(cancelling.tokens) }) : ""}
        confirmLabel={t("Batalkan permintaan")}
      />
    </Card>
  );
}
