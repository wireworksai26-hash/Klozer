"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { AlertTriangleIcon, CheckCircleIcon, TagIcon, XIcon, DownloadIcon, UploadIcon, SparklesIcon, DollarSignIcon } from "@/components/icons";
import DataTransferModal from "@/components/common/DataTransferModal";
import AiHppModal from "@/components/common/AiHppModal";

export default function ProductsPage() {
  const { products, addProduct, updateProduct, toggleProductStatus, deleteProduct, importProducts } = useDashboard();

  const [view, setView] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHppModal, setShowHppModal] = useState(false);
  const [selectedHppProduct, setSelectedHppProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "Pakaian Pria",
    price: 150000,
    hpp: 85000,
    stock: 20,
    lowStock: 10,
    variants: "M, L, XL",
    active: true,
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      sku: `KLZ-${Math.floor(100 + Math.random() * 900)}`,
      category: "Pakaian Pria",
      price: 150000,
      hpp: 85000,
      stock: 20,
      lowStock: 10,
      variants: "M, L, XL",
      active: true,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (prd) => {
    setEditingProduct(prd);
    setFormData({
      name: prd.name,
      sku: prd.sku,
      category: prd.category,
      price: prd.price,
      hpp: prd.hpp,
      stock: prd.stock,
      lowStock: prd.lowStock,
      variants: prd.variants.join(", "),
      active: prd.active,
    });
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      price: Number(formData.price),
      hpp: Number(formData.hpp),
      stock: Number(formData.stock),
      lowStock: Number(formData.lowStock),
      variants: formData.variants.split(",").map((v) => v.trim()).filter(Boolean),
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
      setEditingProduct(null);
    } else {
      addProduct(payload);
      setShowAddModal(false);
    }
  };

  const handleQuickStock = (id, currentStock, delta) => {
    const nextStock = Math.max(0, currentStock + delta);
    updateProduct(id, { stock: nextStock });
  };

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">Master Data Produk</h1>
          <p className="text-[13.5px] text-[#64748b]">Kelola stok gudang, harga jual, HPP, dan sinkronisasi katalog WhatsApp otomatis.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#f0e9e1] shadow-xs">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer transition-all ${
                view === "grid" ? "bg-[#2545ff] text-white shadow-xs" : "bg-transparent text-[#64748b]"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border-none cursor-pointer transition-all ${
                view === "table" ? "bg-[#2545ff] text-white shadow-xs" : "bg-transparent text-[#64748b]"
              }`}
            >
              Tabel
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-[#1e2640] hover:text-emerald-700 border border-[#ede8e2] rounded-xl text-[13px] font-extrabold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <UploadIcon className="w-4 h-4 text-emerald-600" />
            <span>Impor / Ekspor Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2"
          >
            <span>+</span>
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#f0e9e1] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-3.5 py-2 w-full sm:w-[320px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#969696" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Cari nama produk, kode SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] text-[#0c1754] placeholder:text-[#969696] flex-1 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[12px] font-bold text-[#64748b] whitespace-nowrap">Kategori:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                categoryFilter === cat
                  ? "bg-[#2545ff] text-white border-[#2545ff]"
                  : "bg-[#f9f8f6] text-[#64748b] border-[#f0e9e1] hover:bg-white"
              }`}
            >
              {cat === "all" ? "Semua" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID VIEW */}
      {view === "grid" ? (
        filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-[#f0e9e1] shadow-xs text-center">
            <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-3">
                <TagIcon className="w-6 h-6 text-[#2545ff]" />
              </div>
              <div className="font-extrabold text-[#0c1754] text-[15px]">Katalog Produk Masih Kosong</div>
              <p className="text-[12.5px] text-[#64748b] mt-1 mb-4">
                Tambahkan produk atau paket layanan pertama bisnis Anda untuk mulai melayani penjualan otomatis via WhatsApp.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="btn-primary !py-2 !px-4 text-[12.5px] font-bold"
              >
                + Tambah Produk Pertama
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p) => {
              const isLow = (p.stock || 0) <= (p.lowStock || 5);
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl p-5 border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] flex flex-col justify-between hover:shadow-md transition-all ${
                    !p.active ? "opacity-60 bg-gray-50/80" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[11px] font-bold text-[#2545ff] bg-[#eaebf8] px-2 py-0.5 rounded">
                        {p.sku}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          p.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {p.active ? "Aktif di WA" : "Nonaktif"}
                      </span>
                    </div>

                    <h4 className="text-[15px] font-bold text-[#0c1754] leading-snug mb-1">{p.name}</h4>
                    <span className="text-[12px] text-[#969696] font-medium block mb-3">{p.category}</span>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-[17px] font-extrabold text-[#0c1754]">Rp {p.price.toLocaleString()}</span>
                      <span className="text-[11.5px] text-[#64748b]">HPP: Rp {p.hpp.toLocaleString()}</span>
                    </div>

                    {/* Stock Meter */}
                    <div className="bg-[#f9f8f6] p-2.5 rounded-xl border border-[#f0e9e1] flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[11px] text-[#969696] block">Sisa Stok:</span>
                        <span className={`text-[13px] font-extrabold ${isLow ? "text-red-600" : "text-[#0c1754]"}`}>
                          {p.stock} pcs {isLow && "(Kritis!)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuickStock(p.id, p.stock, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#f0e9e1] hover:bg-red-50 hover:text-red-600 font-bold text-[14px] flex items-center justify-center cursor-pointer transition-colors"
                          title="Kurangi stok (-1)"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleQuickStock(p.id, p.stock, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#f0e9e1] hover:bg-emerald-50 hover:text-emerald-600 font-bold text-[14px] flex items-center justify-center cursor-pointer transition-colors"
                          title="Tambah stok (+1)"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[#f0e9e1]">
                    <button
                      onClick={() => {
                        setSelectedHppProduct(p);
                        setShowHppModal(true);
                      }}
                      className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[11px] rounded-lg transition-colors border border-amber-200 cursor-pointer flex items-center gap-1 shrink-0"
                      title="Kalkulasi Resep & HPP via AI"
                    >
                      <SparklesIcon className="w-3 h-3 text-amber-600" />
                      <span>AI HPP</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 py-1.5 px-3 bg-[#eaebf8] hover:bg-[#2545ff] hover:text-white text-[#2545ff] font-bold text-[12px] rounded-lg transition-colors border-none cursor-pointer text-center"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg transition-colors border-none cursor-pointer"
                      title="Hapus Produk"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">SKU & Produk</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Kategori</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Harga Jual</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">HPP</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Stok Gudang</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b]">Status WA</th>
                  <th className="py-3.5 px-5 text-[12px] font-bold uppercase text-[#64748b] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9e1] text-[13.5px]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-3">
                          <TagIcon className="w-6 h-6 text-[#2545ff]" />
                        </div>
                        <div className="font-extrabold text-[#0c1754] text-[15px]">Katalog Produk Masih Kosong</div>
                        <p className="text-[12.5px] text-[#64748b] mt-1 mb-4">
                          Tambahkan produk atau paket layanan pertama bisnis Anda untuk mulai melayani penjualan.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="btn-primary !py-2 !px-4 text-[12.5px] font-bold"
                        >
                          + Tambah Produk Pertama
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#0c1754] text-[14px]">{p.name}</div>
                        <span className="font-mono text-[11px] font-bold text-[#2545ff]">{p.sku}</span>
                      </td>
                      <td className="py-4 px-5 text-[#64748b] font-medium">{p.category}</td>
                      <td className="py-4 px-5 font-bold text-[#0c1754]">Rp {p.price.toLocaleString()}</td>
                      <td className="py-4 px-5 text-[#64748b]">Rp {p.hpp.toLocaleString()}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${(p.stock || 0) <= (p.lowStock || 5) ? "text-red-600" : "text-[#0c1754]"}`}>
                            {p.stock} pcs
                          </span>
                          <button
                            onClick={() => handleQuickStock(p.id, p.stock, 1)}
                            className="w-6 h-6 rounded bg-[#f9f8f6] hover:bg-[#eaebf8] text-[#2545ff] font-bold text-[12px] border border-[#f0e9e1] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <button
                          type="button"
                          onClick={() => toggleProductStatus(p.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border-none cursor-pointer ${
                            p.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {p.active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHppProduct(p);
                              setShowHppModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-extrabold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Kalkulasi Resep & HPP via AI"
                          >
                            <SparklesIcon className="w-3 h-3 text-amber-600" />
                            <span>AI HPP</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="px-2.5 py-1 text-[12px] font-bold text-[#2545ff] bg-[#eaebf8] hover:bg-[#2545ff] hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="px-2.5 py-1 text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Product */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#f0e9e1] animate-scale-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
              <h3 className="text-[18px] font-extrabold text-[#0c1754]">
                {editingProduct ? "Edit Master Produk" : "Tambah Produk Baru"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="w-7 h-7 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] flex items-center justify-center text-[#64748b] border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kemeja Batik Lengan Panjang"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Kode SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="Pakaian Pria">Pakaian Pria</option>
                    <option value="Pakaian Wanita">Pakaian Wanita</option>
                    <option value="Skincare">Skincare & Beauty</option>
                    <option value="F&B">F&B & Kuliner</option>
                    <option value="Aksesoris">Aksesoris</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#0c1754]">HPP Modal (Rp)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHppProduct({
                          name: formData.name || "Ayam Geprek",
                          category: formData.category,
                          price: Number(formData.price) || 25000,
                          hpp: Number(formData.hpp) || 0,
                        });
                        setShowHppModal(true);
                      }}
                      className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10.5px] font-extrabold rounded-lg flex items-center gap-1 border border-purple-200 cursor-pointer transition-all"
                    >
                      <SparklesIcon className="w-3.5 h-3.5 text-purple-600" />
                      <span>Hitung via AI</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    value={formData.hpp}
                    onChange={(e) => setFormData({ ...formData, hpp: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Jumlah Stok Saat Ini</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Peringatan Stok Kritis (&le;)</label>
                  <input
                    type="number"
                    required
                    value={formData.lowStock}
                    onChange={(e) => setFormData({ ...formData, lowStock: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Varian Produk (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  placeholder="Contoh: S, M, L, XL"
                  value={formData.variants}
                  onChange={(e) => setFormData({ ...formData, variants: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f0e9e1] mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                  }}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  {editingProduct ? "Simpan Perubahan" : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[380px] p-5 shadow-2xl border border-[#f0e9e1] animate-scale-pop text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-[17px] font-extrabold text-[#0c1754] mb-1.5">Hapus Produk Ini?</h3>
            <p className="text-[13px] text-[#64748b] mb-5">
              Produk akan dihapus dari katalog bot WhatsApp dan inventaris gudang.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-outline !py-2 !px-4 text-[13px]"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteProduct(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] border-none cursor-pointer shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Transfer Modal (Import / Export CSV) */}
      <DataTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        type="products"
        data={products}
        onImportSuccess={(newItems, mode) => importProducts(newItems, mode)}
      />

      {/* AI HPP & Margin Intelligence Modal */}
      <AiHppModal
        isOpen={showHppModal}
        onClose={() => {
          setShowHppModal(false);
          setSelectedHppProduct(null);
        }}
        product={selectedHppProduct}
        onApplyHpp={(newHpp, newPrice) => {
          if (showAddModal || editingProduct) {
            setFormData((prev) => ({
              ...prev,
              hpp: newHpp,
              price: newPrice,
            }));
          } else if (selectedHppProduct?.id) {
            updateProduct(selectedHppProduct.id, {
              hpp: newHpp,
              price: newPrice,
            });
          }
        }}
      />

    </div>
  );
}
