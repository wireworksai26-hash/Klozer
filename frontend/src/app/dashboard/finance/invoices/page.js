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
  const [selectedOrder, setSelectedOrder] = useState(orders[0] || null);

  const handlePrint = () => {
    if (orders.length === 0) {
      alert("Belum ada pesanan untuk dicetak fakturnya.");
      return;
    }
    alert(`Mencetak ${orders.length} Faktur / Nota dalam format ${selectedFormat === "a4" ? "PDF A4 Resmi" : "Thermal Kasir 80mm"}...`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Faktur & Nota Penjualan</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Cetak Massal Faktur & Nota (Invoice)
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Cetak faktur resmi format PDF A4 atau struk nota kasir thermal 80mm/58mm untuk paket pesanan pelanggan.
          </p>
        </div>

        {orders.length > 0 && (
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Cetak Semua Nota Hari Ini</span>
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#ede8e2] shadow-xs text-center">
          <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-3">
              <ReceiptIcon className="w-6 h-6 text-[#2545ff]" />
            </div>
            <div className="font-extrabold text-[#0c1754] text-[15px]">Belum Ada Faktur Penjualan</div>
            <p className="text-[12.5px] text-[#64748b] mt-1 mb-4">
              Faktur pesanan dan struk kasir thermal akan otomatis dibuat ketika ada transaksi penjualan baru di toko Anda.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Format Selector & List */}
          <div className="flex flex-col gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-3">
              <span className="text-[12px] font-bold uppercase text-[#8f95a8]">Pilih Format Dokumen:</span>
              <div className="flex flex-col gap-2">
                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedFormat === "a4" ? "border-[#2545ff] bg-[#edeffe]" : "border-[#ede8e2] hover:bg-[#fcfbf9]"}`}>
                  <input
                    type="radio"
                    name="format"
                    value="a4"
                    checked={selectedFormat === "a4"}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="accent-[#2545ff]"
                  />
                  <div className="text-[13px] font-bold text-[#1e2640]">
                    <div>Faktur Standar PDF A4</div>
                    <div className="text-[11px] text-[#8f95a8] font-normal">Format invoice resmi instansi</div>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedFormat === "thermal80" ? "border-[#2545ff] bg-[#edeffe]" : "border-[#ede8e2] hover:bg-[#fcfbf9]"}`}>
                  <input
                    type="radio"
                    name="format"
                    value="thermal80"
                    checked={selectedFormat === "thermal80"}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="accent-[#2545ff]"
                  />
                  <div className="text-[13px] font-bold text-[#1e2640]">
                    <div>Struk Kasir Thermal 80mm</div>
                    <div className="text-[11px] text-[#8f95a8] font-normal">Printer bluetooth / POS kasir toko</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Orders Selector */}
            <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-3">
              <span className="text-[12px] font-bold uppercase text-[#8f95a8]">Pilih Pesanan untuk Preview:</span>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOrder(o)}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      selectedOrder?.id === o.id
                        ? "border-[#2545ff] bg-[#edeffe] text-[#2545ff]"
                        : "border-[#ede8e2] bg-white text-[#1e2640]"
                    }`}
                  >
                    <div className="font-bold text-[13px]">{o.customerName}</div>
                    <div className="text-[11.5px] text-[#8f95a8]">
                      {o.id} • Rp {Number(o.total || 0).toLocaleString("id-ID")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Invoice Preview */}
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between min-h-[500px]">
            <div>
              {/* Invoice Header */}
              <div className="flex items-start justify-between pb-6 border-b border-[#ede8e2]">
                <div>
                  <h2 className="text-[20px] font-extrabold text-[#1e2640]">{cleanInstName}</h2>
                  <p className="text-[12px] text-[#64748b] mt-0.5">WhatsApp Verified Merchant • Transaksi Resmi</p>
                </div>

                <div className="text-right">
                  <span className="text-[18px] font-extrabold font-mono text-[#2545ff]">INVOICE</span>
                  <div className="text-[12px] font-mono text-[#8f95a8] mt-0.5">{selectedOrder?.id}</div>
                  <div className="text-[11.5px] text-[#8f95a8]">{selectedOrder?.date || "Hari ini"}</div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="py-4 border-b border-[#ede8e2] flex justify-between text-[13px]">
                <div>
                  <span className="text-[11px] uppercase font-bold text-[#8f95a8] block">Ditagihkan Kepada:</span>
                  <div className="font-bold text-[#1e2640] mt-0.5">{selectedOrder?.customerName}</div>
                  <div className="text-[#64748b] text-[12px]">{selectedOrder?.phone}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase font-bold text-[#8f95a8] block">Status Pembayaran:</span>
                  <span className="badge badge-success text-[11px] mt-0.5 inline-block">
                    {selectedOrder?.status === "paid" || selectedOrder?.paymentStatus === "paid" ? "LUNAS (PAID)" : "MENUNGGU PEMBAYARAN"}
                  </span>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="py-4">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#ede8e2] text-[#8f95a8] text-[11px] uppercase">
                      <th className="py-2">Deskripsi Produk</th>
                      <th className="py-2 text-right">Harga</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede8e2]">
                    <tr>
                      <td className="py-3 font-semibold text-[#1e2640]">{selectedOrder?.product || "Produk Pilihan"}</td>
                      <td className="py-3 text-right text-[#5a6380]">Rp {Number(selectedOrder?.total || 0).toLocaleString("id-ID")}</td>
                      <td className="py-3 text-right text-[#5a6380]">1</td>
                      <td className="py-3 text-right font-bold text-[#1e2640]">Rp {Number(selectedOrder?.total || 0).toLocaleString("id-ID")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Summary Total */}
            <div className="pt-4 border-t-2 border-[#1e2640] flex items-center justify-between">
              <span className="font-extrabold text-[15px] text-[#1e2640]">TOTAL PEMBAYARAN:</span>
              <span className="font-extrabold text-[22px] text-[#2545ff]">
                Rp {Number(selectedOrder?.total || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
