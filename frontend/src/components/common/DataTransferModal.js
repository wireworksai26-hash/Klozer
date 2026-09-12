"use client";
import React, { useState, useRef } from "react";
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
        const rawResult = parseExcelArrayBuffer(buffer, type);

        let cleanedData = rawResult.valid;
        let aiReport = null;

        if (useAiCleaning && rawResult.valid.length > 0) {
          if (type === "products") {
            aiReport = aiCleanProducts(rawResult.valid);
            cleanedData = aiReport.data;
          } else if (type === "contacts") {
            aiReport = aiCleanContacts(rawResult.valid);
            cleanedData = aiReport.data;
          } else if (type === "stock") {
            aiReport = aiCleanStock(rawResult.valid);
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
          errors: [{ rowNumber: 0, raw: "", errors: [err.message || "Gagal membaca format file Excel."] }],
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
        errors: [{ rowNumber: 0, raw: "", errors: ["Gagal membaca file dari media penyimpanan."] }],
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
    <div className="fixed inset-0 bg-[#0c1754]/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
      {/* Dynamic Modal Container: Compact on Upload screen, Expands to Full-Width Studio on Review screen */}
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-[#ede8e2] flex flex-col overflow-hidden transition-all duration-300 ${
          isPreviewScreen
            ? "w-[96vw] max-w-[1380px] h-[92vh]"
            : "w-full max-w-[780px] max-h-[90vh]"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ede8e2] bg-[#fcfbf9] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <FileTextIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-black text-[#0c1754]">
                  {isPreviewScreen
                    ? `Studio Review & Verifikasi Data: ${tpl.title}`
                    : `Pusat Data Excel (${tpl.title})`}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3 text-purple-600" />
                  <span>Klozer AI Sanitizer</span>
                </span>
              </div>
              <p className="text-[12px] text-[#64748b]">
                {isPreviewScreen
                  ? `File: "${fileName}" — Periksa data yang telah dinormalisasi & divalidasi sebelum disimpan ke toko.`
                  : "Unduh template Excel resmi, unggah data batch, atau ekspor data riil toko ke spreadsheet .xlsx."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPreviewScreen && (
              <button
                type="button"
                onClick={handleResetFile}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-[#64748b] hover:text-rose-600 text-[12px] font-bold border border-[#ede8e2] flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>← Ganti File</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-[#eaebf8] text-[#64748b] hover:text-[#2545ff] flex items-center justify-center border border-[#ede8e2] cursor-pointer transition-all shadow-xs"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher (Only visible on initial Upload/Export screen) */}
        {!isPreviewScreen && (
          <div className="flex border-b border-[#ede8e2] px-6 pt-3 bg-[#fcfbf9] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`pb-3 px-4 text-[13.5px] font-extrabold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === "import"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-[#64748b] hover:text-[#1e2640]"
              }`}
            >
              <UploadIcon className="w-4 h-4" />
              <span>Impor File Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`pb-3 px-4 text-[13.5px] font-extrabold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === "export"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-[#64748b] hover:text-[#1e2640]"
              }`}
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Ekspor Excel ({data.length} Data)</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: UPLOAD & TEMPLATE HUB (When no file is uploaded yet)             */}
        {/* ========================================================================= */}
        {!isPreviewScreen && (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-[13px]">
            {activeTab === "import" ? (
              <>
                {/* Step 1: Download Template */}
                <div className="p-4.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-black text-emerald-950 text-[14px] flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-emerald-600" />
                      <span>Langkah 1: Unduh Format Template Excel (.xlsx)</span>
                    </div>
                    <p className="text-[12.5px] text-emerald-800 mt-1 max-w-[480px]">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadExcelTemplate(type)}
                    className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-black flex items-center gap-2 shrink-0 cursor-pointer shadow-sm transition-all border-none"
                  >
                    <DownloadIcon className="w-4 h-4 text-white" />
                    <span>Download Template Excel</span>
                  </button>
                </div>

                {/* AI Auto-Clean Toggle Card */}
                <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      <BotIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-purple-950 text-[13.5px] block">
                        AI Auto-Clean & Smart CRM Sanitizer
                      </span>
                      <span className="text-[12px] text-purple-800">
                        Merapikan otomatis nomor WhatsApp (+62), huruf kapital nama, estimasi HPP modal, dan kategori menu.
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-[12.5px] text-purple-900 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-purple-200 shadow-xs">
                    <input
                      type="checkbox"
                      checked={useAiCleaning}
                      onChange={(e) => setUseAiCleaning(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 cursor-pointer"
                    />
                    <span>Auto-Fix Aktif</span>
                  </label>
                </div>

                {/* Step 2: Upload Zone */}
                <div className="flex flex-col gap-2">
                  <span className="font-black text-[#0c1754] text-[13.5px]">
                    Langkah 2: Unggah File Excel yang Telah Diisi (.xlsx / .xls)
                  </span>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
                      isDragging
                        ? "border-emerald-500 bg-emerald-50/60 scale-[1.01]"
                        : "border-[#cbd5e1] hover:border-emerald-500 bg-[#fcfbf9] hover:bg-emerald-50/30"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-[#ede8e2] flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <UploadIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="font-black text-[15px] text-[#1e2640] block">
                        {isDragging ? "Lepaskan File Excel di Sini!" : "Klik atau Seret File Excel (.xlsx) ke Sini"}
                      </span>
                      <span className="text-[12px] text-[#8f95a8] mt-0.5 block">
                        Setelah diunggah, Anda akan otomatis diarahkan ke <strong>Layar Studio Review Lengkap</strong> untuk membaca seluruh kolom dengan jelas.
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
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-rose-900 font-extrabold text-[13.5px]">
                      <AlertTriangleIcon className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>Gagal Membaca File {fileName ? `"${fileName}"` : "Excel"}:</span>
                    </div>
                    <p className="text-[12px] text-rose-800">
                      Sistem tidak menemukan baris data valid yang sesuai dengan format tabel toko. Pastikan judul kolom sesuai dengan template.
                    </p>
                    <ul className="text-[12px] text-rose-800 list-disc list-inside space-y-0.5 pl-1">
                      {parseResult.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>
                          {err.rowNumber > 0 ? `Baris #${err.rowNumber}: ` : ""}
                          {Array.isArray(err.errors) ? err.errors.join(", ") : err.errors}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => downloadExcelTemplate(type)}
                        className="text-[12px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        Unduh Format Template Resmi ({tpl.filename})
                      </button>
                      <span className="text-[11px] text-[#94a3b8]">•</span>
                      <button
                        type="button"
                        onClick={handleResetFile}
                        className="text-[12px] font-bold text-rose-700 hover:text-rose-800 underline cursor-pointer"
                      >
                        Coba File Lain
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {isProcessing && (
                  <div className="py-6 text-center text-purple-700 font-extrabold flex items-center justify-center gap-2 bg-purple-50 rounded-2xl border border-purple-200">
                    <SparklesIcon className="w-5 h-5 animate-spin text-purple-600" />
                    <span>Klozer AI sedang membaca, merapikan, dan memvalidasi file Excel...</span>
                  </div>
                )}
              </>
            ) : (
              /* Export Tab */
              <div className="flex flex-col gap-4 py-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-emerald-900 text-[14px]">
                      Siap Mengekspor Data {tpl.title}
                    </h4>
                    <p className="text-[12px] text-emerald-700 mt-0.5">
                      Toko Anda memiliki total <strong>{data.length} item</strong> yang akan diunduh dalam spreadsheet <strong>Excel (.xlsx)</strong>.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#ede8e2] bg-[#fcfbf9] text-[12.5px] text-[#64748b]">
                  <span className="font-bold text-[#1e2640] block mb-1">Kolom yang Disertakan dalam File Excel:</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tpl.columns.map((c) => (
                      <span key={c.key} className="px-2.5 py-1 bg-white rounded-lg border border-[#ede8e2] font-semibold text-[#1e2640]">
                        {c.label}
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
          <div className="flex-1 flex flex-col overflow-hidden bg-[#fbfaf8]">
            {/* Studio Top Control & Metrics Bar */}
            <div className="p-5 bg-white border-b border-[#ede8e2] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 shadow-xs">
              {/* Metrics Pills */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#f8fafc] px-4 py-2 rounded-2xl border border-[#e2e8f0]">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748b]">Total Baris</div>
                  <div className="text-[18px] font-black text-[#0c1754]">
                    {parseResult.valid.length} <span className="text-[12px] font-bold text-[#64748b]">Valid</span>
                  </div>
                </div>

                {parseResult.aiReport?.anomalyCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAiLog(!showAiLog)}
                    className="bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-2xl border border-purple-200 text-left cursor-pointer transition-all"
                  >
                    <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3 text-purple-600" />
                      <span>AI Auto-Fixed</span>
                    </div>
                    <div className="text-[18px] font-black text-purple-900 flex items-center gap-1.5">
                      <span>{parseResult.aiReport.anomalyCount} Kolom</span>
                      <span className="text-[11px] font-bold underline text-purple-700">({showAiLog ? "Tutup Log" : "Lihat Log"})</span>
                    </div>
                  </button>
                )}

                {totalAssetValue > 0 && (
                  <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
                    <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-800">
                      {type === "products" ? "Estimasi Nilai Stok" : "Total LTV Belanja"}
                    </div>
                    <div className="text-[18px] font-black text-emerald-900">
                      Rp {totalAssetValue.toLocaleString("id-ID")}
                    </div>
                  </div>
                )}

                {parseResult.errors.length > 0 && (
                  <div className="bg-rose-50 px-4 py-2 rounded-2xl border border-rose-200">
                    <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-rose-700">Baris Rusak</div>
                    <div className="text-[18px] font-black text-rose-900">
                      {parseResult.errors.length} <span className="text-[11px] font-bold text-rose-600">Dilewati</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Import Mode Options Card */}
              <div className="flex items-center gap-3 bg-[#f8fafc] p-2 rounded-2xl border border-[#e2e8f0]">
                <span className="text-[12px] font-black text-[#0c1754] pl-2">Mode Penyimpanan:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("append")}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-extrabold cursor-pointer transition-all ${
                      importMode === "append"
                        ? "bg-white text-[#2545ff] shadow-xs border border-[#cbd5e1]"
                        : "bg-transparent text-[#64748b] hover:text-[#1e2640] border-none"
                    }`}
                  >
                    + Tambah (Append)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-extrabold cursor-pointer transition-all flex items-center gap-1 ${
                      importMode === "replace"
                        ? "bg-rose-600 text-white shadow-xs border border-rose-600"
                        : "bg-transparent text-[#64748b] hover:text-rose-600 border-none"
                    }`}
                  >
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                    <span>Ganti Semua (Replace)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Log Drawer (Collapsible) */}
            {showAiLog && parseResult.aiReport?.repairsLog?.length > 0 && (
              <div className="p-4 bg-purple-50 border-b border-purple-200 text-purple-900 text-[12.5px] flex flex-col gap-2 max-h-[160px] overflow-y-auto shrink-0 shadow-inner">
                <div className="font-black flex items-center justify-between text-purple-950">
                  <div className="flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-purple-600" />
                    <span>Rincian Kolom yang Disempurnakan Otomatis oleh Klozer AI:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiLog(false)}
                    className="text-[11.5px] font-bold text-purple-700 underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  {parseResult.aiReport.repairsLog.map((log, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-purple-200 text-[12px] shadow-2xs">
                      <strong className="text-[#0c1754]">Baris #{log.row} ({log.name}):</strong>{" "}
                      <span className="text-purple-800">{log.changes.join(" • ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors Notification if any */}
            {parseResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-[12px] flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-rose-600" />
                  <span>
                    Ditemukan {parseResult.errors.length} baris dengan format rusak / kolom wajib kosong. Baris tersebut akan otomatis dilewati agar database toko tetap bersih.
                  </span>
                </div>
              </div>
            )}

            {/* Spacious Studio Table Area */}
            <div className="flex-1 overflow-auto p-6">
              <div className="bg-white rounded-2xl border border-[#ede8e2] shadow-sm overflow-hidden min-w-full">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead className="bg-[#f8fafc] sticky top-0 z-10 border-b border-[#e2e8f0] text-[#64748b] font-black text-[12px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 text-center w-14">No</th>
                      {tpl.columns.map((c) => (
                        <th
                          key={c.key}
                          className={`py-3.5 px-5 whitespace-nowrap ${
                            c.type === "number" ? "text-right" : "text-left"
                          }`}
                        >
                          {c.label}
                        </th>
                      ))}
                      <th className="py-3.5 px-5 text-center whitespace-nowrap">Status AI Sanitizer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {displayedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-[#f8fafc] transition-colors ${
                          row._aiRepaired ? "bg-purple-50/20" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-[#94a3b8]">
                          {idx + 1}
                        </td>
                        {tpl.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`py-3.5 px-5 whitespace-nowrap text-[#1e2640] ${
                              c.type === "number" ? "text-right font-bold tabular-nums" : "font-medium"
                            }`}
                          >
                            {Array.isArray(row[c.key]) ? (
                              <div className="flex flex-wrap gap-1">
                                {row[c.key].map((v, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-[#f1f5f9] text-[#475569] text-[11px] font-bold rounded-lg border border-[#e2e8f0]"
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
                              <span className="font-mono font-bold text-[#2545ff] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                {row[c.key] || "-"}
                              </span>
                            ) : c.key === "category" ? (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-[11.5px] font-bold rounded-xl">
                                {row[c.key] || "Umum"}
                              </span>
                            ) : (
                              <span className="font-bold text-[#0c1754]">{String(row[c.key] || "-")}</span>
                            )}
                          </td>
                        ))}

                        {/* Status AI Sanitizer Column */}
                        <td className="py-3.5 px-5 text-center whitespace-nowrap">
                          {row._aiRepaired ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                              <SparklesIcon className="w-3.5 h-3.5 text-purple-600" />
                              <span>AI Auto-Fixed</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Format Sempurna</span>
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
        <div className="p-4.5 px-6 border-t border-[#ede8e2] bg-[#fcfbf9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-[13.5px] font-extrabold text-[#5a6380] hover:bg-[#ede8e2] rounded-2xl border-none cursor-pointer transition-all"
            >
              {isPreviewScreen ? "Batal & Tutup" : "Tutup"}
            </button>

            {isPreviewScreen && (
              <span className="text-[12px] text-[#64748b] hidden md:inline">
                Menampilkan <strong>{displayedRows.length}</strong> data siap diimpor ke katalog toko.
              </span>
            )}
          </div>

          {!isPreviewScreen ? (
            activeTab === "export" && (
              <button
                type="button"
                onClick={handleExport}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[13.5px] font-black flex items-center gap-2 cursor-pointer border-none shadow-md transition-all"
              >
                <DownloadIcon className="w-4 h-4 text-white" />
                <span>Download File Excel (.xlsx)</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parseResult || !parseResult.valid.length}
              className="px-7 py-3 rounded-2xl text-[14px] font-black flex items-center gap-2.5 cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 border-none active:scale-95"
            >
              <CheckCircleIcon className="w-5 h-5 text-white" />
              <span>
                Konfirmasi & Simpan {parseResult.valid.length} Data ke Toko
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
