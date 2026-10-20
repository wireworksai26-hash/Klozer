"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { useDashboard } from "@/context/DashboardContext";
import { Async, Badge, Button, Card, ConfirmDialog, EmptyState, TableShell } from "@/components/ui";

export default function DraftsTab({ onOpenSettings }) {
  const { t, chatEvent } = useDashboard();
  const { rupiah, relative } = useFormat();
  const query = useApi("/commerce/drafts");
  const { run } = useAction();
  const [target, setTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // A customer's message can change a draft, so refresh when the chat moves.
  const first = useRef(true);
  const { reload } = query;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    reload();
  }, [chatEvent, reload]);

  const stages = {
    collecting: { label: t("Mengumpulkan data"), tone: "neutral" },
    awaiting_confirmation: { label: t("Menunggu konfirmasi pelanggan"), tone: "warning" },
  };

  const cancel = async () => {
    setCancelling(true);
    const res = await run(() => api.post(`/commerce/drafts/${target.id}/cancel`), { success: t("Draf pesanan dibatalkan.") });
    setCancelling(false);
    if (res.ok) {
      setTarget(null);
      query.reload();
    }
  };

  return (
    <Async query={query} loadingLabel={t("Memuat pesanan...")}>
      {(body) => {
        const drafts = body.data || [];
        if (!drafts.length) {
          return (
            <Card>
              <EmptyState
                icon="basket"
                title={t("Belum ada pesanan yang sedang disusun")}
                body={t("Pesanan muncul di sini saat pelanggan memesan lewat chat dan AI mulai mengumpulkan data. Pastikan pesanan di chat sudah dinyalakan di tab Pengaturan.")}
                action={
                  <Button variant="secondary" onClick={onOpenSettings}>
                    {t("Buka pengaturan")}
                  </Button>
                }
              />
            </Card>
          );
        }
        return (
          <>
            <TableShell>
              <thead>
                <tr className="bg-canvas border-b border-line text-label font-bold text-fg-muted">
                  <th scope="col" className="py-3 px-4">{t("Kontak")}</th>
                  <th scope="col" className="py-3 px-4">{t("Barang")}</th>
                  <th scope="col" className="py-3 px-4 text-right">{t("Total sementara")}</th>
                  <th scope="col" className="py-3 px-4">{t("Tahap")}</th>
                  <th scope="col" className="py-3 px-4">{t("Terakhir diubah")}</th>
                  <th scope="col" className="py-3 px-4"><span className="sr-only">{t("Aksi")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {drafts.map((d) => {
                  const stage = stages[d.status] || { label: d.status, tone: "neutral" };
                  return (
                    <tr key={d.id} className="align-top hover:bg-soft">
                      <th scope="row" className="py-3.5 px-4 text-left font-bold text-fg">
                        {d.leadName}
                        {d.recipient?.phone ? <div className="text-caption text-fg-subtle font-normal tabular-nums">{d.recipient.phone}</div> : null}
                      </th>
                      <td className="py-3.5 px-4 min-w-48">
                        {d.items.length ? (
                          <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
                            {d.items.map((item) => (
                              <li key={item.productId} className="text-fg">
                                <span className="tabular-nums">{item.quantity}</span> x {item.name}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-fg-muted">{t("Belum ada barang")}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-bold text-fg whitespace-nowrap">{rupiah(d.subtotal)}</td>
                      <td className="py-3.5 px-4">
                        <Badge tone={stage.tone}>{stage.label}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-fg-muted whitespace-nowrap">{relative(d.lastActivityAt)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="secondary" size="sm" icon="message" href={`/dashboard/chat?lead=${d.leadId}`} aria-label={t("Buka chat {name}", { name: d.leadName })}>
                            {t("Buka chat")}
                          </Button>
                          <Button variant="quietDanger" size="sm" onClick={() => setTarget(d)} aria-label={t("Batalkan draf {name}", { name: d.leadName })}>
                            {t("Batalkan")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            <ConfirmDialog
              open={Boolean(target)}
              onClose={() => setTarget(null)}
              onConfirm={cancel}
              pending={cancelling}
              title={t("Batalkan draf pesanan?")}
              body={target ? t("Draf pesanan {name} ditutup dan pengingatnya dihentikan. Pelanggan bisa memesan lagi dari awal.", { name: target.leadName }) : ""}
              confirmLabel={t("Batalkan draf")}
            />
          </>
        );
      }}
    </Async>
  );
}
