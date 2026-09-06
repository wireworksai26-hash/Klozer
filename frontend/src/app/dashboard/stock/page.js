"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  PackageIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SlidersIcon,
  TrendingUpIcon,
  UploadIcon,
  DownloadIcon,
  XIcon,
} from "@/components/icons";
import DataTransferModal from "@/components/common/DataTransferModal";

export default function SupervisorStockPage() {
  const { products, updateProductStock, importStock, role } = useDashboard();
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustType, setAdjustType] = useState("in"); // "in" or "out"
  const [adjustNotes, setAdjustNotes] = useState("Restok barang masuk");

  const [mutations, setMutations] = useState([]);

  const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalAssetValue = products.reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  const lowStockCount = products.filter((p) => (Number(p.stock) || 0) <= (Number(p.lowStock) || 5)).length;

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qtyChange = adjustType === "in" ? Number(adjustQty) : -Number(adjustQty);
    const newStock = Math.max(0, (selectedProduct.stock || 0) + qtyChange);
    
    if (updateProductStock) {
      updateProductStock(selectedProduct.id, newStock);
    }

    const newMut = {
      id: `MUT-${Date.now().toString().slice(-4)}`,
      product: selectedProduct?.name || "Produk",
      type: adjustType,
      qty: Number(adjustQty),
      notes: adjustNotes,
      date: "Baru saja",
      staff: role === "spv" ? "Supervisor (SPV)" : "Owner / Admin",
    };
    setMutations([newMut, ...mutations]);
    setShowAdjustModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <PackageIcon className="w-3.5 h-3.5" />
              <span>Inventaris & Manajemen Pergudangan</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Manajemen Stok & Mutasi Real-Time
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Pantau persediaan barang, peringatan stok menipis (low stock alert), dan riwayat mutasi masuk/keluar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#1e2640] hover:text-emerald-700 border border-[#ede8e2] rounded-xl text-[13px] font-extrabold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <UploadIcon className="w-4 h-4 text-emerald-600" />
            <span>Impor / Ekspor Excel</span>
          </button>

          {products.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedProduct(products[0]);
                setShowAdjustModal(true);
              }}
              className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer"
            >
              <SlidersIcon className="w-4 h-4" />
              <span>+ Catat Mutasi</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Unit Persediaan</div>
          <div className="text-[28px] font-extrabold text-[#1e2640]">{totalUnits} Pcs</div>
          <span className={`text-[11.5px] font-bold ${totalUnits > 0 ? "text-emerald-600" : "text-[#8f95a8]"}`}>
            {totalUnits > 0 ? `Nilai Aset: Rp ${totalAssetValue.toLocaleString()}` : "Belum ada stok fisik"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Stok Menipis (&lt;10 Pcs)</div>
          <div className={`text-[28px] font-extrabold ${lowStockCount > 0 ? "text-amber-600" : "text-[#1e2640]"}`}>
            {lowStockCount} Produk
          </div>
          <span className={`text-[11.5px] font-bold ${lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {lowStockCount > 0 ? "Perlu Restok Segera" : "Semua persediaan aman"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Sinkronisasi AI Chatbot</div>
          <div className="text-[28px] font-extrabold text-emerald-700">100% Real-Time</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Bot menolak order jika stok 0</span>
        </div>
      </div>

      {/* Stock Levels Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Level Persediaan Produk Toko</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">Produk & Kategori</th>
                <th className="py-3 px-4">SKU Kode</th>
                <th className="py-3 px-4">Harga Jual</th>
                <th className="py-3 px-4">Sisa Stok Fisik</th>
                <th className="py-3 px-4">Status Ketersediaan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-2">
                        <PackageIcon className="w-5 h-5 text-[#2545ff]" />
                      </div>
                      <div className="font-extrabold text-[#0c1754] text-[14px]">Belum Ada Data Produk</div>
                      <p className="text-[12px] text-[#64748b] mt-1">
                        Silakan tambahkan produk di menu Katalog Produk untuk memantau stok dan persediaan barang.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e2640] text-[13.5px]">{p.name}</div>
                      <div className="text-[11px] text-[#8f95a8]">{p.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#5a6380] text-[12.5px]">{p.sku || `SKU-${p.id}`}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-[#1e2640] text-[13px]">
                        Rp {Number(p.price || 0).toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[15px] text-[#2545ff]">{p.stock || 0} Pcs</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {(p.stock || 0) > 20 ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Stok Aman
                        </span>
                      ) : (p.stock || 0) > 0 ? (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                          Hampir Habis
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
                          Habis (Out of Stock)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setShowAdjustModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold border border-[#2545ff] text-[#2545ff] bg-blue-50 hover:bg-blue-100 cursor-pointer"
                      >
                        Sesuaikan
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mutations Log */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Riwayat Mutasi Keluar/Masuk Barang</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">ID Mutasi & Produk</th>
                <th className="py-3 px-4">Jenis & Jumlah</th>
                <th className="py-3 px-4">Keterangan / Alasan</th>
                <th className="py-3 px-4">Waktu & Penanggungjawab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {mutations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#64748b] text-[13px]">
                    Belum ada riwayat mutasi penyesuaian stok.
                  </td>
                </tr>
              ) : (
                mutations.map((m) => (
                  <tr key={m.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e2640] text-[13px]">{m.product}</div>
                      <div className="text-[11px] text-[#8f95a8] font-mono">{m.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-black text-[12.5px] px-2 py-0.5 rounded-md ${
                          m.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {m.type === "in" ? `+${m.qty} Pcs (Masuk)` : `-${m.qty} Pcs (Keluar)`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[12.5px] text-[#1e2640]">{m.notes}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[12px] text-[#1e2640]">{m.date}</div>
                      <div className="text-[11px] text-[#8f95a8]">Oleh: {m.staff}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ede8e2]">
            <h3 className="text-[18px] font-extrabold text-[#0c1754] mb-1">
              Catat Mutasi Stok: {selectedProduct.name}
            </h3>
            <p className="text-[12.5px] text-[#64748b] mb-4">
              Stok saat ini: <strong>{selectedProduct.stock || 0} Pcs</strong>
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">Jenis Mutasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("in")}
                    className={`py-2 text-[12.5px] font-bold rounded-xl border cursor-pointer transition-all ${
                      adjustType === "in" ? "bg-emerald-600 text-white border-emerald-600" : "bg-[#f9f8f6] text-[#64748b]"
                    }`}
                  >
                    + Barang Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("out")}
                    className={`py-2 text-[12.5px] font-bold rounded-xl border cursor-pointer transition-all ${
                      adjustType === "out" ? "bg-rose-600 text-white border-rose-600" : "bg-[#f9f8f6] text-[#64748b]"
                    }`}
                  >
                    - Barang Keluar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">Jumlah Unit (Pcs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] font-bold text-[#0c1754] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">Alasan / Catatan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penerimaan stok dari supplier"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13px] text-[#0c1754] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-[#64748b] bg-[#f9f8f6] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary !py-2.5 text-[13px] font-bold"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Transfer Modal (Import / Export CSV) */}
      <DataTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        type="stock"
        data={products.map((p) => ({
          sku: p.sku,
          name: p.name,
          newStock: p.stock,
          note: "Stok aktif real-time",
        }))}
        onImportSuccess={(newStockItems) => {
          importStock(newStockItems);
          alert(`Sukses memperbarui stok ${newStockItems.length} produk dari file CSV!`);
        }}
      />
    </div>
  );
}
