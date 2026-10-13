"use client";
import React, { useState, useRef } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  TEMPLATES,
  downloadExcelTemplate,
  exportDataToExcel,
  parseExcelArrayBuffer,
} from "@/utils/dataTransfer";
import {
  aiCleanProducts,
  aiCleanContacts,
  aiCleanStock,
} from "@/utils/aiDataCleaner";
import {
  DownloadIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  FileTextIcon,
  XIcon,
  SparklesIcon,
  BotIcon,
  ArrowRightIcon,
  SlidersIcon,
  RefreshCwIcon,
} from "@/components/icons";

export default function DataTransferModal({
  isOpen,
  onClose,
  type = "products", // 'products' | 'contacts' | 'stock'
  data = [],
  onImportSuccess,
  exportColumns = [],
}) {
  const [activeTab, setActiveTab] = useState("import"); // 'import' | 'export'
  const [importMode, setImportMode] = useState("append"); // 'append' | 'replace'
  const [useAiCleaning, setUseAiCleaning] = useState(true);
  const [showAiLog, setShowAiLog] = useState(false);
  const [filterOnlyAiFixed, setFilterOnlyAiFixed] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { t, language } = useDashboard();

  if (!isOpen) return null;

  const tpl = TEMPLATES[type] || TEMPLATES.products;

  const processFile = (file) => {
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setParseResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const rawResult = parseExcelArrayBuffer(buffer, type, language);

        let cleanedData = rawResult.valid;
        let aiReport = null;

        if (useAiCleaning && rawResult.valid.length > 0) {
          if (type === "products") {
            aiReport = aiCleanProducts(rawResult.valid, language);
            cleanedData = aiReport.data;
          } else if (type === "contacts") {
            aiReport = aiCleanContacts(rawResult.valid, language);
            cleanedData = aiReport.data;
          } else if (type === "stock") {
            aiReport = aiCleanStock(rawResult.valid, language);
            cleanedData = aiReport.data;
          }
        }

        setParseResult({
          ...rawResult,
          valid: cleanedData,
          aiReport,
        });
      } catch (err) {
        setParseResult({
          valid: [],
          errors: [{ rowNumber: 0, raw: "", errors: [err.message || t("Gagal membaca format file Excel.")] }],
          total: 0,
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setParseResult({
        valid: [],
        errors: [{ rowNumber: 0, raw: "", errors: [t("Gagal membaca file dari media penyimpanan.")] }],
        total: 0,
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.valid || !parseResult.valid.length) {
      return;
    }

    if (onImportSuccess && typeof onImportSuccess === "function") {
      onImportSuccess(parseResult.valid, importMode);
    }

    // Directly close modal and return to screen without blocking alert
    handleClose();
  };

  const handleExport = () => {
    const cols = exportColumns.length
      ? exportColumns
      : tpl.columns.map((c) => ({ key: c.key, label: c.label, width: c.width }));
    exportDataToExcel(`${type}_klozer_${Date.now()}`, data, cols, tpl.sheetName || "Data Klozer");
  };

  const handleResetFile = () => {
    setFileName("");
    setParseResult(null);
    setIsProcessing(false);
    setIsDragging(false);
    setShowAiLog(false);
    setFilterOnlyAiFixed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    handleResetFile();
    onClose();
  };

  // Calculated values for preview screen: Only show review studio when there is at least 1 valid row!
  const isPreviewScreen = activeTab === "import" && Boolean(parseResult && parseResult.valid && parseResult.valid.length > 0);
  const displayedRows = filterOnlyAiFixed
    ? (parseResult?.valid || []).filter((r) => r._aiRepaired)
    : parseResult?.valid || [];

  const totalAssetValue = (parseResult?.valid || []).reduce((acc, row) => {
    if (type === "products") return acc + ((Number(row.price) || 0) * (Number(row.stock) || 1));
    if (type === "contacts") return acc + (Number(row.totalSpent) || 0);
    return acc;
  }, 0);

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
      {/* Dynamic Modal Container: Compact on Upload screen, Expands to Full-Width Studio on Review screen */}
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-line flex flex-col overflow-hidden transition-all duration-300 ${
          isPreviewScreen
            ? "w-[96vw] max-w-[1380px] h-[92vh]"
            : "w-full max-w-[780px] max-h-[90vh]"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-soft shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-success-100 text-success-700 flex items-center justify-center font-bold shadow-xs">
              <FileTextIcon className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="card-title">
                  {isPreviewScreen
                    ? t("Studio Review & Verifikasi Data: {title}", { title: t(tpl.title) })
                    : t("Pusat Data Excel ({title})", { title: t(tpl.title) })}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-micro font-bold bg-accent-100 text-accent-700 border border-accent-200 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3 text-accent-600" />
                  <span>Klozer AI Sanitizer</span>
                </span>
              </div>
              <p className="text-label text-fg-muted">
                {isPreviewScreen
                  ? t("File: \"{name}\" — Periksa data yang telah dinormalisasi & divalidasi sebelum disimpan ke toko.", { name: fileName })
                  : t("Unduh template Excel resmi, unggah data batch, atau ekspor data riil toko ke spreadsheet .xlsx.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPreviewScreen && (
              <button
                type="button"
                onClick={handleResetFile}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-danger-50 text-fg-muted hover:text-danger-600 text-label font-bold border border-line flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>{t("← Ganti File")}</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-brand-soft text-fg-muted hover:text-brand flex items-center justify-center border border-line cursor-pointer transition-all shadow-xs"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher (Only visible on initial Upload/Export screen) */}
        {!isPreviewScreen && (
          <div className="flex border-b border-line px-6 pt-3 bg-soft shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`pb-3 px-4 text-body-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === "import"
                  ? "border-success-600 text-success-700"
                  : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              <UploadIcon className="w-4 h-4" />
              <span>{t("Impor File Excel (.xlsx)")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`pb-3 px-4 text-body-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === "export"
                  ? "border-success-600 text-success-700"
                  : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              <DownloadIcon className="w-4 h-4" />
              <span>{t("Ekspor Excel ({count} Data)", { count: data.length })}</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: UPLOAD & TEMPLATE HUB (When no file is uploaded yet)             */}
        {/* ========================================================================= */}
        {!isPreviewScreen && (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-body-sm">
            {activeTab === "import" ? (
              <>
                {/* Step 1: Download Template */}
                <div className="p-4.5 rounded-2xl bg-success-50/70 border border-success-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-success-900 text-body-sm flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-success-600" />
                      <span>{t("Langkah 1: Unduh Format Template Excel (.xlsx)")}</span>
                    </div>
                    <p className="text-label text-success-800 mt-1 max-w-[480px]">
                      {t(tpl.description)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadExcelTemplate(type)}
                    className="px-4.5 py-2.5 bg-success-600 hover:bg-success-700 text-white rounded-xl text-body-sm font-bold flex items-center gap-2 shrink-0 cursor-pointer shadow-sm transition-all border-none"
                  >
                    <DownloadIcon className="w-4 h-4 text-white" />
                    <span>{t("Download Template Excel")}</span>
                  </button>
                </div>

                {/* AI Auto-Clean Toggle Card */}
                <div className="p-4 bg-accent-50/80 border border-accent-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center font-bold shrink-0">
                      <BotIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-accent-900 text-body-sm block">
                        AI Auto-Clean & Smart CRM Sanitizer
                      </span>
                      <span className="text-label text-accent-800">
                        {t("Merapikan otomatis nomor WhatsApp (+62), huruf kapital nama, estimasi HPP modal, dan kategori menu.")}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-label text-accent-900 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-accent-200 shadow-xs">
                    <input
                      type="checkbox"
                      checked={useAiCleaning}
                      onChange={(e) => setUseAiCleaning(e.target.checked)}
                      className="w-4 h-4 accent-accent-600 cursor-pointer"
                    />
                    <span>{t("Auto-Fix Aktif")}</span>
                  </label>
                </div>

                {/* Step 2: Upload Zone */}
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-ink text-body-sm">
                    {t("Langkah 2: Unggah File Excel yang Telah Diisi (.xlsx / .xls)")}
                  </span>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
                      isDragging
                        ? "border-success-500 bg-success-50/60 scale-[1.01]"
                        : "border-line-strong hover:border-success-500 bg-soft hover:bg-success-50/30"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-line flex items-center justify-center text-success-600 group-hover:scale-110 transition-transform">
                      <UploadIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="font-bold text-body text-fg block">
                        {isDragging ? t("Lepaskan File Excel di Sini!") : t("Klik atau Seret File Excel (.xlsx) ke Sini")}
                      </span>
                      <span className="text-label text-fg-subtle mt-0.5 block">
                        {t("Setelah diunggah, Anda akan otomatis diarahkan ke")} <strong>{t("Layar Studio Review Lengkap")}</strong> {t("untuk membaca seluruh kolom dengan jelas.")}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onClick={(e) => {
                        e.target.value = "";
                      }}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Error Notification Card on Screen 1 if upload failed / 0 valid rows */}
                {parseResult && (!parseResult.valid || parseResult.valid.length === 0) && parseResult.errors?.length > 0 && (
                  <div className="p-4 bg-danger-50 border border-danger-200 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-danger-900 font-bold text-body-sm">
                      <AlertTriangleIcon className="w-5 h-5 text-danger-600 shrink-0" />
                      <span>{t("Gagal Membaca File")} {fileName ? `"${fileName}"` : "Excel"}:</span>
                    </div>
                    <p className="text-label text-danger-800">
                      {t("Sistem tidak menemukan baris data valid yang sesuai dengan format tabel toko. Pastikan judul kolom sesuai dengan template.")}
                    </p>
                    <ul className="text-label text-danger-800 list-disc list-inside space-y-0.5 pl-1">
                      {parseResult.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>
                          {err.rowNumber > 0 ? t("Baris #{row}: ", { row: err.rowNumber }) : ""}
                          {Array.isArray(err.errors) ? err.errors.map((m) => t(m)).join(", ") : t(err.errors)}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => downloadExcelTemplate(type)}
                        className="text-label font-bold text-success-700 hover:text-success-800 underline cursor-pointer"
                      >
                        {t("Unduh Format Template Resmi")} ({tpl.filename})
                      </button>
                      <span className="text-caption text-fg-subtle">•</span>
                      <button
                        type="button"
                        onClick={handleResetFile}
                        className="text-label font-bold text-danger-700 hover:text-danger-800 underline cursor-pointer"
                      >
                        {t("Coba File Lain")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {isProcessing && (
                  <div className="py-6 text-center text-accent-700 font-bold flex items-center justify-center gap-2 bg-accent-50 rounded-2xl border border-accent-200">
                    <SparklesIcon className="w-5 h-5 animate-spin text-accent-600" />
                    <span>{t("Klozer AI sedang membaca, merapikan, dan memvalidasi file Excel...")}</span>
                  </div>
                )}
              </>
            ) : (
              /* Export Tab */
              <div className="flex flex-col gap-4 py-4">
                <div className="p-4 bg-success-50 rounded-2xl border border-success-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-success-900 text-body-sm">
                      {t("Siap Mengekspor Data")} {t(tpl.title)}
                    </h4>
                    <p className="text-label text-success-700 mt-0.5">
                      {t("Toko Anda memiliki total")} <strong>{data.length} {t("item")}</strong> {t("yang akan diunduh dalam spreadsheet")} <strong>Excel (.xlsx)</strong>.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-success-100 text-success-700 flex items-center justify-center font-bold">
                    <CheckCircleIcon className="w-5 h-5 text-success-600" />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-line bg-soft text-label text-fg-muted">
                  <span className="font-bold text-fg block mb-1">{t("Kolom yang Disertakan dalam File Excel:")}</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tpl.columns.map((c) => (
                      <span key={c.key} className="px-2.5 py-1 bg-white rounded-lg border border-line font-semibold text-fg">
                        {t(c.label)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: FULL-WIDTH STUDIO DATA REVIEW & VERIFICATION SCREEN            */}
        {/* ========================================================================= */}
        {isPreviewScreen && (
          <div className="flex-1 flex flex-col overflow-hidden bg-soft">
            {/* Studio Top Control & Metrics Bar */}
            <div className="p-5 bg-white border-b border-line flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 shadow-xs">
              {/* Metrics Pills */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-soft px-4 py-2 rounded-2xl border border-line">
                  <div className="text-micro font-bold uppercase tracking-wider text-fg-muted">{t("Total Baris")}</div>
                  <div className="text-title font-bold text-ink">
                    {parseResult.valid.length} <span className="text-label font-bold text-fg-muted">Valid</span>
                  </div>
                </div>

                {parseResult.aiReport?.anomalyCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAiLog(!showAiLog)}
                    className="bg-accent-50 hover:bg-accent-100 px-4 py-2 rounded-2xl border border-accent-200 text-left cursor-pointer transition-all"
                  >
                    <div className="text-micro font-bold uppercase tracking-wider text-accent-700 flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3 text-accent-600" />
                      <span>AI Auto-Fixed</span>
                    </div>
                    <div className="text-title font-bold text-accent-900 flex items-center gap-1.5">
                      <span>{parseResult.aiReport.anomalyCount} {t("Kolom")}</span>
                      <span className="text-caption font-bold underline text-accent-700">({showAiLog ? t("Tutup Log") : t("Lihat Log")})</span>
                    </div>
                  </button>
                )}

                {totalAssetValue > 0 && (
                  <div className="bg-success-50 px-4 py-2 rounded-2xl border border-success-200">
                    <div className="text-micro font-bold uppercase tracking-wider text-success-800">
                      {type === "products" ? t("Estimasi Nilai Stok") : t("Total LTV Belanja")}
                    </div>
                    <div className="text-title font-bold text-success-900">
                      Rp {totalAssetValue.toLocaleString("id-ID")}
                    </div>
                  </div>
                )}

                {parseResult.errors.length > 0 && (
                  <div className="bg-danger-50 px-4 py-2 rounded-2xl border border-danger-200">
                    <div className="text-micro font-bold uppercase tracking-wider text-danger-700">{t("Baris Rusak")}</div>
                    <div className="text-title font-bold text-danger-900">
                      {parseResult.errors.length} <span className="text-caption font-bold text-danger-600">{t("Dilewati")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Import Mode Options Card */}
              <div className="flex items-center gap-3 bg-soft p-2 rounded-2xl border border-line">
                <span className="text-label font-bold text-ink pl-2">{t("Mode Penyimpanan:")}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("append")}
                    className={`px-3 py-1.5 rounded-xl text-label font-bold cursor-pointer transition-all ${
                      importMode === "append"
                        ? "bg-white text-brand shadow-xs border border-line-strong"
                        : "bg-transparent text-fg-muted hover:text-fg border-none"
                    }`}
                  >
                    {t("+ Tambah (Append)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={`px-3 py-1.5 rounded-xl text-label font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      importMode === "replace"
                        ? "bg-danger-600 text-white shadow-xs border border-danger-600"
                        : "bg-transparent text-fg-muted hover:text-danger-600 border-none"
                    }`}
                  >
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                    <span>{t("Ganti Semua (Replace)")}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Log Drawer (Collapsible) */}
            {showAiLog && parseResult.aiReport?.repairsLog?.length > 0 && (
              <div className="p-4 bg-accent-50 border-b border-accent-200 text-accent-900 text-label flex flex-col gap-2 max-h-[160px] overflow-y-auto shrink-0 shadow-inner">
                <div className="font-bold flex items-center justify-between text-accent-900">
                  <div className="flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-accent-600" />
                    <span>{t("Rincian Kolom yang Disempurnakan Otomatis oleh Klozer AI:")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiLog(false)}
                    className="text-caption font-bold text-accent-700 underline cursor-pointer"
                  >
                    {t("Tutup")}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  {parseResult.aiReport.repairsLog.map((log, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-accent-200 text-label shadow-2xs">
                      <strong className="text-ink">{t("Baris #{row}", { row: log.row })} ({log.name}):</strong>{" "}
                      <span className="text-accent-800">{log.changes.join(" • ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors Notification if any */}
            {parseResult.errors.length > 0 && (
              <div className="p-3 bg-danger-50 border-b border-danger-200 text-danger-800 text-label flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-danger-600" />
                  <span>
                    {t("Ditemukan {count} baris dengan format rusak / kolom wajib kosong. Baris tersebut akan otomatis dilewati agar database toko tetap bersih.", { count: parseResult.errors.length })}
                  </span>
                </div>
              </div>
            )}

            {/* Spacious Studio Table Area */}
            <div className="flex-1 overflow-auto p-6">
              <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden min-w-full">
                <table className="w-full text-left border-collapse text-body-sm">
                  <thead className="bg-soft sticky top-0 z-10 border-b border-line text-fg-muted font-bold text-label uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 text-center w-14">No</th>
                      {tpl.columns.map((c) => (
                        <th
                          key={c.key}
                          className={`py-3.5 px-5 whitespace-nowrap ${
                            c.type === "number" ? "text-right" : "text-left"
                          }`}
                        >
                          {t(c.label)}
                        </th>
                      ))}
                      <th className="py-3.5 px-5 text-center whitespace-nowrap">Status AI Sanitizer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sunken">
                    {displayedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-soft transition-colors ${
                          row._aiRepaired ? "bg-accent-50/20" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-fg-subtle">
                          {idx + 1}
                        </td>
                        {tpl.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`py-3.5 px-5 whitespace-nowrap text-fg ${
                              c.type === "number" ? "text-right font-bold tabular-nums" : "font-medium"
                            }`}
                          >
                            {Array.isArray(row[c.key]) ? (
                              <div className="flex flex-wrap gap-1">
                                {row[c.key].map((v, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-sunken text-fg-muted text-caption font-bold rounded-lg border border-line"
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            ) : c.type === "number" ? (
                              c.key === "price" || c.key === "hpp" || c.key === "totalSpent" ? (
                                `Rp ${Number(row[c.key] || 0).toLocaleString("id-ID")}`
                              ) : (
                                `${Number(row[c.key] || 0).toLocaleString("id-ID")} Pcs`
                              )
                            ) : c.key === "sku" ? (
                              <span className="font-mono font-bold text-brand bg-brand-soft/50 px-2 py-1 rounded-lg border border-brand/10">
                                {row[c.key] || "-"}
                              </span>
                            ) : c.key === "category" ? (
                              <span className="px-2.5 py-1 bg-warning-50 text-warning-900 border border-warning-200 text-caption font-bold rounded-xl">
                                {row[c.key] || t("Umum")}
                              </span>
                            ) : (
                              <span className="font-bold text-ink">{String(row[c.key] || "-")}</span>
                            )}
                          </td>
                        ))}

                        {/* Status AI Sanitizer Column */}
                        <td className="py-3.5 px-5 text-center whitespace-nowrap">
                          {row._aiRepaired ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-bold bg-accent-100 text-accent-900 border border-accent-300 shadow-2xs">
                              <SparklesIcon className="w-3.5 h-3.5 text-accent-600" />
                              <span>AI Auto-Fixed</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-caption font-bold bg-success-50 text-success-800 border border-success-200">
                              <CheckCircleIcon className="w-3.5 h-3.5 text-success-600" />
                              <span>{t("Format Sempurna")}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM ACTION BAR                                                         */}
        {/* ========================================================================= */}
        <div className="p-4.5 px-6 border-t border-line bg-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-body-sm font-bold text-fg-muted hover:bg-line rounded-2xl border-none cursor-pointer transition-all"
            >
              {isPreviewScreen ? t("Batal & Tutup") : t("Tutup")}
            </button>

            {isPreviewScreen && (
              <span className="text-label text-fg-muted hidden md:inline">
                {t("Menampilkan")} <strong>{displayedRows.length}</strong> {t("data siap diimpor ke katalog toko.")}
              </span>
            )}
          </div>

          {!isPreviewScreen ? (
            activeTab === "export" && (
              <button
                type="button"
                onClick={handleExport}
                className="px-6 py-3 bg-success-600 hover:bg-success-700 text-white rounded-2xl text-body-sm font-bold flex items-center gap-2 cursor-pointer border-none shadow-md transition-all"
              >
                <DownloadIcon className="w-4 h-4 text-white" />
                <span>{t("Download File Excel (.xlsx)")}</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parseResult || !parseResult.valid.length}
              className="px-7 py-3 rounded-2xl text-body-sm font-bold flex items-center gap-2.5 cursor-pointer transition-all bg-success-600 hover:bg-success-700 text-white shadow-lg shadow-success-600/25 border-none active:scale-95"
            >
              <CheckCircleIcon className="w-5 h-5 text-white" />
              <span>
                {t("Konfirmasi & Simpan {count} Data ke Toko", { count: parseResult.valid.length })}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
