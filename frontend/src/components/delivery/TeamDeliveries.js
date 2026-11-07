"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, TableShell, Tabs } from "@/components/ui";
import { DELIVERY_STATUS, NOTICE_STATUS, isOpen } from "./deliveryModel";

const POLL_MS = 30000;

/** Every delivery of the shop: who has what, where it stands, and whether the PIC was told. For owners, supervisors and CS. */
export default function TeamDeliveries() {
  const { t, deliveryEvent } = useDashboard();
  const { relative } = useFormat();
  const { run, pending } = useAction();
  const [tab, setTab] = useState("active");
  const query = useApi("/deliveries", { query: tab === "active" ? { active: "1" } : { status: tab } });
  const { reload } = query;
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!deliveryEvent) return undefined;
    const timer = setTimeout(reload, 0);
    return () => clearTimeout(timer);
  }, [deliveryEvent, reload]);
  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const resend = async (delivery) => {
    const result = await run(() => api.post(`/deliveries/${delivery.id}/notice`), {});
    if (result.ok) {
      // the endpoint answers success:false when the message did not go; the new reason shows in the row
      reload();
    }
  };
  const cancel = async () => {
    const result = await run(() => api.post(`/deliveries/${cancelling.id}/cancel`), { success: t("Pengantaran dibatalkan.") });
    if (result.ok) {
      setCancelling(null);
      reload();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("Pengantaran")}
        description={t("Pesanan yang sedang diantar oleh PIC pengantaran. Untuk memberi pesanan ke PIC, buka Pesanan lalu tekan Antar.")}
        actions={
          <Button variant="secondary" href="/dashboard/orders" icon="route">
            {t("Buka Pesanan")}
          </Button>
        }
      />
      <Tabs
        label={t("Status pengantaran")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "active", label: t("Sedang berjalan") },
          { id: "delivered", label: t("Sudah diterima") },
          { id: "failed", label: t("Gagal") },
          { id: "cancelled", label: t("Dibatalkan") },
        ]}
      />
      <Async query={query} loadingLabel={t("Memuat pengantaran...")}>
        {(data) =>
          data.items.length === 0 ? (
            <Card>
              <EmptyState icon="route" title={t("Belum ada pengantaran di sini")} body={t("Tambahkan akun PIC Pengantaran di Pengaturan, lalu berikan pesanan lewat halaman Pesanan.")} />
            </Card>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <th>{t("Pesanan")}</th>
                  <th>{t("Penerima")}</th>
                  <th>PIC</th>
                  <th>{t("Status")}</th>
                  <th>{t("Pemberitahuan")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => {
                  const state = DELIVERY_STATUS[d.status];
                  const notice = NOTICE_STATUS[d.notify_status] ?? NOTICE_STATUS.pending;
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="font-bold text-fg">{d.order_number}</div>
                        <div className="text-caption text-fg-subtle">{relative(d.assigned_at)}</div>
                      </td>
                      <td>
                        <div className="text-fg">{d.recipient_name || "-"}</div>
                        <div className="text-caption text-fg-subtle max-w-[220px] truncate" title={d.address_text || ""}>{d.address_text || "-"}</div>
                      </td>
                      <td>{d.pic_name}</td>
                      <td>
                        <Badge tone={state.tone}>{t(state.label)}</Badge>
                        {d.result_note ? <div className="text-caption text-fg-subtle mt-1 max-w-[200px]">{d.result_note}</div> : null}
                      </td>
                      <td>
                        <Badge tone={notice.tone}>{t(notice.label)}</Badge>
                        {d.notify_detail && d.notify_status !== "sent" ? <div className="text-caption text-fg-subtle mt-1 max-w-[200px]">{d.notify_detail}</div> : null}
                      </td>
                      <td className="text-right">
                        {isOpen(d) ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {d.notify_status !== "sent" ? (
                              <Button size="sm" variant="secondary" icon="send" disabled={pending} onClick={() => resend(d)}>
                                {t("Kirim ulang")}
                              </Button>
                            ) : null}
                            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setCancelling(d)}>
                              {t("Batalkan")}
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          )
        }
      </Async>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={cancel}
        pending={pending}
        title={t("Batalkan pengantaran?")}
        body={cancelling ? t("Pesanan {order} tidak lagi menjadi tugas {pic}. Pesanannya sendiri tidak dibatalkan.", { order: cancelling.order_number, pic: cancelling.pic_name }) : ""}
        confirmLabel={t("Batalkan pengantaran")}
      />
    </div>
  );
}
