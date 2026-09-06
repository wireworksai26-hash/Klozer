/**
 * Klozer Data Transfer Utility — Native Excel (.xlsx) Engine
 * Powered by SheetJS (xlsx) for seamless spreadsheet templates, batch importing, and one-click exporting.
 */
import * as XLSX from "xlsx";

// ==================== EXCEL TEMPLATES DEFINITION ====================
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
      { key: "sku", label: "SKU", required: true, width: 14 },
      { key: "name", label: "Nama Produk", required: true, width: 32 },
      { key: "category", label: "Kategori", required: false, default: "Umum", width: 20 },
      { key: "price", label: "Harga Jual (Rp)", required: true, type: "number", width: 18 },
      { key: "hpp", label: "HPP Modal (Rp)", required: false, type: "number", default: 0, width: 16 },
      { key: "stock", label: "Stok Awal", required: true, type: "number", width: 12 },
      { key: "lowStock", label: "Batas Min. Stok", required: false, type: "number", default: 5, width: 16 },
      { key: "variants", label: "Variasi (Dipisah Koma)", required: false, default: "Standard", width: 28 },
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
      { key: "name", label: "Nama Lengkap", required: true, width: 24 },
      { key: "phone", label: "Nomor WhatsApp", required: true, width: 22 },
      { key: "email", label: "Email", required: false, default: "-", width: 25 },
      { key: "city", label: "Kota / Alamat", required: false, default: "Indonesia", width: 20 },
      { key: "category", label: "Label Kategori", required: false, default: "Lead Baru", width: 18 },
      { key: "totalSpent", label: "Total Belanja (Rp)", required: false, type: "number", default: 0, width: 20 },
    ],
  },
  stock: {
    filename: "template_penyesuaian_stok_klozer.xlsx",
    sheetName: "Opname Stok",
    title: "Template Opname & Penyesuaian Stok",
    description: "Template Excel resmi untuk memperbarui jumlah stok fisik real-time gudang berdasarkan SKU produk.",
    headers: ["SKU", "Nama Produk", "Stok Fisik Baru", "Catatan Penyesuaian"],
    sampleRows: [
      ["KLZ-101", "Kemeja Batik Tulis Pria", 50, "Stok opname akhir bulan"],
      ["KLZ-102", "Daster Premium Rayon", 42, "Restock dari konveksi cabang"],
      ["KLZ-103", "Serum Brightening Glowing 30ml", 28, "Penyesuaian barang rusak 2 pcs"],
    ],
    columns: [
      { key: "sku", label: "SKU", required: true, width: 15 },
      { key: "name", label: "Nama Produk", required: false, width: 30 },
      { key: "newStock", label: "Stok Fisik Baru", required: true, type: "number", width: 18 },
      { key: "note", label: "Catatan Penyesuaian", required: false, default: "Update Excel", width: 30 },
    ],
  },
};

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

  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return { valid: [], errors: [{ rowNumber: 0, raw: "", errors: ["Sheet Excel kosong."] }], total: 0 };
  }

  const ws = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (!rows || rows.length <= 1) {
    return { valid: [], errors: [{ rowNumber: 0, raw: "", errors: ["File Excel hanya berisi header tanpa baris data."] }], total: 0 };
  }

  const rawHeaders = (rows[0] || []).map((h) =>
    String(h).toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const dataRows = rows.slice(1);
  const validRows = [];
  const errorRows = [];

  dataRows.forEach((rowValues, idx) => {
    const rowNumber = idx + 2;

    // Check if row is entirely empty
    if (!rowValues || rowValues.every((v) => v === "" || v === null || v === undefined)) {
      return;
    }

    const rowObj = {};
    let hasError = false;
    const errorDetails = [];

    tpl.columns.forEach((col, colIdx) => {
      // Find matching header index by key or label
      let foundIdx = rawHeaders.findIndex((h) =>
        h.includes(col.key.toLowerCase()) ||
        col.label.toLowerCase().replace(/[^a-z0-9]/g, "").includes(h) ||
        (h && col.key.toLowerCase().includes(h))
      );

      let val = foundIdx !== -1 ? rowValues[foundIdx] : rowValues[colIdx];
      if (val === undefined || val === null || val === "") {
        val = col.default !== undefined ? col.default : "";
      }

      // Check required fields
      if (col.required && (val === "" || val === null || val === undefined)) {
        hasError = true;
        errorDetails.push(`Kolom '${col.label}' wajib diisi.`);
      }

      // Type checking: number
      if (col.type === "number") {
        const cleanNum = String(val).replace(/[^0-9.-]/g, "");
        const numVal = Number(cleanNum);
        if (isNaN(numVal)) {
          if (col.required) {
            hasError = true;
            errorDetails.push(`Kolom '${col.label}' harus berupa angka.`);
          } else {
            val = col.default || 0;
          }
        } else {
          val = numVal;
        }
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
  };
};
