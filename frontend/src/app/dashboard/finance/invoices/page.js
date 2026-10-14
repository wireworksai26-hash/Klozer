"use client";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useDashboard } from "@/context/DashboardContext";
import {
  PrinterIcon,
  CrownIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
  ReceiptIcon,
} from "@/components/icons";

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

function paymentLabel(order) {
  if (order?.paymentStatus === "paid") return "LUNAS (PAID)";
  if (order?.status === "cancelled") return "DIBATALKAN";
  return "MENUNGGU PEMBAYARAN";
}

/**
 * One printable document. It is customer-facing, so it stays in Indonesian and in plain black on white.
 * "a4" is a full invoice page; the thermal formats are a narrow receipt column.
 */
function PrintDocument({ order, instName, format }) {
  const items = order.items || [];
  if (format !== "a4") {
    return (
      <section className="print-page print-receipt" style={{ width: format === "thermal58" ? "58mm" : "80mm" }}>
        <div className="print-center print-strong">{instName}</div>
        <div className="print-center print-small">Transaksi Resmi via WhatsApp</div>
        <hr />
        <div className="print-small">No: {order.id}</div>
        <div className="print-small">Tgl: {order.date || "Hari ini"}</div>
        <div className="print-small">Pelanggan: {order.customerName}</div>
        <hr />
        {items.map((it, i) => (
          <div key={i} className="print-small">
            <div>{it.name}</div>
            <div className="print-row"><span>{it.qty} x {rupiah(it.price)}</span><span>{rupiah((it.price || 0) * (it.qty || 0))}</span></div>
          </div>
        ))}
        {order.shippingFee > 0 && <div className="print-row print-small"><span>Ongkos kirim</span><span>{rupiah(order.shippingFee)}</span></div>}
        {order.discount > 0 && <div className="print-row print-small"><span>Diskon</span><span>-{rupiah(order.discount)}</span></div>}
        <hr />
        <div className="print-row print-strong"><span>TOTAL</span><span>{rupiah(order.total)}</span></div>
        <div className="print-center print-small">{paymentLabel(order)}</div>
        <hr />
        <div className="print-center print-small">Terima kasih sudah berbelanja</div>
      </section>
    );
  }

  return (
    <section className="print-page print-a4">
      <div className="print-row print-head">
        <div>
          <div className="print-title">{instName}</div>
          <div className="print-small">WhatsApp Verified Merchant • Transaksi Resmi</div>
        </div>
        <div className="print-right">
          <div className="print-title">INVOICE</div>
          <div className="print-small">{order.id}</div>
          <div className="print-small">{order.date || "Hari ini"}</div>
        </div>
      </div>
      <div className="print-row print-block">
        <div>
          <div className="print-label">Ditagihkan kepada</div>
          <div className="print-strong">{order.customerName}</div>
          <div className="print-small">{order.phone}</div>
        </div>
        <div className="print-right">
          <div className="print-label">Status pembayaran</div>
          <div className="print-strong">{paymentLabel(order)}</div>
        </div>
      </div>
      <table className="print-table">
        <thead>
          <tr><th>Deskripsi Produk</th><th className="print-right">Harga</th><th className="print-right">Qty</th><th className="print-right">Total</th></tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>{it.name}</td>
              <td className="print-right">{rupiah(it.price)}</td>
              <td className="print-right">{it.qty}</td>
              <td className="print-right">{rupiah((it.price || 0) * (it.qty || 0))}</td>
            </tr>
          ))}
          {order.shippingFee > 0 && <tr><td colSpan={3}>Ongkos kirim</td><td className="print-right">{rupiah(order.shippingFee)}</td></tr>}
          {order.discount > 0 && <tr><td colSpan={3}>Diskon</td><td className="print-right">-{rupiah(order.discount)}</td></tr>}
        </tbody>
      </table>
      <div className="print-row print-total">
        <span>TOTAL PEMBAYARAN</span>
        <span>{rupiah(order.total)}</span>
      </div>
    </section>
  );
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function SupervisorInvoicesPage() {
  const { orders, activeInstitution, currentUser, t } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const [selectedFormat, setSelectedFormat] = useState("a4"); // "a4", "thermal80", "thermal58"
  const [pickedId, setPickedId] = useState(null);
  const selectedOrder = orders.find((o) => o.id === pickedId) || orders[0] || null;

  // Only the print sheet is printed (see the print rules in globals.css): today's orders, one per page,
  // or the previewed order when nothing was placed today. The print dialog also offers "Save as PDF".
  const todays = orders.filter((o) => isToday(o.created_at));
  const printList = todays.length > 0 ? todays : selectedOrder ? [selectedOrder] : [];
  const canPortal = useSyncExternalStore(() => () => {}, () => true, () => false);

  const handlePrint = () => {
    if (printList.length === 0) return;
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {canPortal &&
        createPortal(
          <div className="print-sheet-root" aria-hidden="true">
            {printList.map((o) => (
              <PrintDocument key={o.id} order={o} instName={cleanInstName} format={selectedFormat} />
            ))}
          </div>,
          document.body
        )}
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-caption font-bold uppercase tracking-wider bg-brand-soft text-brand px-2.5 py-0.5 rounded-full border border-brand/20 flex items-center gap-1.5">
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>{t("Faktur & Nota Penjualan")}</span>
            </span>
          </div>
          <h1 className="page-title">
            {t("Cetak Massal Faktur & Nota (Invoice)")}
          </h1>
          <p className="text-body-sm text-fg-muted">
            {t("Cetak faktur resmi format PDF A4 atau struk nota kasir thermal 80mm/58mm untuk paket pesanan pelanggan.")}
          </p>
        </div>

        {orders.length > 0 && (
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>{t("Cetak Semua Nota Hari Ini")}</span>
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-line shadow-xs text-center">
          <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
              <ReceiptIcon className="w-6 h-6 text-brand" />
            </div>
            <div className="font-bold text-ink text-body">{t("Belum Ada Faktur Penjualan")}</div>
            <p className="text-label text-fg-muted mt-1 mb-4">
              {t("Faktur pesanan dan struk kasir thermal akan otomatis dibuat ketika ada transaksi penjualan baru di toko Anda.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Format Selector & List */}
          <div className="flex flex-col gap-4 min-w-0">
            <div className="bg-white p-5 rounded-2xl border border-line shadow-xs flex flex-col gap-3">
              <span className="text-label font-bold uppercase text-fg-subtle">{t("Pilih Format Dokumen:")}</span>
              <div className="flex flex-col gap-2">
                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedFormat === "a4" ? "border-brand bg-brand-soft" : "border-line hover:bg-soft"}`}>
                  <input
                    type="radio"
                    name="format"
                    value="a4"
                    checked={selectedFormat === "a4"}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="accent-brand"
                  />
                  <div className="text-body-sm font-bold text-fg">
                    <div>{t("Faktur Standar PDF A4")}</div>
                    <div className="text-caption text-fg-subtle font-normal">{t("Format invoice resmi instansi")}</div>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedFormat === "thermal80" ? "border-brand bg-brand-soft" : "border-line hover:bg-soft"}`}>
                  <input
                    type="radio"
                    name="format"
                    value="thermal80"
                    checked={selectedFormat === "thermal80"}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="accent-brand"
                  />
                  <div className="text-body-sm font-bold text-fg">
                    <div>{t("Struk Kasir Thermal 80mm")}</div>
                    <div className="text-caption text-fg-subtle font-normal">{t("Printer bluetooth / POS kasir toko")}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Orders Selector */}
            <div className="bg-white p-5 rounded-2xl border border-line shadow-xs flex flex-col gap-3">
              <span className="text-label font-bold uppercase text-fg-subtle">{t("Pilih Pesanan untuk Preview:")}</span>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setPickedId(o.id)}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      selectedOrder?.id === o.id
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-line bg-white text-fg"
                    }`}
                  >
                    <div className="font-bold text-body-sm">{o.customerName}</div>
                    <div className="text-caption text-fg-subtle">
                      {o.id} • Rp {Number(o.total || 0).toLocaleString("id-ID")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Invoice Preview */}
          <div className="lg:col-span-2 min-w-0 bg-white p-4 sm:p-8 rounded-2xl border border-line shadow-xs flex flex-col justify-between min-h-[500px]">
            <div className="min-w-0 w-full">
              {/* Invoice Header */}
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 pb-6 border-b border-line">
                <div className="min-w-0">
                  <h2 className="text-subheading font-bold text-fg">{cleanInstName}</h2>
                  <p className="text-label text-fg-muted mt-0.5">WhatsApp Verified Merchant • Transaksi Resmi</p>
                </div>

                <div className="sm:text-right min-w-0">
                  <span className="text-title font-bold font-mono text-brand">INVOICE</span>
                  <div className="text-label font-mono text-fg-subtle mt-0.5 break-all">{selectedOrder?.id}</div>
                  <div className="text-caption text-fg-subtle">{selectedOrder?.date || "Hari ini"}</div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="py-4 border-b border-line flex flex-wrap justify-between gap-x-6 gap-y-3 text-body-sm">
                <div className="min-w-0">
                  <span className="text-caption uppercase font-bold text-fg-subtle block">Ditagihkan Kepada:</span>
                  <div className="font-bold text-fg mt-0.5">{selectedOrder?.customerName}</div>
                  <div className="text-fg-muted text-label">{selectedOrder?.phone}</div>
                </div>
                <div className="sm:text-right">
                  <span className="text-caption uppercase font-bold text-fg-subtle block">Status Pembayaran:</span>
                  <span className="badge badge-success mt-0.5 inline-block">
                    {selectedOrder?.paymentStatus === "paid" ? "LUNAS (PAID)" : selectedOrder?.status === "cancelled" ? "DIBATALKAN" : "MENUNGGU PEMBAYARAN"}
                  </span>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="py-4 table-scroll">
                <table className="w-full text-left text-body-sm [&_th]:!px-2 [&_td]:!px-2 [&_th]:!whitespace-normal sm:[&_th]:!px-4 sm:[&_td]:!px-4">
                  <thead>
                    <tr className="border-b border-line text-fg-subtle text-caption uppercase">
                      <th className="py-2">Deskripsi Produk</th>
                      <th className="py-2 text-right hidden sm:table-cell">Harga</th>
                      <th className="py-2 pl-3 text-right">Qty</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(selectedOrder?.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-semibold text-fg">{it.name}</td>
                        <td className="py-3 text-right text-fg-muted whitespace-nowrap tabular-nums hidden sm:table-cell">Rp {Number(it.price || 0).toLocaleString("id-ID")}</td>
                        <td className="py-3 pl-3 text-right text-fg-muted">{it.qty}</td>
                        <td className="py-3 text-right font-bold text-fg whitespace-nowrap tabular-nums">Rp {Number((it.price || 0) * (it.qty || 0)).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                    {selectedOrder?.shippingFee > 0 && (
                      <tr>
                        <td className="py-3 text-fg-muted" colSpan={2}>Ongkos kirim</td>
                        <td className="hidden sm:table-cell" />
                        <td className="py-3 text-right text-fg">Rp {Number(selectedOrder.shippingFee).toLocaleString("id-ID")}</td>
                      </tr>
                    )}
                    {selectedOrder?.discount > 0 && (
                      <tr>
                        <td className="py-3 text-fg-muted" colSpan={2}>Diskon</td>
                        <td className="hidden sm:table-cell" />
                        <td className="py-3 text-right text-fg">-Rp {Number(selectedOrder.discount).toLocaleString("id-ID")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Summary Total */}
            <div className="pt-4 border-t-2 border-fg flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="font-bold text-body text-fg">TOTAL PEMBAYARAN:</span>
              <span className="font-bold text-subheading text-brand whitespace-nowrap tabular-nums">
                Rp {Number(selectedOrder?.total || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
