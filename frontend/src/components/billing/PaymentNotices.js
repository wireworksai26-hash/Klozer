"use client";
import { useEffect } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Card, CopyButton, EmptyState, TableShell } from "@/components/ui";

const STATUS = {
  matched: { label: "Cocok", tone: "success" },
  unmatched: { label: "Tidak cocok", tone: "warning" },
  failed: { label: "Gagal", tone: "danger" },
};

/** Payment notices received from outside, and what each was matched to. Also where the team finds the address to send them to. */
export default function PaymentNotices({ refreshKey }) {
  const { t } = useDashboard();
  const { dateTime, rupiah } = useFormat();
  const query = useApi("/platform/payment-notifications", { query: { limit: 15 } });
  const { reload } = query;
  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey, reload]);

  const endpoint = typeof window === "undefined" ? "/api/v1/payments/platform-notify" : `${window.location.origin}/api/v1/payments/platform-notify`;

  return (
    <Card title={t("Notifikasi pembayaran")} description={t("Pembayaran yang masuk dicocokkan ke tagihan lewat nominalnya, lalu paket atau token langsung diberikan.")}>
      <Async query={query} loadingLabel={t("Memuat notifikasi...")}>
        {(data) => (
          <div className="flex flex-col gap-4">
            <div className={`rounded-xl border px-4 py-3 text-body-sm ${data.notifyEnabled ? "bg-success-50 border-success-200 text-success-700" : "bg-warning-50 border-warning-200 text-warning-800"}`}>
              {data.notifyEnabled ? t("Penerimaan notifikasi aktif.") : t("Penerimaan notifikasi belum aktif. Isi PLATFORM_PAYMENT_NOTIFY_SECRET di .env server, lalu jalankan ulang. Sebelum itu, pembayaran dikonfirmasi manual.")}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-caption font-semibold text-fg-subtle">{t("Alamat penerima (POST, header X-Notify-Secret, isi: amount, reference, source)")}</span>
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-label text-fg break-all">{endpoint}</code>
                <CopyButton value={endpoint} />
              </div>
            </div>
            {data.data.length === 0 ? (
              <EmptyState icon="coins" title={t("Belum ada notifikasi masuk")} body={t("Setelah penerima notifikasi tersambung, setiap pembayaran yang masuk tercatat di sini.")} />
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Masuk")}</th>
                    <th className="text-right">{t("Nominal")}</th>
                    <th>{t("Sumber")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("Catatan")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((n) => {
                    const state = STATUS[n.status];
                    return (
                      <tr key={n.id}>
                        <td className="whitespace-nowrap text-fg-muted">{dateTime(n.createdAt)}</td>
                        <td className="text-right tabular-nums font-semibold">{rupiah(n.amountIdr)}</td>
                        <td>
                          {n.source || "-"}
                          {n.payer ? <div className="text-caption text-fg-muted">{n.payer}</div> : null}
                        </td>
                        <td>
                          <Badge tone={state.tone}>{t(state.label)}</Badge>
                          {n.institutionName ? <div className="text-caption text-fg-muted mt-0.5">{n.institutionName}</div> : null}
                        </td>
                        <td className="text-fg-muted max-w-[280px]">{n.note || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
            )}
          </div>
        )}
      </Async>
    </Card>
  );
}
