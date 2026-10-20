"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Async, Badge, Button, EmptyState, Modal, SelectField } from "@/components/ui";
import Icon from "@/components/icons/Icon";

const PAGE = 20;

export function useDeliveryStatus() {
  const { t } = useDashboard();
  return (status) => {
    switch (status) {
      case "pending":
        return { tone: "neutral", label: t("Menunggu dikirim") };
      case "sending":
        return { tone: "brand", label: t("Sedang dikirim") };
      case "delivered":
        return { tone: "success", label: t("Berhasil terkirim") };
      case "failed":
        return { tone: "warning", label: t("Gagal, akan dicoba lagi") };
      case "dead":
        return { tone: "danger", label: t("Gagal permanen") };
      default:
        return { tone: "neutral", label: status };
    }
  };
}

function Fact({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-caption font-semibold text-fg-muted">{label}</dt>
      <dd className="m-0 text-body-sm text-fg break-words min-w-0">{children}</dd>
    </div>
  );
}

function DeliveryDetail({ id, onChanged }) {
  const { t } = useDashboard();
  const format = useFormat();
  const statusOf = useDeliveryStatus();
  const query = useApi(`/integrations/deliveries/${id}`);
  const { run, pending } = useAction();

  const retry = async () => {
    const { ok } = await run(() => api.post(`/integrations/deliveries/${id}/retry`), { success: t("Pengiriman dijadwalkan ulang.") });
    if (ok) {
      query.reload();
      onChanged();
    }
  };

  return (
    <Async query={query} loadingLabel={t("Memuat pengiriman...")}>
      {(body) => {
        const d = body.data;
        const st = statusOf(d.status);
        return (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={st.tone}>{st.label}</Badge>
              {d.status === "dead" || d.status === "failed" ? (
                <Button size="sm" icon="refresh" loading={pending} onClick={retry}>
                  {t("Kirim ulang")}
                </Button>
              ) : null}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 m-0">
              <Fact label={t("Event")}>
                <span className="font-mono">{d.eventType}</span>
              </Fact>
              <Fact label={t("ID event")}>
                <span className="font-mono break-all">{d.eventId}</span>
              </Fact>
              <Fact label={t("Percobaan")}>
                <span className="tabular-nums">{d.attempts}</span>
              </Fact>
              <Fact label={t("Kode jawaban")}>{d.statusCode ? <span className="font-mono tabular-nums">{d.statusCode}</span> : "-"}</Fact>
              <Fact label={t("Lama jawaban")}>{d.durationMs !== null && d.durationMs !== undefined ? <span className="tabular-nums">{t("{ms} ms", { ms: format.number(d.durationMs) })}</span> : "-"}</Fact>
              <Fact label={t("Dibuat")}>{format.dateTime(d.createdAt)}</Fact>
              <Fact label={t("Terkirim pada")}>{format.dateTime(d.deliveredAt)}</Fact>
              <Fact label={t("Percobaan berikutnya")}>{format.dateTime(d.nextAttemptAt)}</Fact>
            </dl>
            {d.error ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-label font-semibold text-fg">{t("Pesan kesalahan")}</span>
                <p className="m-0 text-body-sm text-danger-700 break-words">{d.error}</p>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="text-label font-semibold text-fg">{t("Jawaban penerima")}</span>
              {d.responseExcerpt ? (
                <pre tabIndex={0} className="m-0 p-3 bg-sunken border border-line rounded-xl overflow-x-auto font-mono text-caption text-fg whitespace-pre-wrap break-all">
                  {d.responseExcerpt}
                </pre>
              ) : (
                <p className="m-0 text-label text-fg-muted">{t("Penerima tidak mengirim isi jawaban.")}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-label font-semibold text-fg">{t("Isi yang dikirim")}</span>
              <pre tabIndex={0} className="m-0 p-3 bg-sunken border border-line rounded-xl overflow-x-auto font-mono text-caption text-fg whitespace-pre">
                {JSON.stringify(d.payload, null, 2)}
              </pre>
            </div>
          </div>
        );
      }}
    </Async>
  );
}

/** Delivery history of one webhook, newest first; opening a row shows exactly what was sent and what came back. */
export default function DeliveriesDrawer({ webhook, onClose, onChanged }) {
  const { t } = useDashboard();
  const format = useFormat();
  const statusOf = useDeliveryStatus();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const query = useApi(`/integrations/webhooks/${webhook.id}/deliveries`, { query: { limit: PAGE, offset, status } });

  const changeStatus = (value) => {
    setStatus(value);
    setOffset(0);
  };

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      title={selected ? t("Detail pengiriman") : t("Riwayat pengiriman")}
      description={webhook.name}
      footer={
        selected ? (
          <Button variant="secondary" icon="arrowLeft" onClick={() => setSelected(null)}>
            {t("Kembali ke daftar")}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t("Tutup")}
          </Button>
        )
      }
    >
      {selected ? (
        <DeliveryDetail
          id={selected}
          onChanged={() => {
            query.reload();
            onChanged();
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <SelectField
            label={t("Status")}
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            options={[
              { value: "", label: t("Semua status") },
              { value: "pending", label: t("Menunggu dikirim") },
              { value: "sending", label: t("Sedang dikirim") },
              { value: "delivered", label: t("Berhasil terkirim") },
              { value: "failed", label: t("Gagal, akan dicoba lagi") },
              { value: "dead", label: t("Gagal permanen") },
            ]}
          />
          <Async query={query} loadingLabel={t("Memuat riwayat...")}>
            {(body) =>
              body.data.length === 0 && offset === 0 ? (
                <EmptyState
                  icon="history"
                  title={status ? t("Tidak ada pengiriman dengan status ini") : t("Belum ada pengiriman")}
                  body={status ? t("Pilih status lain untuk melihat pengiriman yang lain.") : t("Pengiriman muncul di sini setelah ada event yang dikirim. Tombol Kirim uji membuat satu pengiriman sekarang.")}
                />
              ) : (
                <>
                  <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                    {body.data.map((d) => {
                      const st = statusOf(d.status);
                      return (
                        <li key={d.id}>
                          <button type="button" onClick={() => setSelected(d.id)} className="w-full flex flex-col gap-1.5 p-3 text-left bg-white border border-line rounded-xl cursor-pointer hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono text-label font-semibold text-fg break-all">{d.eventType}</span>
                              <Badge tone={st.tone}>{st.label}</Badge>
                            </span>
                            <span className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-caption text-fg-muted">
                              <span className="tabular-nums">{t("{count} percobaan", { count: d.attempts })}</span>
                              <span>{d.statusCode ? t("Kode {code}", { code: d.statusCode }) : t("Tanpa kode jawaban")}</span>
                              <span>{format.dateTime(d.createdAt)}</span>
                            </span>
                            {d.nextAttemptAt && (d.status === "pending" || d.status === "failed") ? (
                              <span className="text-caption text-fg-muted">{t("Percobaan berikutnya: {time}", { time: format.dateTime(d.nextAttemptAt) })}</span>
                            ) : null}
                            {d.error ? <span className="text-caption text-danger-700 break-words">{d.error}</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {body.data.length === 0 ? <p className="m-0 text-label text-fg-muted">{t("Tidak ada pengiriman lagi.")}</p> : null}
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="secondary" size="sm" icon="arrowLeft" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                      {t("Sebelumnya")}
                    </Button>
                    <span className="text-caption text-fg-muted tabular-nums">{t("Halaman {page}", { page: offset / PAGE + 1 })}</span>
                    <Button variant="secondary" size="sm" disabled={body.data.length < PAGE} onClick={() => setOffset(offset + PAGE)}>
                      {t("Berikutnya")}
                      <Icon name="chevronRight" className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="m-0 text-caption text-fg-subtle">{t("Pengiriman yang gagal dicoba lagi setelah 1 menit, 5 menit, 30 menit, 2 jam, 6 jam, dan 24 jam. Riwayat disimpan 30 hari.")}</p>
                </>
              )
            }
          </Async>
        </div>
      )}
    </Modal>
  );
}
