"use client";
import React, { useState, useEffect } from "react";
import { generateAiHppBreakdown } from "@/utils/aiHppCalculator";
import { useDashboard } from "@/context/DashboardContext";
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
  const { t, language } = useDashboard();
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
      // Re-seeding the form whenever the modal opens for a product.
      /* eslint-disable react-hooks/set-state-in-effect */
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
        lang: language,
      });

      setMaterials(report.materials);
      setAiReport(report);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    // Re-seed only when the modal opens for a product, not when the language toggles mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      lang: language,
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
    alert(t("Sukses menerapkan HPP Rp {hpp} dan Harga Rp {price} ke produk!", { hpp: totalHpp.toLocaleString("id-ID"), price: sellingPrice.toLocaleString("id-ID") }));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl border border-line w-[96vw] max-w-[1180px] h-[90vh] flex flex-col overflow-hidden animate-scale-pop">
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-line bg-soft flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-warning-100 text-warning-800 flex items-center justify-center font-bold shadow-xs">
              <DollarSignIcon className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="card-title">
                  {t("Kalkulator HPP & Margin")}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-accent-100 text-accent-700 border border-accent-200 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3 text-accent-600" />
                  <span>{t("Template Estimasi")}</span>
                </span>
              </div>
              <p className="text-label text-fg-muted">
                {t("Kalkulasi otomatis resep bahan baku (BOM), estimasi food cost ratio, dan optimasi harga jual multi-channel.")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-brand-soft text-fg-muted hover:text-brand flex items-center justify-center border border-line cursor-pointer transition-all shadow-xs"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3.5 rounded-xl bg-warning-50 border border-warning-200 text-warning-900 text-body-sm font-medium">
          {t("Angka bahan di sini adalah")} <strong>{t("template estimasi umum")}</strong>{t(", bukan harga belanja Anda. Ubah setiap bahan sesuai harga sebenarnya sebelum menerapkan HPP ke produk.")}
        </div>

        {/* Product Search & Quick Template Bar */}
        <div className="p-4 px-6 bg-white border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex-1">
              <label className="text-caption font-bold text-fg-muted uppercase tracking-wider block mb-1">
                {t("Nama Menu / Produk")}
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={t("Contoh: Paket Ayam Geprek Mozzarella")}
                className="w-full px-3.5 py-2 rounded-xl border border-line text-body-sm font-bold text-ink outline-none focus:border-brand bg-soft"
              />
            </div>

            <div className="w-48">
              <label className="text-caption font-bold text-fg-muted uppercase tracking-wider block mb-1">
                {t("Kategori")}
              </label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line text-body-sm font-bold text-ink outline-none focus:border-brand bg-soft"
              >
                <option value="Kuliner & F&B">{t("Kuliner & F&B")}</option>
                <option value="Minuman Segar">{t("Minuman Segar")}</option>
                <option value="Fashion & Pakaian">{t("Fashion & Pakaian")}</option>
                <option value="Skincare & Beauty">Skincare & Beauty</option>
                <option value="Retail & Umum">{t("Retail & Umum")}</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerate}
            className="px-4.5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-body-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm border-none transition-all self-end md:self-auto"
          >
            <SparklesIcon className="w-4 h-4 text-accent-200" />
            <span>{t("Muat Ulang Template Resep")}</span>
          </button>
        </div>

        {/* Top Summary Metrics Strip */}
        <div className="p-4 px-6 bg-soft border-b border-line grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {/* Card 1: Total HPP */}
          <div className="p-3 bg-white rounded-2xl border border-line shadow-2xs">
            <div className="text-micro font-bold uppercase tracking-wider text-fg-muted">{t("Total HPP (Modal)")}</div>
            <div className="text-subheading font-bold text-warning-700">
              Rp {totalHpp.toLocaleString("id-ID")}
            </div>
            <span className="text-caption font-bold text-fg-subtle">
              {materials.length} {t("komponen bahan")}
            </span>
          </div>

          {/* Card 2: Harga Jual Aktif */}
          <div className="p-3 bg-white rounded-2xl border border-line shadow-2xs">
            <div className="text-micro font-bold uppercase tracking-wider text-fg-muted">{t("Harga Jual Toko")}</div>
            <div className="flex items-center gap-1 text-subheading font-bold text-ink">
              <span>Rp</span>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                className="w-28 border-b border-brand font-bold text-ink outline-none bg-transparent"
              />
            </div>
            <span className="text-caption font-bold text-success-600">
              {t("Laba Bersih:")} Rp {grossProfit.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Card 3: Gross Profit Margin */}
          <div className="p-3 bg-white rounded-2xl border border-line shadow-2xs">
            <div className="text-micro font-bold uppercase tracking-wider text-fg-muted">{t("Gross Profit Margin")}</div>
            <div className={`text-subheading font-bold ${actualGrossMarginPercent >= 50 ? "text-success-700" : "text-warning-700"}`}>
              {actualGrossMarginPercent}%
            </div>
            <span className="text-caption font-bold text-fg-muted">
              Target: {targetMargin}%
            </span>
          </div>

          {/* Card 4: Food Cost Ratio Health */}
          <div className="p-3 bg-white rounded-2xl border border-line shadow-2xs">
            <div className="text-micro font-bold uppercase tracking-wider text-fg-muted">Food Cost Ratio</div>
            <div className={`text-subheading font-bold ${foodCostRatio <= 48 ? "text-success-700" : "text-danger-700"}`}>
              {foodCostRatio}%
            </div>
            <span className={`text-micro font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${
              foodCostRatio <= 48 ? "bg-success-100 text-success-800" : "bg-danger-100 text-danger-800"
            }`}>
              {foodCostRatio <= 48 ? (
                <>
                  <CheckCircleIcon className="w-3 h-3 text-success-600" />
                  <span>{t("Sangat Sehat")}</span>
                </>
              ) : (
                <>
                  <AlertTriangleIcon className="w-3 h-3 text-danger-600" />
                  <span>{t("Perlu Evaluasi")}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-line px-6 pt-2.5 bg-soft shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("breakdown")}
            className={`pb-3 px-4 text-body-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "breakdown"
                ? "border-warning-600 text-warning-800"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            <PackageIcon className="w-4 h-4" />
            <span>{t("1. Rincian Bahan Baku & Resep ({count})", { count: materials.length })}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`pb-3 px-4 text-body-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "simulator"
                ? "border-warning-600 text-warning-800"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            <SlidersIcon className="w-4 h-4" />
            <span>{t("2. Simulator Margin & Marketplace Fee")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai_insights")}
            className={`pb-3 px-4 text-body-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "ai_insights"
                ? "border-warning-600 text-warning-800"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            <SparklesIcon className="w-4 h-4 text-accent-600" />
            <span>{t("3. Saran Harga & Margin")}</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ==================== TAB 1: INGREDIENT BREAKDOWN TABLE ==================== */}
          {activeTab === "breakdown" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-body-sm font-bold text-ink">
                    {t("Komposisi Bahan Pokok & Kemasan Produk")}
                  </h4>
                  <p className="text-label text-fg-muted">
                    {t("Sesuaikan harga satuan atau takaran per porsi secara real-time.")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-3.5 py-1.5 bg-white hover:bg-brand-soft text-brand rounded-xl text-label font-bold flex items-center gap-1.5 border border-brand/20 cursor-pointer shadow-2xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>{t("+ Tambah Komponen Bahan")}</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-body-sm">
                  <thead className="bg-soft border-b border-line text-fg-muted font-bold text-caption uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">{t("Nama Komponen / Bahan")}</th>
                      <th className="py-3 px-4">{t("Kategori Biaya")}</th>
                      <th className="py-3 px-4">{t("Takaran / Porsi")}</th>
                      <th className="py-3 px-4 text-right">{t("Biaya per Porsi (Rp)")}</th>
                      <th className="py-3 px-4 text-center w-16">{t("Aksi")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sunken">
                    {materials.map((mat, idx) => (
                      <tr key={idx} className="hover:bg-soft">
                        <td className="py-2.5 px-4 text-center font-bold text-fg-subtle">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={mat.name}
                            onChange={(e) => handleUpdateMaterial(idx, "name", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-line-strong focus:border-brand font-bold text-ink text-body-sm outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={mat.category}
                            onChange={(e) => handleUpdateMaterial(idx, "category", e.target.value)}
                            className="px-2 py-1 rounded-lg border border-line text-label font-bold text-fg-muted bg-soft outline-none"
                          >
                            <option value="Bahan Utama">{t("Bahan Utama")}</option>
                            <option value="Bumbu & Sambal">{t("Bumbu & Sambal")}</option>
                            <option value="Bahan Pokok">{t("Bahan Pokok")}</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Overhead / Gas">Overhead / Gas</option>
                            <option value="Tenaga Kerja">{t("Tenaga Kerja")}</option>
                            <option value="Bahan Tambahan">{t("Bahan Tambahan")}</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={mat.qty}
                            onChange={(e) => handleUpdateMaterial(idx, "qty", e.target.value)}
                            className="w-24 px-2 py-1.5 rounded-lg border border-line font-semibold text-fg-muted text-label outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <input
                            type="number"
                            value={mat.unitCost}
                            onChange={(e) => handleUpdateMaterial(idx, "unitCost", e.target.value)}
                            className="w-28 px-2.5 py-1.5 rounded-lg border border-line focus:border-brand font-bold text-warning-800 text-body-sm text-right outline-none bg-warning-50/40"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(idx)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-danger-50 text-fg-subtle hover:text-danger-600 flex items-center justify-center border border-transparent hover:border-danger-200 cursor-pointer transition-all"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-warning-50 border-t-2 border-warning-200 font-bold text-body-sm">
                    <tr>
                      <td colSpan={4} className="py-3 px-6 text-warning-900">
                        {t("TOTAL HPP MODAL PRODUKSI PER PORSI:")}
                      </td>
                      <td className="py-3 px-4 text-right text-warning-900 text-body">
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
              <div className="p-5 bg-white rounded-2xl border border-line shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-body-sm font-bold text-ink">
                      {t("Simulator Target Margin Laba Kotor")}
                    </h4>
                    <p className="text-label text-fg-muted">
                      {t("Geser target margin untuk melihat harga jual yang dibutuhkan.")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-subheading font-bold text-brand">{targetMargin}%</span>
                    <span className="text-caption font-bold text-fg-muted block">
                      {t("Harga Rekomendasi:")} <strong>Rp {recommendedPrice.toLocaleString("id-ID")}</strong>
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
                  className="w-full h-2 bg-line rounded-lg appearance-none cursor-pointer accent-brand"
                />

                <div className="flex justify-between text-caption font-bold text-fg-subtle">
                  <span>{t("30% (Low Margin / Grosir)")}</span>
                  <span>{t("50% (Standar Retail & Kuliner)")}</span>
                  <span>{t("70% (Premium / Minuman / Skincare)")}</span>
                </div>
              </div>

              {/* Multi-Channel Comparison Table */}
              <div className="flex flex-col gap-2">
                <h4 className="text-body-sm font-bold text-ink">
                  {t("Simulasi Profit Laba Bersih per Kanal Penjualan")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiReport?.channelSimulations?.map((ch, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-2xl border border-line shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-brand-soft/50 text-brand border border-brand/10 inline-block mb-2">
                          {ch.channel}
                        </span>
                        <div className="text-subheading font-bold text-ink mb-1">
                          Rp {ch.suggestedPrice.toLocaleString("id-ID")}
                        </div>
                        <div className="text-label text-fg-muted mb-3">
                          {t("Laba Bersih:")} <strong className="text-success-700 font-bold">Rp {ch.netProfit.toLocaleString("id-ID")}</strong> ({ch.netMarginPercent}%)
                        </div>
                      </div>
                      <div className="text-caption text-fg-subtle border-t border-sunken pt-2 flex items-start gap-1.5">
                        <SparklesIcon className="w-3.5 h-3.5 text-warning-500 shrink-0 mt-0.5" />
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
              <div className="p-5 bg-accent-50 rounded-2xl border border-accent-200">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-5 h-5 text-accent-600" />
                  <h4 className="font-bold text-accent-900 text-body">
                    {t("Saran Harga & Margin")}
                  </h4>
                </div>
                <p className="text-body-sm text-accent-900 leading-relaxed">
                  {aiReport?.tips}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-line shadow-xs">
                  <h5 className="font-bold text-ink text-body-sm mb-1.5 flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-warning-500" />
                    <span>{t("Strategi Upselling Menu F&B")}</span>
                  </h5>
                  <p className="text-label text-fg-muted leading-relaxed">
                    {t("Produk utama seperti ayam geprek memiliki food cost 45-50%. Untuk memaksimalkan profit, latih bot WhatsApp atau CS untuk selalu menawarkan menu pendamping berkadar laba tinggi (*Es Teh Manis Jumbo*, *Kulit Crispy*, *Tahu Tempe*).")}
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-line shadow-xs">
                  <h5 className="font-bold text-ink text-body-sm mb-1.5 flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4 text-accent-600" />
                    <span>{t("Pengendalian Waste & Fluktuasi Bahan")}</span>
                  </h5>
                  <p className="text-label text-fg-muted leading-relaxed">
                    {t("Cabai rawit dan minyak goreng rentan terhadap fluktuasi harga pasar harian. Pantau stok opname mingguan")} {t("di menu")} <strong>{t("Manajemen Stok")}</strong> {t("untuk mencegah kebocoran margin di dapur.")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4.5 px-6 border-t border-line bg-soft flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-body-sm font-bold text-fg-muted hover:bg-line rounded-xl border-none cursor-pointer"
          >
            {t("Tutup")}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2.5 bg-success-600 hover:bg-success-700 text-white rounded-xl text-body-sm font-bold flex items-center gap-2 cursor-pointer shadow-md border-none transition-all"
            >
              <CheckCircleIcon className="w-4 h-4 text-white" />
              <span>
                {t("Terapkan HPP (Rp {hpp}) & Harga ke Toko", { hpp: totalHpp.toLocaleString("id-ID") })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
