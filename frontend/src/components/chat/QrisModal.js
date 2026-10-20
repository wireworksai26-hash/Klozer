"use client";
import { useId, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { Button, Modal, Select, TextField } from "@/components/ui";

/**
 * Create a real order for the customer and send them a QRIS to pay it. `send` posts the message to the chat.
 * Mount it only while open: the form and the idempotency session start fresh each time.
 */
export default function QrisModal({ lead, send, onClose }) {
  const { t, products, addOrder, notify } = useDashboard();
  const active = products.filter((p) => p.active);
  const [product, setProduct] = useState(() => products.find((p) => p.active && p.stock > 0)?.id || "");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const productId = useId();
  // one order per opening and selection: retrying after a failed QRIS step reuses the order
  const [session] = useState(() => crypto.randomUUID());

  const submit = async () => {
    const chosen = products.find((p) => p.id === product);
    if (!chosen || !lead) return;
    setBusy(true);
    try {
      const order = await addOrder({
        customer: lead.name,
        phone: lead.phone,
        items: [{ productId: chosen.id, name: chosen.name, qty, price: chosen.price }],
        paymentMethod: "Dynamic QRIS",
        shippingFee: 0,
        status: "waiting_payment",
        idempotencyKey: `${session}-${chosen.dbId}-${qty}`,
      });
      if (!order) return;
      const qris = await api.post("/payments/qris", { order_id: order.dbId });
      const total = `Rp ${Number(qris.amount).toLocaleString("id-ID")}`;
      const link = qris.qrImageUrl ? `\nScan QRIS di sini: ${qris.qrImageUrl}` : "";
      await send(`Pesanan ${order.id}: ${chosen.name} x${qty}, total ${total}.${link}\nPembayaran terverifikasi otomatis setelah QRIS dibayar.`);
      onClose();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t("Terbitkan QRIS untuk")} ${lead?.name ?? ""}`}
      footer={
        active.length ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t("Batal")}
            </Button>
            <Button onClick={submit} loading={busy} disabled={!product}>
              {busy ? t("Memproses...") : t("Buat Pesanan dan Kirim QRIS")}
            </Button>
          </>
        ) : null
      }
    >
      {active.length === 0 ? (
        <div className="p-3 bg-warning-50 text-warning-800 rounded-xl text-label">{t("Tambahkan produk aktif terlebih dahulu di Katalog Produk.")}</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={productId} className="text-label font-semibold text-fg">
              {t("Produk||singular")}
            </label>
            <Select id={productId} value={product} onChange={(e) => setProduct(e.target.value)}>
              {active.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock < 1}>
                  {p.name} | Rp {Number(p.price).toLocaleString("id-ID")} | {t("stok")} {p.stock}
                </option>
              ))}
            </Select>
          </div>
          <TextField label={t("Jumlah")} type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))} />
          <p className="text-caption text-fg-muted">{t("Dibuat pesanan sungguhan (stok berkurang) dan QRIS dikirim ke chat. Pesanan lunas otomatis saat pembayaran diterima.")}</p>
        </div>
      )}
    </Modal>
  );
}
