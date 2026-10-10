"use client";
import React, { useState } from "react";
import {
  printViaWebBluetooth,
  printViaBrowserWindow,
} from "@/utils/thermalPrinter";
import {
  ReceiptIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  SparklesIcon,
} from "@/components/icons";

export default function ThermalPrintModal({
  isOpen,
  onClose,
  order = null,
  storeName = "Geprek Juara",
}) {
  const [paperWidth, setPaperWidth] = useState(58); // 58 | 80
  const [isPrinting, setIsPrinting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen || !order) return null;

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    setStatusMsg(null);
    try {
      await printViaWebBluetooth(order, { paperWidth, storeName });
      setStatusMsg({ type: "success", text: "Struk berhasil dicetak via Bluetooth!" });
    } catch (err) {
      console.warn("Bluetooth Print fallback:", err.message);
      setStatusMsg({
        type: "info",
        text: `${err.message} Membuka jendela cetak sistem...`,
      });
      // Auto fallback to browser print window
      printViaBrowserWindow(order, { paperWidth, storeName });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    printViaBrowserWindow(order, { paperWidth, storeName });
  };

  const items = order.items || [
    { item_name: "Paket Juara 1 (Ayam Geprek + Nasi + Es Teh)", quantity: 2, subtotal: 44000, unit_price: 22000 },
  ];

  const isPaid = order.status === "paid" || order.payment_status === "paid";

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-line w-full max-w-[480px] overflow-hidden flex flex-col max-h-[92vh] animate-scale-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-line bg-soft flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ReceiptIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-body font-bold text-ink">
                Cetak Tiket Dapur & Kasir
              </h3>
              <span className="text-caption text-fg-muted">
                Direct-to-Thermal ESC/POS Printer
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-brand-soft text-fg-muted hover:text-brand flex items-center justify-center border border-line cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-soft border-b border-line flex items-center justify-between">
          <span className="text-label font-bold text-ink">Ukuran Kertas:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaperWidth(58)}
              className={`px-3 py-1 rounded-xl text-label font-bold cursor-pointer transition-all ${
                paperWidth === 58
                  ? "bg-brand text-white shadow-xs"
                  : "bg-white text-fg-muted border border-line"
              }`}
            >
              58mm (Mini Portable)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth(80)}
              className={`px-3 py-1 rounded-xl text-label font-bold cursor-pointer transition-all ${
                paperWidth === 80
                  ? "bg-brand text-white shadow-xs"
                  : "bg-white text-fg-muted border border-line"
              }`}
            >
              80mm (Standar Dapur)
            </button>
          </div>
        </div>

        {/* Paper Preview Simulation */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center bg-sunken">
          <div
            className={`bg-white p-4 rounded-xl shadow-md border border-line-strong font-mono text-caption text-[#1e293b] leading-tight transition-all ${
              paperWidth === 80 ? "w-[340px]" : "w-[260px]"
            }`}
          >
            <div className="text-center font-bold text-body-sm uppercase mb-0.5">
              {storeName}
            </div>
            <div className="text-center text-micro text-fg-muted mb-2">
              TIKET DAPUR (ORDER WHATSAPP)
            </div>
            <div className="border-t border-dashed border-fg-subtle my-1.5" />

            <div>Order : {order.order_number || order.id}</div>
            <div>Waktu : {order.date || (order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-")}</div>
            <div>Cust  : {order.customer_name || "Pelanggan"}</div>

            <div className="border-t border-dashed border-fg-subtle my-1.5" />

            {items.map((it, idx) => (
              <div key={idx} className="mb-1.5">
                <div className="font-bold">{it.item_name || it.name}</div>
                <div className="flex justify-between text-micro text-fg-muted">
                  <span>{it.quantity}x @ Rp {(Number(it.unit_price || 0)).toLocaleString("id-ID")}</span>
                  <span className="font-bold">Rp {(Number(it.subtotal || it.unit_price * it.quantity || 0)).toLocaleString("id-ID")}</span>
                </div>
              </div>
            ))}

            <div className="border-t border-dashed border-fg-subtle my-1.5" />

            <div className="flex justify-between font-bold text-label mt-1">
              <span>TOTAL:</span>
              <span>Rp {(Number(order.total_amount || 0)).toLocaleString("id-ID")}</span>
            </div>

            <div className="border-t border-double border-fg-muted my-2" />

            <div className="text-center">
              <span className="px-2 py-0.5 border border-black font-bold text-micro inline-block">
                {isPaid ? "LUNAS (DYNAMIC QRIS)" : order.payment_method === "cod" ? "COD (BAYAR DI TEMPAT)" : "MENUNGGU BAYAR"}
              </span>
              {order.notes && (
                <div className="mt-1 text-micro text-fg-muted">Catatan: {order.notes}</div>
              )}
            </div>
          </div>
        </div>

        {/* Status Alert if any */}
        {statusMsg && (
          <div
            className={`p-2.5 px-4 text-label font-bold flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-3.5 px-5 border-t border-line bg-soft flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-label font-bold text-fg-muted hover:bg-line rounded-xl cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="px-3.5 py-2 bg-white hover:bg-gray-100 text-ink rounded-xl text-label font-bold border border-line-strong cursor-pointer"
            >
              Cetak Windows/USB
            </button>
            <button
              type="button"
              onClick={handleBluetoothPrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-label font-bold flex items-center gap-1.5 cursor-pointer shadow-sm border-none"
            >
              <ReceiptIcon className="w-3.5 h-3.5" />
              <span>{isPrinting ? "Mencetak..." : "Cetak Bluetooth"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
