"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  ExternalLinkIcon,
  CrownIcon,
  CheckCircleIcon,
  QrIcon,
  ShoppingCartIcon,
  SparklesIcon,
} from "@/components/icons";

export default function SupervisorEtalasePage() {
  const { activeInstitution, products } = useDashboard();
  const [copied, setCopied] = useState(false);

  const storeSlug = activeInstitution?.name?.toLowerCase().replace(/\s+/g, "-") || "batik-mahakarya";
  const publicUrl = `https://klozer.id/etalase/${storeSlug}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <ExternalLinkIcon className="w-3.5 h-3.5" />
              <span>Katalog Publik & Etalase Web</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Etalase Web Publik Toko
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Tautan katalog web online instansi yang bisa dipasang di Bio WhatsApp & Instagram untuk memudahkan pembeli melihat produk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.open(publicUrl, "_blank")}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <ExternalLinkIcon className="w-4 h-4" />
          <span>Buka Etalase Publik</span>
        </button>
      </div>

      {/* Share Box */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2545ff] flex items-center justify-center flex-shrink-0">
            <QrIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[12px] font-bold uppercase text-[#8f95a8] block">Tautan Resmi Etalase:</span>
            <span className="text-[16px] font-extrabold font-mono text-[#1e2640]">{publicUrl}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 bg-[#f5f4f2] hover:bg-[#edeffe] text-[#1e2640] hover:text-[#2545ff] rounded-xl text-[13px] font-bold border border-[#ede8e2] cursor-pointer transition-all"
          >
            {copied ? "✓ Tersalin!" : "Salin Link Bio"}
          </button>
        </div>
      </div>

      {/* Catalog Preview Grid */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-5">
          <h2 className="text-[17px] font-extrabold text-[#1e2640]">Preview Produk yang Tampil di Etalase</h2>
          <span className="text-[12px] font-bold text-emerald-600">Terhubung dengan Stok Real-Time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl border border-[#ede8e2] bg-[#fcfbf9] flex flex-col justify-between gap-3">
              <div>
                <span className="badge badge-lavender text-[10.5px] mb-2 inline-block">{p.category}</span>
                <div className="font-bold text-[#1e2640] text-[15px]">{p.name}</div>
                <div className="text-[12px] text-[#5a6380] line-clamp-2 mt-1">{p.description}</div>
              </div>

              <div className="pt-3 border-t border-[#ede8e2] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#8f95a8] block">Harga Jual:</span>
                  <span className="font-extrabold text-[15px] text-[#2545ff]">Rp {p.price.toLocaleString("id-ID")}</span>
                </div>
                <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Stok: {p.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
