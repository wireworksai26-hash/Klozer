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
  const [importToast, setImportToast] = useState("");

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
            <span className="text-caption font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <PackageIcon className="w-3.5 h-3.5" />
              <span>Inventaris & Manajemen Pergudangan</span>
            </span>
          </div>
          <h1 className="page-title">
            Manajemen Stok & Mutasi Real-Time
          </h1>
          <p className="text-body-sm text-fg-muted">
            Pantau persediaan barang, peringatan stok menipis (low stock alert), dan riwayat mutasi masuk/keluar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {importToast && (
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-label font-bold flex items-center gap-2 animate-scale-pop shadow-xs">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <span>{importToast}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-fg hover:text-emerald-700 border border-line rounded-xl text-body-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
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
              className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <SlidersIcon className="w-4 h-4" />
              <span>+ Catat Mutasi</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-label font-bold uppercase mb-1">Total Unit Persediaan</div>
          <div className="text-heading-md font-bold text-fg">{totalUnits} Pcs</div>
          <span className={`text-caption font-bold ${totalUnits > 0 ? "text-emerald-600" : "text-fg-subtle"}`}>
            {totalUnits > 0 ? `Nilai Aset: Rp ${totalAssetValue.toLocaleString("id-ID")}` : "Belum ada stok fisik"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-label font-bold uppercase mb-1">Stok Menipis (&lt;10 Pcs)</div>
          <div className={`text-heading-md font-bold ${lowStockCount > 0 ? "text-amber-600" : "text-fg"}`}>
            {lowStockCount} Produk
          </div>
          <span className={`text-caption font-bold ${lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {lowStockCount > 0 ? "Perlu Restok Segera" : "Semua persediaan aman"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-label font-bold uppercase mb-1">Sinkronisasi AI Chatbot</div>
          <div className="text-heading-md font-bold text-emerald-700">100% Real-Time</div>
          <span className="text-caption font-bold text-emerald-600">Bot menolak order jika stok 0</span>
        </div>
      </div>

      {/* Stock Levels Table */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs">
        <h2 className="card-title mb-4">Level Persediaan Produk Toko</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-canvas border-b border-line text-label font-bold uppercase text-fg-muted">
                <th className="py-3 px-4">Produk & Kategori</th>
                <th className="py-3 px-4">SKU Kode</th>
                <th className="py-3 px-4">Harga Jual</th>
                <th className="py-3 px-4">Sisa Stok Fisik</th>
                <th className="py-3 px-4">Status Ketersediaan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-fg-muted">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mb-2">
                        <PackageIcon className="w-5 h-5 text-brand" />
                      </div>
                      <div className="font-bold text-ink text-body-sm">Belum Ada Data Produk</div>
                      <p className="text-label text-fg-muted mt-1">
                        Silakan tambahkan produk di menu Katalog Produk untuk memantau stok dan persediaan barang.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-soft transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-fg text-body-sm">{p.name}</div>
                      <div className="text-caption text-fg-subtle">{p.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-fg-muted text-label">{p.sku || `SKU-${p.id}`}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-fg text-body-sm">
                        Rp {Number(p.price || 0).toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-body text-brand">{p.stock || 0} Pcs</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {(p.stock || 0) > 20 ? (
                        <span className="text-caption font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Stok Aman
                        </span>
                      ) : (p.stock || 0) > 0 ? (
                        <span className="text-caption font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                          Hampir Habis
                        </span>
                      ) : (
                        <span className="text-caption font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
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
                        className="px-2.5 py-1 rounded-lg text-caption font-bold border border-brand text-brand bg-blue-50 hover:bg-blue-100 cursor-pointer"
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
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs">
        <h2 className="card-title mb-4">Riwayat Mutasi Keluar/Masuk Barang</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-canvas border-b border-line text-label font-bold uppercase text-fg-muted">
                <th className="py-3 px-4">ID Mutasi & Produk</th>
                <th className="py-3 px-4">Jenis & Jumlah</th>
                <th className="py-3 px-4">Keterangan / Alasan</th>
                <th className="py-3 px-4">Waktu & Penanggungjawab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mutations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-fg-muted text-body-sm">
                    Belum ada riwayat mutasi penyesuaian stok.
                  </td>
                </tr>
              ) : (
                mutations.map((m) => (
                  <tr key={m.id} className="hover:bg-soft transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-fg text-body-sm">{m.product}</div>
                      <div className="text-caption text-fg-subtle font-mono">{m.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold text-label px-2 py-0.5 rounded-md ${
                          m.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {m.type === "in" ? `+${m.qty} Pcs (Masuk)` : `-${m.qty} Pcs (Keluar)`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-label text-fg">{m.notes}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-label text-fg">{m.date}</div>
                      <div className="text-caption text-fg-subtle">Oleh: {m.staff}</div>
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
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-line">
            <h3 className="card-title mb-1">
              Catat Mutasi Stok: {selectedProduct.name}
            </h3>
            <p className="text-label text-fg-muted mb-4">
              Stok saat ini: <strong>{selectedProduct.stock || 0} Pcs</strong>
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-label font-bold text-ink mb-1">Jenis Mutasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("in")}
                    className={`py-2 text-label font-bold rounded-xl border cursor-pointer transition-all ${
                      adjustType === "in" ? "bg-emerald-600 text-white border-emerald-600" : "bg-canvas text-fg-muted"
                    }`}
                  >
                    + Barang Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("out")}
                    className={`py-2 text-label font-bold rounded-xl border cursor-pointer transition-all ${
                      adjustType === "out" ? "bg-rose-600 text-white border-rose-600" : "bg-canvas text-fg-muted"
                    }`}
                  >
                    - Barang Keluar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-label font-bold text-ink mb-1">Jumlah Unit (Pcs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-body-sm font-bold text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-label font-bold text-ink mb-1">Alasan / Catatan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penerimaan stok dari supplier"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-body-sm text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2.5 text-body-sm font-bold text-fg-muted bg-canvas hover:bg-line rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary !py-2.5 text-body-sm font-bold"
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
          setImportToast(`Sukses memperbarui stok ${newStockItems.length} produk langsung ke tabel toko!`);
          setTimeout(() => setImportToast(""), 4500);
        }}
      />
    </div>
  );
}
