/**
 * Klozer Data Transfer Utility — Native Excel (.xlsx / .csv) Engine
 * Powered by SheetJS (xlsx) for seamless spreadsheet templates, batch importing, and one-click exporting.
 * Resilient against varied Indonesian column headers, currency formats, and missing optional fields.
 */
import * as XLSX from "xlsx";

// ==================== EXCEL TEMPLATES & SYNONYMS DEFINITION ====================
export const TEMPLATES = {
  products: {
    filename: "template_katalog_produk_klozer.xlsx",
    sheetName: "Katalog Produk",
    title: "Template Katalog Produk & Variasi",
    description: "Template Excel resmi untuk mengisi daftar produk, kategori, harga jual, modal HPP, stok awal, dan variasi ukuran/warna.",
    headers: ["SKU", "Nama Produk", "Kategori", "Harga Jual (Rp)", "HPP Modal (Rp)", "Stok Awal", "Batas Min. Stok", "Variasi (Dipisah Koma)"],
    sampleRows: [
      ["GPK-001", "Paket Juara 1 (Nasi + Ayam Geprek + Es Teh)", "Paket Hemat", 22000, 11000, 120, 20, "Level 1 (Sedang), Level 3 (Pedas), Level 5 (Extra)"],
      ["GPK-002", "Ayam Geprek Mozzarella Leleh", "Menu Spesial", 26000, 13500, 60, 10, "Dada, Paha Atas, Paha Bawah"],
      ["GPK-003", "Ayam Geprek Sambal Matah Bali", "Menu Utama", 21000, 10500, 80, 15, "Level Sedang, Level Pedas"],
      ["GPK-004", "Ayam Geprek Sambal Bawang Original", "Menu Utama", 18000, 9000, 100, 15, "Level 1, Level 2, Level 3, Level 5"],
      ["GPK-005", "Kulit Ayam Crispy Juara Gurih", "Side Dish", 14000, 6000, 150, 25, "Original, Balado, Barbeque"],
      ["GPK-006", "Jamur Crispy Geprek Pedas", "Side Dish", 12000, 5000, 90, 15, "Pedas Sedang, Super Pedas"],
      ["GPK-007", "Tahu & Tempe Crispy Sambal Korek", "Side Dish", 8000, 3500, 100, 20, "Isi 4 Pcs"],
      ["GPK-008", "Es Teh Manis Jumbo Segar", "Minuman", 5000, 1500, 300, 50, "Dingin, Manis Sedang, Less Sugar"],
      ["GPK-009", "Es Jeruk Peras Murni", "Minuman", 8000, 3000, 180, 30, "Dingin, Hangat"],
      ["GPK-010", "Es Lemon Tea Soda", "Minuman", 10000, 4000, 120, 20, "Original Lemon, Mint Fresh"],
    ],
    columns: [
      {
        key: "sku",
        label: "SKU",
        required: false,
        width: 14,
        synonyms: ["sku", "kode", "kodemenu", "kodeproduk", "barcode", "itemcode", "id", "kodepenjualan"],
      },
      {
        key: "name",
        label: "Nama Produk",
        required: true,
        width: 32,
        synonyms: ["namaproduk", "name", "nama", "namamenu", "namabarang", "namaitem", "menu", "productname", "itemname", "judul", "namamakanan"],
      },
      {
        key: "category",
        label: "Kategori",
        required: false,
        default: "Umum",
        width: 20,
        synonyms: ["kategori", "category", "kategoriproduk", "golongan", "jenis", "tipe", "label", "group", "kelompok"],
      },
      {
        key: "price",
        label: "Harga Jual (Rp)",
        required: true,
        type: "number",
        default: 0,
        width: 18,
        synonyms: ["hargajual", "harga", "price", "hargajualrp", "sellingprice", "tarif", "rp", "hargasatuan", "hargakonsumen"],
      },
      {
        key: "hpp",
        label: "HPP Modal (Rp)",
        required: false,
        type: "number",
        default: 0,
        width: 16,
        synonyms: ["hpp", "hppmodal", "modal", "cost", "cogs", "hargamodal", "hargabeli", "biayaproduksi", "modalhpp", "hppmodalrp"],
      },
      {
        key: "stock",
        label: "Stok Awal",
        required: false,
        type: "number",
        default: 10,
        width: 12,
        synonyms: ["stokawal", "stock", "stok", "qty", "quantity", "jumlah", "stokfisik", "saldoawal", "stoksaatini"],
      },
      {
        key: "lowStock",
        label: "Batas Min. Stok",
        required: false,
        type: "number",
        default: 5,
        width: 16,
        synonyms: ["batasminstok", "minstok", "minimumstok", "stokminimum", "lowstock", "safetystock", "warningstok", "minstokawal"],
      },
      {
        key: "variants",
        label: "Variasi (Dipisah Koma)",
        required: false,
        default: "Standard",
        width: 28,
        synonyms: ["variasi", "varian", "variants", "variasidipisahkoma", "options", "level", "ukuran", "warna", "size", "pilihan"],
      },
    ],
  },
  contacts: {
    filename: "template_database_kontak_crm_klozer.xlsx",
    sheetName: "Database Kontak CRM",
    title: "Template Database Kontak & Pelanggan",
    description: "Template Excel resmi untuk memigrasikan database nomor WhatsApp pelanggan, email, kota, dan label segmentasi CRM.",
    headers: ["Nama Lengkap", "Nomor WhatsApp", "Email", "Kota / Alamat", "Label Kategori", "Total Belanja (Rp)"],
    sampleRows: [
      ["Ahmad Fauzi", "+62 812-3456-7890", "fauzi@gmail.com", "Surakarta", "Pelanggan VIP", 1500000],
      ["Siti Nurhaliza", "+62 813-9876-5432", "siti@yahoo.com", "Jakarta Selatan", "Repeat Buyer", 650000],
      ["Dimas Pratama", "+62 857-1122-3344", "dimas@company.co.id", "Surabaya", "B2B / Grosir", 4200000],
      ["Rina Anggraini", "+62 878-5566-7788", "rina@gmail.com", "Bandung", "Cold Lead", 0],
    ],
    columns: [
      {
        key: "name",
        label: "Nama Lengkap",
        required: true,
        width: 24,
        synonyms: ["namalengkap", "name", "nama", "namapelanggan", "customer", "pelanggan", "contact", "kontak", "namauser"],
      },
      {
        key: "phone",
        label: "Nomor WhatsApp",
        required: true,
        width: 22,
        synonyms: ["nomorwhatsapp", "phone", "whatsapp", "wa", "nowa", "nomorwa", "telepon", "notelp", "nohp", "handphone", "hp", "telp", "mobile"],
      },
      {
        key: "email",
        label: "Email",
        required: false,
        default: "-",
        width: 25,
        synonyms: ["email", "surel", "e-mail", "mail", "alamatemail"],
      },
      {
        key: "city",
        label: "Kota / Alamat",
        required: false,
        default: "Indonesia",
        width: 20,
        synonyms: ["kota", "alamat", "kotaalamat", "kabupaten", "address", "domisili", "provinsi", "lokasi"],
      },
      {
        key: "category",
        label: "Label Kategori",
        required: false,
        default: "Lead Baru",
        width: 18,
        synonyms: ["labelkategori", "category", "kategori", "label", "tag", "segmentasi", "status", "tipe", "klasifikasi"],
      },
      {
        key: "totalSpent",
        label: "Total Belanja (Rp)",
        required: false,
        type: "number",
        default: 0,
        width: 20,
        synonyms: ["totalbelanja", "totalspent", "totalbelanjarp", "ltv", "omset", "nominalbelanja", "totaltransaksi", "spend", "belanja"],
      },
    ],
  },
  stock: {
    filename: "template_penyesuaian_stok_klozer.xlsx",
    sheetName: "Opname Stok",
    title: "Template Opname & Penyesuaian Stok",
    description: "Template Excel resmi untuk memperbarui jumlah stok fisik real-time gudang berdasarkan SKU produk.",
    headers: ["SKU", "Nama Produk", "Stok Fisik Baru", "Catatan Penyesuaian"],
    sampleRows: [
      ["GPK-001", "Paket Juara 1", 120, "Stok opname gudang harian"],
      ["GPK-002", "Ayam Geprek Mozzarella Leleh", 65, "Restock dapur utama"],
      ["GPK-008", "Es Teh Manis Jumbo Segar", 300, "Penyesuaian stok harian"],
    ],
    columns: [
      {
        key: "sku",
        label: "SKU",
        required: true,
        width: 15,
        synonyms: ["sku", "kode", "kodemenu", "kodeproduk", "barcode", "itemcode", "id"],
      },
      {
        key: "name",
        label: "Nama Produk",
        required: false,
        width: 30,
        synonyms: ["namaproduk", "name", "nama", "namabarang", "menu", "productname"],
      },
      {
        key: "newStock",
        label: "Stok Fisik Baru",
        required: true,
        type: "number",
        width: 18,
        synonyms: ["stokfisikbaru", "newstock", "stok", "stokfisik", "stokbaru", "qty", "jumlah", "qtybaru", "stock"],
      },
      {
        key: "note",
        label: "Catatan Penyesuaian",
        required: false,
        default: "Update Excel",
        width: 30,
        synonyms: ["catatanpenyesuaian", "note", "catatan", "keterangan", "alasan", "notes", "keteranganpenyesuaian"],
      },
    ],
  },
};

