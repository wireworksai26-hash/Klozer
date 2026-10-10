"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  FileTextIcon,
  CrownIcon,
  CheckCircleIcon,
  PackageIcon,
  DollarSignIcon,
  SlidersIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import AiHppModal from "@/components/common/AiHppModal";

export default function SupervisorBomPage() {
  const { currentUser, activeInstitution, products, updateProduct } = useDashboard();
  const [boms, setBoms] = useState([]);

  const [showHppModal, setShowHppModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleApplyNewBom = (newHpp, newPrice, bomRecipe) => {
    const newEntry = {
      id: `BOM-0${boms.length + 1}`,
      finishedProduct: bomRecipe.finishedProduct || "Menu Baru",
      category: "Kuliner / F&B",
      batchSize: "1 Porsi",
      totalHppCost: newHpp,
      sellingPrice: newPrice,
      marginPercent: bomRecipe.marginPercent || "50%",
      materials: bomRecipe.materials || [],
    };

    setBoms((prev) => [newEntry, ...prev]);
  };

  const handleDeleteBom = (id) => {
    setBoms((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-caption font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1.5">
              <FileTextIcon className="w-3.5 h-3.5" />
              <span>Bill of Materials (BOM) & HPP</span>
            </span>
          </div>
          <h1 className="page-title">
            Resep HPP & Komposisi Produk
          </h1>
          <p className="text-body-sm text-fg-muted">
            Resep perakitan bahan mentah menjadi produk jadi, kalkulasi otomatis Harga Pokok Produksi (HPP), dan estimasi margin laba via AI.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedProduct(null);
            setShowHppModal(true);
          }}
          className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-purple-600 hover:bg-purple-700 shadow-md"
        >
          <SparklesIcon className="w-4 h-4 text-purple-200" />
          <span>+ Buat Resep HPP Baru via AI</span>
        </button>
      </div>

      {/* BOM Cards or Clean Empty State */}
      <div className="flex flex-col gap-6">
        {boms.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-line shadow-xs text-center">
            <div className="flex flex-col items-center justify-center max-w-[420px] mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <SparklesIcon className="w-7 h-7 text-purple-600" />
              </div>
              <div className="font-bold text-ink text-body">Belum Ada Resep HPP (BOM)</div>
              <p className="text-label text-fg-muted mt-1 mb-5">
                Gunakan asisten AI untuk memecah resep bahan baku, kemasan, gas/listrik, dan menghitung margin laba kotor produk Anda secara otomatis.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setShowHppModal(true);
                }}
                className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>Hitung Resep HPP Pertama via AI</span>
              </button>
            </div>
          </div>
        ) : (
          boms.map((bom) => (
            <div key={bom.id} className="bg-white p-6 rounded-2xl border border-line shadow-xs flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-title text-fg">{bom.finishedProduct}</h2>
                    <span className="badge badge-lavender">{bom.category}</span>
                  </div>
                  <div className="text-label text-fg-subtle mt-0.5">Kode Resep: {bom.id} • Ukuran Batch: {bom.batchSize}</div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-caption text-fg-subtle block uppercase font-bold">Total HPP:</span>
                    <span className="font-bold text-body text-amber-700">
                      Rp {bom.totalHppCost.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-caption text-fg-subtle block uppercase font-bold">Harga Jual:</span>
                    <span className="font-bold text-body text-ink">
                      Rp {bom.sellingPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-caption text-fg-subtle block uppercase font-bold">Margin Laba:</span>
                    <span className="font-bold text-body text-emerald-700">
                      {bom.marginPercent}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBom(bom.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-all ml-2"
                    title="Hapus Resep"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Materials Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-label">
                  <thead>
                    <tr className="text-fg-subtle border-b border-sunken text-caption uppercase font-bold">
                      <th className="py-2 px-3">Komponen Bahan</th>
                      <th className="py-2 px-3">Kebutuhan / Takaran</th>
                      <th className="py-2 px-3 text-right">Biaya per Porsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sunken">
                    {bom.materials.map((m, idx) => (
                      <tr key={idx} className="hover:bg-soft">
                        <td className="py-2.5 px-3 font-semibold text-fg">{m.name}</td>
                        <td className="py-2.5 px-3 text-fg-muted">{m.qty}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-900">
                          Rp {Number(m.unitCost || m.cost || 0).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI HPP & Margin Intelligence Modal */}
      <AiHppModal
        isOpen={showHppModal}
        onClose={() => setShowHppModal(false)}
        product={selectedProduct}
        onApplyHpp={handleApplyNewBom}
      />
    </div>
  );
}
