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
} from "@/components/icons";

export default function SupervisorStockPage() {
  const { products } = useDashboard();
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustType, setAdjustType] = useState("in"); // "in" or "out"
  const [adjustNotes, setAdjustNotes] = useState("Restok dari Konveksi");

  const [mutations, setMutations] = useState([
    {
      id: "MUT-901",
      product: "Kain Batik Tulis Solo",
      type: "in",
      qty: 25,
      notes: "Penerimaan Barang Jadi dari Penjahit Solo",
      date: "29 Agu 2026, 11:30",
      staff: "Rian SPV",
    },
    {
      id: "MUT-902",
      product: "Kemeja Batik Sutra Halus",
      type: "out",
      qty: 2,
      notes: "Penjualan WhatsApp Order #ORD-8801",
      date: "29 Agu 2026, 17:42",
      staff: "Bot AI CS (Auto)",
    },
    {
      id: "MUT-903",
      product: "Gamis Silk Exclusive",
      type: "out",
      qty: 1,
      notes: "Sample Fitting Pelanggan VIP",
      date: "28 Agu 2026, 14:00",
      staff: "Sarah Amalia",
    },
  ]);

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    const newMut = {
      id: `MUT-${Date.now().toString().slice(-3)}`,
      product: selectedProduct?.name || "Kain Batik",
      type: adjustType,
      qty: Number(adjustQty),
      notes: adjustNotes,
      date: "Baru saja",
      staff: "Supervisor",
    };
    setMutations([newMut, ...mutations]);
    setShowAdjustModal(false);
    alert("Mutasi penyesuaian stok fisik berhasil dicatat!");
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

        <button
          type="button"
          onClick={() => {
            setSelectedProduct(products[0]);
            setShowAdjustModal(true);
          }}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <SlidersIcon className="w-4 h-4" />
          <span>+ Catat Mutasi / Stok Masuk</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Unit Persediaan</div>
          <div className="text-[28px] font-extrabold text-[#1e2640]">438 Pcs</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Nilai Aset: Rp 148.5 Jt</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Stok Menipis (&lt;10 Pcs)</div>
          <div className="text-[28px] font-extrabold text-amber-600">2 Produk</div>
          <span className="text-[11.5px] font-bold text-amber-600">Perlu Restok Konveksi</span>
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
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Produk & Kategori</th>
                <th>SKU Kode</th>
                <th>Harga Jual</th>
                <th>Sisa Stok Fisik</th>
                <th>Status Ketersediaan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13.5px]">{p.name}</div>
                    <div className="text-[11px] text-[#8f95a8]">{p.category}</div>
                  </td>
                  <td>
                    <span className="font-mono font-bold text-[#5a6380] text-[12.5px]">{p.sku || `SKU-${p.id}`}</span>
                  </td>
                  <td>
                    <span className="font-extrabold text-[#1e2640] text-[13px]">
                      Rp {p.price.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td>
                    <div className="font-extrabold text-[15px] text-[#2545ff]">{p.stock} Pcs</div>
                  </td>
                  <td>
                    {p.stock > 20 ? (
                      <span className="badge badge-success text-[11px]">Stok Aman</span>
                    ) : p.stock > 0 ? (
                      <span className="badge badge-warning text-[11px]">Hampir Habis</span>
                    ) : (
                      <span className="badge badge-danger text-[11px]">Habis (Out of Stock)</span>
                    )}
                  </td>
                  <td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mutations Log */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Riwayat Mutasi Keluar/Masuk Barang</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID Mutasi & Produk</th>
                <th>Jenis & Jumlah</th>
                <th>Keterangan / Alasan</th>
                <th>Waktu & Penanggungjawab</th>
              </tr>
            </thead>
            <tbody>
              {mutations.map((m) => (
                <tr key={m.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13px]">{m.product}</div>
                    <div className="text-[11px] text-[#8f95a8] font-mono">{m.id}</div>
                  </td>
                  <td>
                    <span
                      className={`font-extrabold text-[13px] px-2 py-0.5 rounded-full ${
                        m.type === "in"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {m.type === "in" ? `+${m.qty} Pcs (Masuk)` : `-${m.qty} Pcs (Keluar)`}
                    </span>
                  </td>
                  <td>
                    <span className="text-[12.5px] text-[#5a6380]">{m.notes}</span>
                  </td>
                  <td>
                    <div className="text-[12px] font-bold text-[#1e2640]">{m.date}</div>
                    <div className="text-[11px] text-[#8f95a8]">Oleh: {m.staff}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Adjust Stock */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Penyesuaian Mutasi Stok</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Pilih Produk</label>
                <select
                  value={selectedProduct?.id}
                  onChange={(e) => setSelectedProduct(products.find((p) => p.id === e.target.value))}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Sisa: {p.stock} Pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1e2640] block mb-1">Arah Mutasi</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                  >
                    <option value="in">+ Stok Masuk (Restok)</option>
                    <option value="out">- Stok Keluar (Penjualan / Retur)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1e2640] block mb-1">Jumlah Unit (Pcs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Keterangan / No. Surat Jalan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penerimaan 50 Pcs dari Konveksi Solo"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
