"use client";
import React, { useState, useEffect } from "react";
import { generateAiHppBreakdown } from "@/utils/aiHppCalculator";
import {
  SparklesIcon,
  DollarSignIcon,
  TrendingUpIcon,
  PackageIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SlidersIcon,
  XIcon,
  ShoppingBagIcon,
  FileTextIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export default function AiHppModal({
  isOpen,
  onClose,
  product = null,
  onApplyHpp, // (updatedHpp, updatedPrice, bomRecipe) => void
}) {
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Kuliner & F&B");
  const [sellingPrice, setSellingPrice] = useState(25000);
  const [targetMargin, setTargetMargin] = useState(52);
  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState("breakdown"); // 'breakdown' | 'simulator' | 'ai_insights'
  const [aiReport, setAiReport] = useState(null);

  // Sync state with incoming product prop
  useEffect(() => {
    if (isOpen) {
      const name = product?.name || "Ayam Geprek Sambal Korek";
      const cat = product?.category || "Makanan Utama";
      const price = Number(product?.price) || 22000;
      const hpp = Number(product?.hpp) || 0;

      setProductName(name);
      setProductCategory(cat);
      setSellingPrice(price);

      const report = generateAiHppBreakdown({
        name,
        category: cat,
        currentPrice: price,
        currentHpp: hpp,
        targetMargin: 50,
      });

      setMaterials(report.materials);
      setAiReport(report);
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  // Recalculate HPP when materials, price, or target margin changes
  const totalHpp = materials.reduce((acc, m) => acc + (Number(m.unitCost) || 0), 0);
  const grossProfit = sellingPrice - totalHpp;
  const actualGrossMarginPercent = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0;
  const foodCostRatio = sellingPrice > 0 ? Math.round((totalHpp / sellingPrice) * 100) : 0;
  const recommendedPrice = Math.ceil((totalHpp / (1 - targetMargin / 100)) / 1000) * 1000;

  // Handle regenerating AI breakdown
  const handleRegenerate = () => {
    const report = generateAiHppBreakdown({
      name: productName,
      category: productCategory,
      currentPrice: sellingPrice,
      currentHpp: totalHpp,
      targetMargin,
    });
    setMaterials(report.materials);
    setAiReport(report);
  };

  // Material item handlers
  const handleUpdateMaterial = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = field === "unitCost" ? Number(value) || 0 : value;
    setMaterials(updated);
  };

  const handleAddMaterial = () => {
    setMaterials([
      ...materials,
      {
        name: "Komponen Tambahan",
        qty: "1 porsi",
        unitCost: 1000,
        category: "Bahan Tambahan",
      },
    ]);
  };

  const handleDeleteMaterial = (index) => {
    setMaterials(materials.filter((_, idx) => idx !== index));
  };

  const handleApply = () => {
    if (onApplyHpp && typeof onApplyHpp === "function") {
      onApplyHpp(totalHpp, sellingPrice, {
        finishedProduct: productName,
        totalHppCost: totalHpp,
        sellingPrice,
        marginPercent: `${actualGrossMarginPercent}%`,
        materials,
      });
    }
    alert(`Sukses menerapkan HPP Rp ${totalHpp.toLocaleString("id-ID")} dan Harga Rp ${sellingPrice.toLocaleString("id-ID")} ke produk!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0c1754]/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#ede8e2] w-[96vw] max-w-[1180px] h-[90vh] flex flex-col overflow-hidden animate-scale-pop">
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-[#ede8e2] bg-[#fcfbf9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
              <DollarSignIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17.5px] font-black text-[#0c1754]">
                  Klozer AI Smart HPP & Margin Studio
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3 text-purple-600" />
                  <span>AI Costing Engine</span>
                </span>
              </div>
              <p className="text-[12px] text-[#64748b]">
                Kalkulasi otomatis resep bahan baku (BOM), estimasi food cost ratio, dan optimasi harga jual multi-channel.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-[#eaebf8] text-[#64748b] hover:text-[#2545ff] flex items-center justify-center border border-[#ede8e2] cursor-pointer transition-all shadow-xs"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Product Search & Quick AI Generate Bar */}
        <div className="p-4 px-6 bg-white border-b border-[#ede8e2] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-wider block mb-1">
                Nama Menu / Produk
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Paket Ayam Geprek Mozzarella"
                className="w-full px-3.5 py-2 rounded-xl border border-[#ede8e2] text-[13px] font-bold text-[#0c1754] outline-none focus:border-[#2545ff] bg-[#fcfbf9]"
              />
            </div>

            <div className="w-48">
              <label className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-wider block mb-1">
                Kategori
              </label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#ede8e2] text-[13px] font-bold text-[#0c1754] outline-none focus:border-[#2545ff] bg-[#fcfbf9]"
              >
                <option value="Kuliner & F&B">Kuliner & F&B</option>
                <option value="Minuman Segar">Minuman Segar</option>
                <option value="Fashion & Pakaian">Fashion & Pakaian</option>
                <option value="Skincare & Beauty">Skincare & Beauty</option>
                <option value="Retail & Umum">Retail & Umum</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerate}
            className="px-4.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[13px] font-extrabold flex items-center gap-2 cursor-pointer shadow-sm border-none transition-all self-end md:self-auto"
          >
            <SparklesIcon className="w-4 h-4 text-purple-200" />
            <span>Generate Resep HPP AI</span>
          </button>
        </div>

        {/* Top Summary Metrics Strip */}
        <div className="p-4 px-6 bg-[#fbfaf8] border-b border-[#ede8e2] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {/* Card 1: Total HPP */}
          <div className="p-3 bg-white rounded-2xl border border-[#ede8e2] shadow-2xs">
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748b]">Total HPP (Modal)</div>
            <div className="text-[20px] font-black text-amber-700">
              Rp {totalHpp.toLocaleString("id-ID")}
            </div>
            <span className="text-[11px] font-bold text-[#8f95a8]">
              {materials.length} komponen bahan
            </span>
          </div>

          {/* Card 2: Harga Jual Aktif */}
          <div className="p-3 bg-white rounded-2xl border border-[#ede8e2] shadow-2xs">
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748b]">Harga Jual Toko</div>
            <div className="flex items-center gap-1 text-[20px] font-black text-[#0c1754]">
              <span>Rp</span>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                className="w-28 border-b border-[#2545ff] font-black text-[#0c1754] outline-none bg-transparent"
              />
            </div>
            <span className="text-[11px] font-bold text-emerald-600">
              Laba Bersih: Rp {grossProfit.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Card 3: Gross Profit Margin */}
          <div className="p-3 bg-white rounded-2xl border border-[#ede8e2] shadow-2xs">
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748b]">Gross Profit Margin</div>
            <div className={`text-[20px] font-black ${actualGrossMarginPercent >= 50 ? "text-emerald-700" : "text-amber-700"}`}>
              {actualGrossMarginPercent}%
            </div>
            <span className="text-[11px] font-bold text-[#64748b]">
              Target: {targetMargin}%
            </span>
          </div>

          {/* Card 4: Food Cost Ratio Health */}
          <div className="p-3 bg-white rounded-2xl border border-[#ede8e2] shadow-2xs">
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748b]">Food Cost Ratio</div>
            <div className={`text-[20px] font-black ${foodCostRatio <= 48 ? "text-emerald-700" : "text-rose-700"}`}>
              {foodCostRatio}%
            </div>
            <span className={`text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${
              foodCostRatio <= 48 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {foodCostRatio <= 48 ? (
                <>
                  <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                  <span>Sangat Sehat</span>
                </>
              ) : (
                <>
                  <AlertTriangleIcon className="w-3 h-3 text-rose-600" />
                  <span>Perlu Evaluasi</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#ede8e2] px-6 pt-2.5 bg-[#fcfbf9] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("breakdown")}
            className={`pb-3 px-4 text-[13px] font-black border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "breakdown"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-[#64748b] hover:text-[#1e2640]"
            }`}
          >
            <PackageIcon className="w-4 h-4" />
            <span>1. Rincian Bahan Baku & Resep ({materials.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`pb-3 px-4 text-[13px] font-black border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "simulator"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-[#64748b] hover:text-[#1e2640]"
            }`}
          >
            <SlidersIcon className="w-4 h-4" />
            <span>2. Simulator Margin & Marketplace Fee</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai_insights")}
            className={`pb-3 px-4 text-[13px] font-black border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "ai_insights"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-[#64748b] hover:text-[#1e2640]"
            }`}
          >
            <SparklesIcon className="w-4 h-4 text-purple-600" />
            <span>3. Rekomendasi & Strategi AI</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ==================== TAB 1: INGREDIENT BREAKDOWN TABLE ==================== */}
          {activeTab === "breakdown" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-black text-[#0c1754]">
                    Komposisi Bahan Pokok & Kemasan Produk
                  </h4>
                  <p className="text-[12px] text-[#64748b]">
                    Sesuaikan harga satuan atau takaran per porsi secara real-time.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-3.5 py-1.5 bg-white hover:bg-[#eaebf8] text-[#2545ff] rounded-xl text-[12.5px] font-extrabold flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-2xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>+ Tambah Komponen Bahan</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-[#ede8e2] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b] font-black text-[11.5px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Komponen / Bahan</th>
                      <th className="py-3 px-4">Kategori Biaya</th>
                      <th className="py-3 px-4">Takaran / Porsi</th>
                      <th className="py-3 px-4 text-right">Biaya per Porsi (Rp)</th>
                      <th className="py-3 px-4 text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {materials.map((mat, idx) => (
                      <tr key={idx} className="hover:bg-[#fcfbf9]">
                        <td className="py-2.5 px-4 text-center font-bold text-[#94a3b8]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={mat.name}
                            onChange={(e) => handleUpdateMaterial(idx, "name", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[#cbd5e1] focus:border-[#2545ff] font-bold text-[#0c1754] text-[13px] outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={mat.category}
                            onChange={(e) => handleUpdateMaterial(idx, "category", e.target.value)}
                            className="px-2 py-1 rounded-lg border border-[#e2e8f0] text-[12px] font-bold text-[#475569] bg-[#f8fafc] outline-none"
                          >
                            <option value="Bahan Utama">Bahan Utama</option>
                            <option value="Bumbu & Sambal">Bumbu & Sambal</option>
                            <option value="Bahan Pokok">Bahan Pokok</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Overhead / Gas">Overhead / Gas</option>
                            <option value="Tenaga Kerja">Tenaga Kerja</option>
                            <option value="Bahan Tambahan">Bahan Tambahan</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={mat.qty}
                            onChange={(e) => handleUpdateMaterial(idx, "qty", e.target.value)}
                            className="w-24 px-2 py-1.5 rounded-lg border border-[#e2e8f0] font-semibold text-[#475569] text-[12.5px] outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <input
                            type="number"
                            value={mat.unitCost}
                            onChange={(e) => handleUpdateMaterial(idx, "unitCost", e.target.value)}
                            className="w-28 px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] focus:border-[#2545ff] font-black text-amber-800 text-[13px] text-right outline-none bg-amber-50/40"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(idx)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-[#94a3b8] hover:text-rose-600 flex items-center justify-center border border-transparent hover:border-rose-200 cursor-pointer transition-all"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#fefce8] border-t-2 border-amber-200 font-black text-[13.5px]">
                    <tr>
                      <td colSpan={4} className="py-3 px-6 text-amber-950">
                        TOTAL HPP MODAL PRODUKSI PER PORSI:
                      </td>
                      <td className="py-3 px-4 text-right text-amber-900 text-[16px]">
                        Rp {totalHpp.toLocaleString("id-ID")}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: MARGIN & MARKETPLACE SIMULATOR ==================== */}
          {activeTab === "simulator" && (
            <div className="flex flex-col gap-6">
              {/* Target Margin Slider */}
              <div className="p-5 bg-white rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-black text-[#0c1754]">
                      Simulator Target Margin Laba Kotor
                    </h4>
                    <p className="text-[12px] text-[#64748b]">
                      Geser target margin untuk mendapatkan rekomendasi harga jual otomatis dari AI.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[22px] font-black text-[#2545ff]">{targetMargin}%</span>
                    <span className="text-[11.5px] font-bold text-[#64748b] block">
                      Harga Rekomendasi: <strong>Rp {recommendedPrice.toLocaleString("id-ID")}</strong>
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={30}
                  max={80}
                  step={1}
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full h-2 bg-[#e2e8f0] rounded-lg appearance-none cursor-pointer accent-[#2545ff]"
                />

                <div className="flex justify-between text-[11px] font-bold text-[#94a3b8]">
                  <span>30% (Low Margin / Grosir)</span>
                  <span>50% (Standar Retail & Kuliner)</span>
                  <span>70% (Premium / Minuman / Skincare)</span>
                </div>
              </div>

              {/* Multi-Channel Comparison Table */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[14px] font-black text-[#0c1754]">
                  Simulasi Profit Laba Bersih per Kanal Penjualan
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiReport?.channelSimulations?.map((ch, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-[#2545ff] border border-blue-100 inline-block mb-2">
                          {ch.channel}
                        </span>
                        <div className="text-[20px] font-black text-[#0c1754] mb-1">
                          Rp {ch.suggestedPrice.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[12px] text-[#64748b] mb-3">
                          Laba Bersih: <strong className="text-emerald-700 font-black">Rp {ch.netProfit.toLocaleString("id-ID")}</strong> ({ch.netMarginPercent}%)
                        </div>
                      </div>
                      <div className="text-[11.5px] text-[#8f95a8] border-t border-[#f1f5f9] pt-2 flex items-start gap-1.5">
                        <SparklesIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{ch.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: AI INSIGHTS & STRATEGY ==================== */}
          {activeTab === "ai_insights" && (
            <div className="flex flex-col gap-4">
              <div className="p-5 bg-purple-50 rounded-2xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                  <h4 className="font-black text-purple-950 text-[15px]">
                    Analisis Strategi HPP & Harga dari Klozer AI
                  </h4>
                </div>
                <p className="text-[13px] text-purple-900 leading-relaxed">
                  {aiReport?.tips}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-[#ede8e2] shadow-xs">
                  <h5 className="font-black text-[#0c1754] text-[13.5px] mb-1.5 flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                    <span>Strategi Upselling Menu F&B</span>
                  </h5>
                  <p className="text-[12.5px] text-[#64748b] leading-relaxed">
                    Produk utama seperti ayam geprek memiliki food cost 45-50%. Untuk memaksimalkan profit, latih bot WhatsApp atau CS untuk selalu menawarkan menu pendamping berkadar laba tinggi (*Es Teh Manis Jumbo*, *Kulit Crispy*, *Tahu Tempe*).
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#ede8e2] shadow-xs">
                  <h5 className="font-black text-[#0c1754] text-[13.5px] mb-1.5 flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                    <span>Pengendalian Waste & Fluktuasi Bahan</span>
                  </h5>
                  <p className="text-[12.5px] text-[#64748b] leading-relaxed">
                    Cabai rawit dan minyak goreng rentan terhadap fluktuasi harga pasar harian. Pantau stok opname mingguan di menu <strong>Manajemen Stok</strong> untuk mencegah kebocoran margin di dapur.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4.5 px-6 border-t border-[#ede8e2] bg-[#fcfbf9] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-[13px] font-extrabold text-[#64748b] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13.5px] font-black flex items-center gap-2 cursor-pointer shadow-md border-none transition-all"
            >
              <CheckCircleIcon className="w-4 h-4 text-white" />
              <span>
                Terapkan HPP (Rp {totalHpp.toLocaleString("id-ID")}) & Harga ke Toko
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
