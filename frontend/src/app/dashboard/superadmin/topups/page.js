"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, TableShell, Tabs } from "@/components/ui";
import QuoteModal from "@/components/topup/QuoteModal";
import { TOPUP_STATUS } from "@/components/topup/topupStatus";

const PAGE = 25;

/** The team's queue of token top up requests from every shop: price them, confirm payment, add the tokens. */
export default function TopupQueuePage() {
  const { t, role } = useDashboard();
  const { dateTime, number, rupiah } = useFormat();
  const { run, pending } = useAction();
  const [status, setStatus] = useState("requested");
  const [page, setPage] = useState(0);
  const [quoting, setQuoting] = useState(null);
  const [crediting, setCrediting] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const query = useApi("/ai/topups/admin", { query: { status, limit: PAGE, offset: page * PAGE }, enabled: role === "superadmin" });
  const { reload } = query;

  const tabs = [
    { id: "requested", label: t("Menunggu harga") },
    { id: "quoted", label: t("Menunggu pembayaran") },
    { id: "credited", label: t("Selesai") },
    { id: "cancelled", label: t("Dibatalkan") },
  ];

  const credit = async () => {
    const result = await run(() => api.post(`/ai/topups/${crediting.id}/credit`), { success: t("Token ditambahkan ke kuota toko.") });
    if (result.ok) {
      setCrediting(null);
      reload();
    }
  };
  const cancel = async () => {
    const result = await run(() => api.post(`/ai/topups/${cancelling.id}/cancel-by-team`), { success: t("Permintaan dibatalkan.") });
    if (result.ok) {
      setCancelling(null);
      reload();
    }
  };

  if (role !== "superadmin") {
    return <EmptyState icon="lock" title={t("Hanya untuk tim Klozer")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Antrean Top Up Token")} description={t("Beri harga permintaan toko, konfirmasi pembayarannya, lalu tambahkan tokennya ke kuota.")} />
      <Tabs
        label={t("Status permintaan")}
        tabs={tabs}
        value={status}
        onChange={(id) => {
          setStatus(id);
          setPage(0);
        }}
      />
      <Async query={query} loadingLabel={t("Memuat antrean...")}>
        {(data) =>
          data.topups.length === 0 ? (
            <Card>
              <EmptyState icon="coins" title={t("Tidak ada permintaan di status ini")} body={status === "requested" ? t("Permintaan baru dari toko muncul di sini.") : undefined} />
            </Card>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Toko")}</th>
                    <th className="text-right">{t("Token")}</th>
                    <th>{t("Diajukan")}</th>
                    <th>{t("Status")}</th>
                    <th className="text-right">{t("Harga")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.topups.map((topup) => {
                    const state = TOPUP_STATUS[topup.status];
                    return (
                      <tr key={topup.id}>
                        <td>
                          <div className="font-semibold text-fg">{topup.institutionName}</div>
                          {topup.note ? <div className="text-caption text-fg-subtle max-w-[260px]">{topup.note}</div> : null}
                        </td>
                        <td className="text-right tabular-nums font-semibold">{number(topup.tokens)}</td>
                        <td className="whitespace-nowrap text-fg-muted">
                          {dateTime(topup.createdAt)}
                          {topup.requestedByName ? <div className="text-caption">{topup.requestedByName}</div> : null}
                        </td>
                        <td>
                          <Badge tone={state.tone}>{t(state.label)}</Badge>
                        </td>
                        <td className="text-right tabular-nums">{topup.quotedAmountIdr === null ? "-" : rupiah(topup.quotedAmountIdr)}</td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-2">
                            {topup.status === "requested" || topup.status === "quoted" ? (
                              <Button size="sm" variant="secondary" onClick={() => setQuoting(topup)}>
                                {topup.status === "quoted" ? t("Ubah harga") : t("Beri harga")}
                              </Button>
                            ) : null}
                            {topup.status === "quoted" ? (
                              <Button size="sm" icon="check" onClick={() => setCrediting(topup)}>
                                {t("Tambahkan token")}
                              </Button>
                            ) : null}
                            {topup.status === "requested" || topup.status === "quoted" ? (
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

      {quoting ? (
        <QuoteModal
          topup={quoting}
          onClose={() => setQuoting(null)}
          onDone={() => {
            setQuoting(null);
            reload();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(crediting)}
        onClose={() => setCrediting(null)}
        onConfirm={credit}
        pending={pending}
        tone="primary"
        title={t("Tambahkan token ke kuota?")}
        body={crediting ? t("{tokens} token ditambahkan ke {shop}. Lakukan ini hanya setelah pembayaran {amount} dikonfirmasi. Tindakan ini tidak bisa diulang untuk permintaan yang sama.", { tokens: number(crediting.tokens), shop: crediting.institutionName, amount: rupiah(crediting.quotedAmountIdr) }) : ""}
        confirmLabel={t("Tambahkan token")}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={cancel}
        pending={pending}
        title={t("Batalkan permintaan top up?")}
        body={cancelling ? t("Permintaan {tokens} token dari {shop} dibatalkan.", { tokens: number(cancelling.tokens), shop: cancelling.institutionName }) : ""}
        confirmLabel={t("Batalkan permintaan")}
      />
    </div>
  );
}
