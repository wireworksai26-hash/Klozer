"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, EmptyState, Modal, PageHeader, TextAreaField } from "@/components/ui";
import { DELIVERY_STATUS, isOpen, mapsUrl, telUrl } from "./deliveryModel";

const POLL_MS = 30000;

/** One delivery as the PIC sees it on a phone: what to take, where to, who pays, and the next button to press. */
function DeliveryCard({ delivery, onChanged }) {
  const { t } = useDashboard();
  const { rupiah, relative } = useFormat();
  const { run, pending } = useAction();
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState("");
  const open = isOpen(delivery);
  const state = DELIVERY_STATUS[delivery.status];
  const maps = mapsUrl(delivery.address_text);
  const tel = telUrl(delivery.recipient_phone);

  const post = async (path, body, success) => {
    const result = await run(() => api.post(`/deliveries/${delivery.id}/${path}`, body), { success });
    if (result.ok) onChanged();
    return result.ok;
  };
  const fail = async () => {
    if (await post("finish", { result: "failed", note: reason.trim() }, t("Pengantaran ditandai gagal."))) {
      setFailing(false);
      setReason("");
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-fg text-body">{t("Pesanan")} {delivery.order_number}</div>
          <Badge tone={state.tone}>{t(state.label)}</Badge>
        </div>

        <div>
          <div className="text-caption font-bold uppercase text-fg-subtle">{t("Penerima")}</div>
          <div className="text-body-sm text-fg font-semibold">{delivery.recipient_name || "-"}</div>
          {tel ? (
            <a href={tel} className="text-body-sm text-brand font-semibold hover:underline">
              {delivery.recipient_phone}
            </a>
          ) : null}
        </div>

        <div>
          <div className="text-caption font-bold uppercase text-fg-subtle">{t("Alamat")}</div>
          <div className="text-body-sm text-fg whitespace-pre-line">{delivery.address_text || t("Alamat belum diisi. Hubungi tim.")}</div>
          {maps ? (
            <a href={maps} target="_blank" rel="noopener noreferrer" className="text-body-sm text-brand font-semibold hover:underline">
              {t("Buka di peta")}
            </a>
          ) : null}
        </div>

        {delivery.items.length ? (
          <div>
            <div className="text-caption font-bold uppercase text-fg-subtle">{t("Barang")}</div>
            <ul className="list-none p-0 m-0 text-body-sm text-fg">
              {delivery.items.map((item) => (
                <li key={item.name}>{item.quantity}x {item.name}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {delivery.cod_amount > 0 ? (
          <div role="status" className="rounded-xl border border-warning-200 bg-warning-50 px-3.5 py-3 text-body-sm text-warning-800 font-semibold">
            {t("Tagih tunai (COD) saat barang diterima: {amount}", { amount: rupiah(delivery.cod_amount) })}
          </div>
        ) : null}

        {delivery.manager_note ? (
          <div className="text-body-sm text-fg-muted">
            <span className="font-bold text-fg">{t("Catatan tim")}:</span> {delivery.manager_note}
          </div>
        ) : null}
        {delivery.result_note && !open ? (
          <div className="text-body-sm text-fg-muted">
            <span className="font-bold text-fg">{t("Catatan Anda")}:</span> {delivery.result_note}
          </div>
        ) : null}

        <div className="text-caption text-fg-subtle">{t("Diberikan")} {relative(delivery.assigned_at)}</div>

        {open ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {delivery.status === "assigned" ? (
              <Button icon="route" loading={pending} onClick={() => post("pickup", undefined, t("Pesanan ditandai sudah diambil."))}>
                {t("Sudah saya ambil")}
              </Button>
            ) : null}
            <Button icon="userCheck" variant={delivery.status === "assigned" ? "secondary" : "primary"} loading={pending} onClick={() => post("finish", { result: "delivered" }, t("Pesanan ditandai sudah diterima pelanggan."))}>
              {t("Sudah diterima pelanggan")}
            </Button>
            <Button icon="alert" variant="secondary" disabled={pending} onClick={() => setFailing(true)}>
              {t("Gagal diantar")}
            </Button>
          </div>
        ) : null}
      </div>

      <Modal
        open={failing}
        onClose={() => setFailing(false)}
        title={t("Kenapa gagal diantar?")}
        description={`${t("Pesanan")} ${delivery.order_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFailing(false)}>
              {t("Batal")}
            </Button>
            <Button loading={pending} disabled={!reason.trim()} onClick={fail}>
              {t("Simpan")}
            </Button>
          </>
        }
      >
        <TextAreaField label={t("Alasan")} hint={t("Contoh: rumah kosong, nomor tidak bisa dihubungi, alamat tidak ketemu.")} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} required />
      </Modal>
    </Card>
  );
}

/** The delivery PIC's only screen: their open deliveries first, then the ones they finished lately. */
export default function PicDeliveries() {
  const { t, deliveryEvent } = useDashboard();
  const query = useApi("/deliveries");
  const { reload } = query;

  // refresh when the server says something changed, and now and then in case a message was missed
  useEffect(() => {
    if (!deliveryEvent) return undefined;
    const timer = setTimeout(reload, 0);
    return () => clearTimeout(timer);
  }, [deliveryEvent, reload]);
  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <div className="flex flex-col gap-5 max-w-[640px] mx-auto w-full">
      <PageHeader title={t("Pengantaran Saya")} description={t("Pesanan yang harus Anda antar. Tekan tombol di tiap kartu saat sudah mengambil dan saat sudah sampai.")} />
      <Async query={query} loadingLabel={t("Memuat pengantaran...")}>
        {(data) => {
          const open = data.items.filter(isOpen);
          const done = data.items.filter((d) => !isOpen(d)).slice(0, 10);
          return (
            <>
              {open.length === 0 ? (
                <Card>
                  <EmptyState icon="route" title={t("Belum ada yang perlu diantar")} body={t("Saat tim memberi Anda pesanan, muncul di sini dan Anda mendapat pemberitahuan.")} />
                </Card>
              ) : (
                open.map((d) => <DeliveryCard key={d.id} delivery={d} onChanged={reload} />)
              )}
              {done.length ? (
                <>
                  <h2 className="text-heading-sm font-bold text-fg m-0 mt-2">{t("Selesai belakangan ini")}</h2>
                  {done.map((d) => (
                    <DeliveryCard key={d.id} delivery={d} onChanged={reload} />
                  ))}
                </>
              ) : null}
            </>
          );
        }}
      </Async>
    </div>
  );
}
