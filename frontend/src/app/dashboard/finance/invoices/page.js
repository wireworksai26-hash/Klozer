"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  PrinterIcon,
  CrownIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
  ReceiptIcon,
} from "@/components/icons";

export default function SupervisorInvoicesPage() {
  const { orders, activeInstitution, currentUser } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const [selectedFormat, setSelectedFormat] = useState("a4"); // "a4", "thermal80", "thermal58"
  const [pickedId, setPickedId] = useState(null);
  const selectedOrder = orders.find((o) => o.id === pickedId) || orders[0] || null;

  // Prints the invoice currently previewed (the browser's print dialog also offers "Save as PDF").
  const handlePrint = () => {
    if (!selectedOrder) return;
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-caption font-bold uppercase tracking-wider bg-blue-100 text-brand px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Faktur & Nota Penjualan</span>
            </span>
          </div>
          <h1 className="page-title">
            Cetak Massal Faktur & Nota (Invoice)
          </h1>
          <p className="text-body-sm text-fg-muted">
            Cetak faktur resmi format PDF A4 atau struk nota kasir thermal 80mm/58mm untuk paket pesanan pelanggan.
          </p>
        </div>

        {orders.length > 0 && (
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Cetak Semua Nota Hari Ini</span>
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-line shadow-xs text-center">
          <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
              <ReceiptIcon className="w-6 h-6 text-brand" />
            </div>
            <div className="font-bold text-ink text-body">Belum Ada Faktur Penjualan</div>
            <p className="text-label text-fg-muted mt-1 mb-4">
              Faktur pesanan dan struk kasir thermal akan otomatis dibuat ketika ada transaksi penjualan baru di toko Anda.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Format Selector & List */}
          <div className="flex flex-col gap-4">
            <div className="bg-white p-5 rounded-2xl border border-line shadow-xs flex flex-col gap-3">
              <span className="text-label font-bold uppercase text-fg-subtle">Pilih Format Dokumen:</span>
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
                    <div>Faktur Standar PDF A4</div>
                    <div className="text-caption text-fg-subtle font-normal">Format invoice resmi instansi</div>
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
                    <div>Struk Kasir Thermal 80mm</div>
                    <div className="text-caption text-fg-subtle font-normal">Printer bluetooth / POS kasir toko</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Orders Selector */}
            <div className="bg-white p-5 rounded-2xl border border-line shadow-xs flex flex-col gap-3">
              <span className="text-label font-bold uppercase text-fg-subtle">Pilih Pesanan untuk Preview:</span>
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
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-line shadow-xs flex flex-col justify-between min-h-[500px]">
            <div>
              {/* Invoice Header */}
              <div className="flex items-start justify-between pb-6 border-b border-line">
                <div>
                  <h2 className="text-subheading font-bold text-fg">{cleanInstName}</h2>
                  <p className="text-label text-fg-muted mt-0.5">WhatsApp Verified Merchant • Transaksi Resmi</p>
                </div>

                <div className="text-right">
                  <span className="text-title font-bold font-mono text-brand">INVOICE</span>
                  <div className="text-label font-mono text-fg-subtle mt-0.5">{selectedOrder?.id}</div>
                  <div className="text-caption text-fg-subtle">{selectedOrder?.date || "Hari ini"}</div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="py-4 border-b border-line flex justify-between text-body-sm">
                <div>
                  <span className="text-caption uppercase font-bold text-fg-subtle block">Ditagihkan Kepada:</span>
                  <div className="font-bold text-fg mt-0.5">{selectedOrder?.customerName}</div>
                  <div className="text-fg-muted text-label">{selectedOrder?.phone}</div>
                </div>
                <div className="text-right">
                  <span className="text-caption uppercase font-bold text-fg-subtle block">Status Pembayaran:</span>
                  <span className="badge badge-success mt-0.5 inline-block">
                    {selectedOrder?.paymentStatus === "paid" ? "LUNAS (PAID)" : selectedOrder?.status === "cancelled" ? "DIBATALKAN" : "MENUNGGU PEMBAYARAN"}
                  </span>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="py-4">
                <table className="w-full text-left text-body-sm">
                  <thead>
                    <tr className="border-b border-line text-fg-subtle text-caption uppercase">
                      <th className="py-2">Deskripsi Produk</th>
                      <th className="py-2 text-right">Harga</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(selectedOrder?.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-semibold text-fg">{it.name}</td>
                        <td className="py-3 text-right text-fg-muted">Rp {Number(it.price || 0).toLocaleString("id-ID")}</td>
                        <td className="py-3 text-right text-fg-muted">{it.qty}</td>
                        <td className="py-3 text-right font-bold text-fg">Rp {Number((it.price || 0) * (it.qty || 0)).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                    {selectedOrder?.shippingFee > 0 && (
                      <tr>
                        <td className="py-3 text-fg-muted" colSpan={3}>Ongkos kirim</td>
                        <td className="py-3 text-right text-fg">Rp {Number(selectedOrder.shippingFee).toLocaleString("id-ID")}</td>
                      </tr>
                    )}
                    {selectedOrder?.discount > 0 && (
                      <tr>
                        <td className="py-3 text-fg-muted" colSpan={3}>Diskon</td>
                        <td className="py-3 text-right text-fg">-Rp {Number(selectedOrder.discount).toLocaleString("id-ID")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Summary Total */}
            <div className="pt-4 border-t-2 border-fg flex items-center justify-between">
              <span className="font-bold text-body text-fg">TOTAL PEMBAYARAN:</span>
              <span className="font-bold text-subheading text-brand">
                Rp {Number(selectedOrder?.total || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
