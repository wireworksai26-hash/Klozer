"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, EmptyState, Modal, SelectField, TextAreaField } from "@/components/ui";
import { NOTICE_STATUS } from "./deliveryModel";

/**
 * Hand an order to a delivery PIC. `order` is { dbId, id (the order number) }. The PIC is told on their phone; the
 * answer says whether that worked, so the person here can follow up by hand when it did not.
 */
export default function AssignDeliveryModal({ order, onClose, onAssigned }) {
  const { t, notify } = useDashboard();
  const { run, pending } = useAction();
  const pics = useApi("/deliveries/pics", { enabled: Boolean(order) });
  const [picId, setPicId] = useState("");
  const [note, setNote] = useState("");

  if (!order) return null;
  const list = pics.data?.items ?? [];

  const submit = async () => {
    const result = await run(() => api.post("/deliveries", { order_id: order.dbId, pic_user_id: Number(picId), note: note.trim() || undefined }));
    if (!result.ok) return;
    const notice = result.data.data.notify_status;
    if (notice === "sent") notify("success", t("Pesanan diberikan ke PIC dan sudah diberi tahu lewat WhatsApp."));
    else notify("error", t("Pesanan diberikan ke PIC, tetapi pemberitahuan WhatsApp belum terkirim: {reason}", { reason: result.data.data.notify_detail || t(NOTICE_STATUS[notice].label) }));
    onAssigned?.(result.data.data);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Antar pesanan")}
      description={`${t("Pesanan")} ${order.id}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button icon="send" loading={pending} disabled={!picId} onClick={submit}>
            {t("Berikan ke PIC")}
          </Button>
        </>
      }
    >
      {pics.loading ? (
        <p role="status" className="text-body-sm text-fg-muted">{t("Memuat daftar PIC...")}</p>
      ) : list.length === 0 ? (
        <EmptyState icon="userCheck" title={t("Belum ada PIC Pengantaran")} body={t("Tambahkan anggota tim dengan peran PIC Pengantaran di Pengaturan, lalu kembali ke sini.")} />
      ) : (
        <div className="flex flex-col gap-4">
          <SelectField
            label={t("PIC pengantaran")}
            value={picId}
            onChange={(e) => setPicId(e.target.value)}
            placeholder={t("Pilih PIC")}
            options={list.map((p) => ({ value: p.id, label: `${p.name}${Number(p.open_deliveries) ? ` (${t("{count} sedang diantar", { count: p.open_deliveries })})` : ""}` }))}
            required
          />
          <TextAreaField label={t("Catatan untuk PIC")} hint={t("Opsional. Contoh: titip ke satpam, hubungi dulu sebelum sampai.")} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-label text-fg-muted">{t("PIC menerima pemberitahuan di dashboard dan lewat WhatsApp ke nomor yang diisi di akunnya.")}</p>
        </div>
      )}
    </Modal>
  );
}