// ==================== HELPER: ROBUST NUMBER / CURRENCY CLEANER ====================
export function parseCurrencyOrNumber(val, defaultVal = 0) {
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  if (!val) return defaultVal;

  let str = String(val).trim().toLowerCase();
  // Strip "rp", "idr", whitespace
  str = str.replace(/^(rp|idr)\.?\s*/i, "");
  // Strip trailing dashes (e.g. 25.000,-) or zeroes (e.g. 25000,00)
  str = str.replace(/(?:[,-]\s*-$|[,.]00$)/, "");
  // Strip non-digits
  str = str.replace(/[^0-9]/g, "");

  const num = Number(str);
  return isNaN(num) ? defaultVal : num;
}

// ==================== DOWNLOAD EXCEL TEMPLATE ====================
export const downloadExcelTemplate = (type) => {
  const tpl = TEMPLATES[type];
  if (!tpl) return;

  const dataAOA = [tpl.headers, ...tpl.sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(dataAOA);

  // Set column widths
  ws["!cols"] = tpl.columns.map((c) => ({ wch: c.width || 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tpl.sheetName || "Template Klozer");

  XLSX.writeFile(wb, tpl.filename);
};

// ==================== EXPORT DATA TO EXCEL ====================
export const exportDataToExcel = (filename, data, columns, sheetName = "Data Export") => {
  if (!data || !data.length) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const headers = columns.map((c) => c.label);
  const rows = data.map((item) =>
    columns.map((col) => {
      let val = item[col.key];
      if (col.formatter && typeof col.formatter === "function") {
        return col.formatter(val, item);
      }
      if (Array.isArray(val)) {
        return val.join(", ");
      }
      if (val === null || val === undefined) {
        return "";
      }
      return val;
    })
  );

  const dataAOA = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(dataAOA);
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
};

// ==================== PARSE EXCEL FILE BUFFER ====================
export const parseExcelArrayBuffer = (buffer, type) => {
  const tpl = TEMPLATES[type];
  if (!tpl) throw new Error("Tipe template tidak valid.");

  const wb = XLSX.read(buffer, { type: "array", raw: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return { valid: [], errors: [{ rowNumber: 0, raw: "", errors: ["Sheet Excel kosong."] }], total: 0 };
  }

  const ws = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (!rows || rows.length <= 1) {
    return { valid: [], errors: [{ rowNumber: 0, raw: "", errors: ["File Excel hanya berisi header tanpa baris data."] }], total: 0 };
  }

  // 1. Intelligent Header Row Detection (Scans up to first 5 rows to locate real header)
  let headerRowIdx = 0;
  let maxMatchedKeywords = 0;
  const scanLimit = Math.min(rows.length, 5);

  for (let r = 0; r < scanLimit; r++) {
    const candidateRow = rows[r] || [];
    const cleanCand = candidateRow.map((c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
    
    let currentMatches = 0;
    tpl.columns.forEach((col) => {
      const patterns = [col.key, col.label, ...(col.synonyms || [])].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const isPresent = cleanCand.some((cell) => cell && patterns.some((pat) => cell === pat || cell.includes(pat) || pat.includes(cell)));
      if (isPresent) currentMatches++;
    });

    if (currentMatches > maxMatchedKeywords) {
      maxMatchedKeywords = currentMatches;
      headerRowIdx = r;
    }
  }

  const headerRow = rows[headerRowIdx] || [];
  const cleanHeaders = headerRow.map((h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, ""));

  // 2. Map Columns to Header Indices using Synonyms & Exact Match Priority
  const headerMap = {};
  tpl.columns.forEach((col) => {
    const cleanKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    const synonyms = (col.synonyms || []).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const allPatterns = [cleanKey, cleanLabel, ...synonyms];

    let bestIdx = -1;
    let bestScore = 0;

    cleanHeaders.forEach((h, colIdx) => {
      if (!h) return; // Skip empty header cells completely!
      allPatterns.forEach((pattern) => {
        if (!pattern) return;
        if (h === pattern) {
          if (bestScore < 3) {
            bestScore = 3;
            bestIdx = colIdx;
          }
        } else if (h.includes(pattern) || pattern.includes(h)) {
          if (bestScore < 2) {
            bestScore = 2;
            bestIdx = colIdx;
          }
        }
      });
    });

    headerMap[col.key] = bestIdx;
  });

  // 3. Process Data Rows
  const dataRows = rows.slice(headerRowIdx + 1);
  const validRows = [];
  const errorRows = [];

  dataRows.forEach((rowValues, idx) => {
    const rowNumber = headerRowIdx + idx + 2;

    // Skip entirely empty rows
    if (!rowValues || rowValues.every((v) => v === "" || v === null || v === undefined)) {
      return;
    }

    const rowObj = {};
    let hasError = false;
    const errorDetails = [];

    tpl.columns.forEach((col, colIdx) => {
      const mappedIdx = headerMap[col.key];
      let val = mappedIdx !== -1 && mappedIdx !== undefined ? rowValues[mappedIdx] : rowValues[colIdx];

      if (val === undefined || val === null || val === "") {
        val = col.default !== undefined ? col.default : "";
      }

      // Special fallback for missing SKU in products: Auto-generate SKU
      if (type === "products" && col.key === "sku" && (!val || String(val).trim() === "")) {
        val = `GPK-${Math.floor(100 + Math.random() * 900)}`;
      }

      // Check required fields
      if (col.required && (val === "" || val === null || val === undefined)) {
        hasError = true;
        errorDetails.push(`Kolom '${col.label}' wajib diisi.`);
      }

      // Type checking & cleaning: number
      if (col.type === "number") {
        val = parseCurrencyOrNumber(val, col.default || 0);
      }

      // Array parsing: variants
      if (col.key === "variants" && typeof val === "string") {
        val = val
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        if (!val.length) val = ["Standard"];
      }

      rowObj[col.key] = val;
    });

    if (hasError) {
      errorRows.push({ rowNumber, raw: JSON.stringify(rowValues), errors: errorDetails });
    } else {
      validRows.push({ ...rowObj, _tempId: `IMP-${Date.now()}-${idx}` });
    }
  });

  return {
    valid: validRows,
    errors: errorRows,
    total: dataRows.length,
    headerRowIndex: headerRowIdx + 1,
  };
};
