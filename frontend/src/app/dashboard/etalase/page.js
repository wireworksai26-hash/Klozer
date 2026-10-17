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
  CheckIcon,
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
            <span className="text-micro font-bold uppercase tracking-wider bg-brand-soft text-brand px-2.5 py-0.5 rounded-full border border-brand-soft flex items-center gap-1.5">
              <ExternalLinkIcon className="w-3.5 h-3.5" />
              <span>Katalog Publik & Etalase Web</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Etalase Web Publik Toko
          </h1>
          <p className="text-label text-fg-muted">
            Tautan katalog web online instansi yang bisa dipasang di Bio WhatsApp & Instagram untuk memudahkan pembeli melihat produk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.open(publicUrl, "_blank")}
          className="btn-primary !py-2.5 !px-5 text-label font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <ExternalLinkIcon className="w-4 h-4" />
          <span>Buka Etalase Publik</span>
        </button>
      </div>

      {/* Share Box */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center flex-shrink-0">
            <QrIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-caption font-bold uppercase text-fg-subtle block">Tautan Resmi Etalase:</span>
            <span className="text-body font-bold font-mono text-fg">{publicUrl}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 bg-sunken hover:bg-brand-soft text-fg hover:text-brand rounded-xl text-label font-bold border border-line cursor-pointer transition-all"
          >
            {copied ? (
              <span className="flex items-center gap-1.5 text-success-600 font-bold">
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Tersalin!</span>
              </span>
            ) : (
              "Salin Link Bio"
            )}
          </button>
        </div>
      </div>

      {/* Catalog Preview Grid */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-5">
          <h2 className="text-body font-bold text-fg">Preview Produk yang Tampil di Etalase</h2>
          <span className="text-caption font-bold text-success-600">Terhubung dengan Stok Real-Time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl border border-line bg-soft flex flex-col justify-between gap-3">
              <div>
                <span className="badge badge-lavender text-micro mb-2 inline-block">{p.category}</span>
                <div className="font-bold text-fg text-body-sm">{p.name}</div>
                <div className="text-caption text-fg-muted line-clamp-2 mt-1">{p.description}</div>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between">
                <div>
                  <span className="text-micro text-fg-subtle block">Harga Jual:</span>
                  <span className="font-bold text-body-sm text-brand">Rp {p.price.toLocaleString("id-ID")}</span>
                </div>
                <span className="text-caption font-bold text-success-700 bg-success-50 px-2 py-0.5 rounded-md border border-success-200">
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
