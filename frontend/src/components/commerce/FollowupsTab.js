"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { useDashboard } from "@/context/DashboardContext";
import { Async, Button, Card, ConfirmDialog, EmptyState, Stat, TableShell } from "@/components/ui";

export default function FollowupsTab({ onOpenSettings }) {
  const { t } = useDashboard();
  const { dateTime, number } = useFormat();
  const query = useApi("/commerce/followups");
  const { run } = useAction();
  const [target, setTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const statuses = [
    ["pending", t("Menunggu giliran")],
    ["sent", t("Terkirim")],
    ["cancelled_by_payment", t("Berhenti karena sudah dibayar")],
    ["cancelled_by_reply", t("Berhenti karena pelanggan membalas")],
    ["cancelled", t("Dibatalkan")],
    ["failed", t("Gagal")],
  ];
  const reasons = {
    abandoned_qris: t("Pembayaran belum selesai"),
    abandoned_cart: t("Keranjang belum selesai"),
  };

  const cancel = async () => {
    setCancelling(true);
    const res = await run(() => api.post(`/commerce/followups/${target.id}/cancel`), { success: t("Pengingat dibatalkan.") });
    setCancelling(false);
    if (res.ok) {
      setTarget(null);
      query.reload();
    }
  };

  return (
    <Async query={query} loadingLabel={t("Memuat pengingat...")}>
      {(body) => {
        const { counts = {}, upcoming = [] } = body.data;
        const shown = statuses.filter(([key]) => counts[key]);
        return (
          <div className="flex flex-col gap-5">
            <p className="text-body-sm text-fg-muted">{t("Pesan susulan otomatis untuk pesanan yang belum dibayar dan keranjang yang tidak diselesaikan.")}</p>

            {shown.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {shown.map(([key, label]) => (
                  <Stat key={key} label={label} value={number(counts[key])} />
                ))}
              </div>
            ) : null}

            {upcoming.length === 0 ? (
              <Card>
                <EmptyState
                  icon="clock"
                  title={t("Tidak ada pengingat yang dijadwalkan")}
                  body={t("Pengingat dijadwalkan otomatis saat pelanggan berhenti di tengah pesanan. Pastikan pengingat menyala di tab Pengaturan.")}
                  action={
                    <Button variant="secondary" onClick={onOpenSettings}>
                      {t("Buka pengaturan")}
                    </Button>
                  }
                />
              </Card>
            ) : (
              <TableShell>
                <thead>
                  <tr className="bg-canvas border-b border-line text-label font-bold text-fg-muted">
                    <th scope="col" className="py-3 px-4">{t("Kontak")}</th>
                    <th scope="col" className="py-3 px-4">{t("Alasan")}</th>
                    <th scope="col" className="py-3 px-4 text-right">{t("Urutan")}</th>
                    <th scope="col" className="py-3 px-4">{t("Dijadwalkan")}</th>
                    <th scope="col" className="py-3 px-4">{t("Status")}</th>
                    <th scope="col" className="py-3 px-4"><span className="sr-only">{t("Aksi")}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {upcoming.map((job) => (
                    <tr key={job.id} className="hover:bg-soft">
                      <th scope="row" className="py-3.5 px-4 text-left font-bold text-fg">{job.leadName}</th>
                      <td className="py-3.5 px-4 text-fg">{reasons[job.reason] || job.reason}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums">{job.step}</td>
                      <td className="py-3.5 px-4 text-fg-muted whitespace-nowrap">{dateTime(job.scheduledAt)}</td>
                      <td className="py-3.5 px-4 text-fg">{t("Menunggu giliran")}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-end">
                          <Button variant="quietDanger" size="sm" onClick={() => setTarget(job)} aria-label={t("Batalkan pengingat untuk {name}", { name: job.leadName })}>
                            {t("Batalkan")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}

            <ConfirmDialog
              open={Boolean(target)}
              onClose={() => setTarget(null)}
              onConfirm={cancel}
              pending={cancelling}
              title={t("Batalkan pengingat?")}
              body={target ? t("Pengingat untuk {name} tidak akan dikirim.", { name: target.leadName }) : ""}
              confirmLabel={t("Batalkan pengingat")}
            />
          </div>
        );
      }}
    </Async>
  );
}
