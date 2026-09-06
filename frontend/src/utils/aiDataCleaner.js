/**
 * Klozer AI Auto-Clean & CRM Smart Sanitizer Engine
 * Automatically detects anomalies, normalizes phone numbers (+62), capitalizes names,
 * auto-categorizes products, and applies AI CRM segmentation labels on imported spreadsheets.
 */

// Helper to convert string to Title Case
function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

// Helper to normalize WhatsApp phone numbers into standard Indonesian +62 format
export function normalizePhoneNumber(phoneStr) {
  if (!phoneStr) return { phone: "+62 812-0000-0000", modified: false };
  let digits = String(phoneStr).replace(/[^0-9]/g, "");

  let modified = false;
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
    modified = true;
  } else if (digits.startsWith("8")) {
    digits = "628" + digits.slice(1);
    modified = true;
  } else if (!digits.startsWith("62")) {
    digits = "62" + digits;
    modified = true;
  }

  // Format as +62 8XX-XXXX-XXXX
  let formatted = "+" + digits;
  if (digits.length >= 10) {
    const part1 = digits.slice(0, 2); // 62
    const part2 = digits.slice(2, 5); // 812
    const part3 = digits.slice(5, 9); // 3456
    const part4 = digits.slice(9);    // 7890
    formatted = `+${part1} ${part2}-${part3}${part4 ? `-${part4}` : ""}`;
  }

  return { phone: formatted, modified };
}

// Helper to normalize city / address
export function normalizeCity(cityStr) {
  if (!cityStr) return { city: "Indonesia", modified: false };
  const raw = String(cityStr).toLowerCase().trim();
  let city = toTitleCase(cityStr);
  let modified = false;

  const cityMap = {
    jkt: "DKI Jakarta",
    jaksel: "Jakarta Selatan",
    jakbar: "Jakarta Barat",
    jakpus: "Jakarta Pusat",
    jaktim: "Jakarta Timur",
    jakut: "Jakarta Utara",
    bdg: "Bandung",
    sby: "Surabaya",
    solo: "Surakarta",
    slo: "Surakarta",
    jogja: "Yogyakarta",
    yk: "Yogyakarta",
    smg: "Semarang",
    dpk: "Depok",
    bgr: "Bogor",
    tgr: "Tangerang",
    bks: "Bekasi",
    mlg: "Malang",
  };

  if (cityMap[raw]) {
    city = cityMap[raw];
    modified = true;
  } else if (city !== cityStr) {
    modified = true;
  }

  return { city, modified };
}

// ==================== AI CLEANER: CONTACTS & CRM ====================
export function aiCleanContacts(contactsList) {
  let anomalyCount = 0;
  const repairsLog = [];

  const cleanedContacts = contactsList.map((item, idx) => {
    const changes = [];

    // 1. Clean Name (remove brackets/junk and Title Case)
    const rawName = String(item.name || "").replace(/[(){}[\]]/g, "").trim();
    const cleanName = toTitleCase(rawName) || `Pelanggan #${idx + 1}`;
    if (cleanName !== item.name) {
      changes.push("Nama distandarisasi ke Title Case");
    }

    // 2. Normalize WhatsApp Number
    const { phone: cleanPhone, modified: phoneMod } = normalizePhoneNumber(item.phone);
    if (phoneMod) {
      changes.push(`Nomor WA dinormalisasi ke format ${cleanPhone}`);
    }

    // 3. Normalize City
    const { city: cleanCity, modified: cityMod } = normalizeCity(item.city);
    if (cityMod) {
      changes.push(`Kota disesuaikan ke ${cleanCity}`);
    }

    // 4. Clean Total Spent (Number)
    let totalSpent = Number(item.totalSpent) || 0;
    if (typeof item.totalSpent === "string") {
      const cleanNum = Number(item.totalSpent.replace(/[^0-9.-]/g, ""));
      if (!isNaN(cleanNum)) totalSpent = cleanNum;
    }

    // 5. AI Auto-Tagging & CRM Classification
    let aiTag = item.category;
    if (!aiTag || aiTag === "Lead Baru" || aiTag === "Umum" || aiTag === "-") {
      if (totalSpent >= 1500000) {
        aiTag = "Pelanggan VIP";
        changes.push("AI Auto-Tag: 'Pelanggan VIP' (LTV > Rp 1.5jt)");
      } else if (totalSpent >= 300000) {
        aiTag = "Repeat Buyer";
        changes.push("AI Auto-Tag: 'Repeat Buyer' (Riwayat Belanja Aktif)");
      } else if (/grosir|reseller|partai|pt\b|cv\b|toko/i.test(cleanName + " " + String(item.email))) {
        aiTag = "B2B / Grosir";
        changes.push("AI Auto-Tag: 'B2B / Grosir' (Deteksi Entitas Bisnis)");
      } else {
        aiTag = "Lead Baru (Prospek)";
      }
    }

    if (changes.length > 0) {
      anomalyCount++;
      repairsLog.push({
        row: idx + 1,
        name: cleanName,
        changes,
      });
    }

    return {
      ...item,
      name: cleanName,
      phone: cleanPhone,
      city: cleanCity,
      totalSpent,
      category: aiTag,
      _aiRepaired: changes.length > 0,
      _aiChanges: changes,
    };
  });

  return {
    data: cleanedContacts,
    anomalyCount,
    repairsLog,
  };
}

// ==================== AI CLEANER: PRODUCTS ====================
export function aiCleanProducts(productsList) {
  let anomalyCount = 0;
  const repairsLog = [];

  const cleanedProducts = productsList.map((item, idx) => {
    const changes = [];

    // 1. Clean Title Case Name
    const cleanName = toTitleCase(String(item.name || "").trim()) || `Produk Baru #${idx + 1}`;
    if (cleanName !== item.name) {
      changes.push("Nama produk dirapikan ke Title Case");
    }

    // 2. SKU auto-formatting
    let cleanSku = String(item.sku || "").trim().toUpperCase();
    if (!cleanSku || cleanSku === "-") {
      const prefix = cleanName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "PRD");
      cleanSku = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      changes.push(`SKU dibuat otomatis (${cleanSku})`);
    }

    // 3. Price & HPP Numeric Cleanup
    let price = Number(item.price) || 0;
    let hpp = Number(item.hpp) || 0;

    if (price <= 0 && hpp > 0) {
      price = Math.round(hpp * 1.5);
      changes.push("Harga jual diestimasi otomatis (+50% margin HPP)");
    } else if (hpp <= 0 && price > 0) {
      hpp = Math.round(price * 0.55); // ~55% COGS default
      changes.push("HPP diestimasi otomatis (~55% dari harga jual)");
    }

    // 4. Auto-Infer Category if empty or General
    let category = item.category;
    if (!category || category === "Umum" || category === "-") {
      const lower = cleanName.toLowerCase();
      if (/ayam|geprek|nasi|bento|mie|bebek|ikan|sambal/i.test(lower)) {
        category = "Makanan Utama";
        changes.push("AI Deteksi Kategori: 'Makanan Utama'");
      } else if (/es\b|teh|kopi|jeruk|jus|drink|coffee|tea|lemon/i.test(lower)) {
        category = "Minuman Segar";
        changes.push("AI Deteksi Kategori: 'Minuman Segar'");
      } else if (/kulit|tahu|tempe|jamur|kentang|snack|kerupuk/i.test(lower)) {
        category = "Side Dish / Cemilan";
        changes.push("AI Deteksi Kategori: 'Side Dish / Cemilan'");
      } else if (/batik|baju|kemeja|kaos|daster|gamis|celana|rok/i.test(lower)) {
        category = "Fashion & Pakaian";
        changes.push("AI Deteksi Kategori: 'Fashion & Pakaian'");
      } else if (/serum|cream|lotion|facial|toner|sunscreen/i.test(lower)) {
        category = "Skincare & Beauty";
        changes.push("AI Deteksi Kategori: 'Skincare & Beauty'");
      } else {
        category = "Katalog Toko";
      }
    }

    // 5. Stock validation
    let stock = Number(item.stock) || 0;
    if (stock < 0) {
      stock = 0;
      changes.push("Nilai stok negatif diubah menjadi 0");
    }

    let lowStock = Number(item.lowStock) || 5;

    // 6. Variants Array Formatting
    let variants = item.variants;
    if (typeof variants === "string") {
      variants = variants
        .split(",")
        .map((v) => toTitleCase(v.trim()))
        .filter(Boolean);
    }
    if (!Array.isArray(variants) || !variants.length) {
      variants = ["Standard"];
    }

    if (changes.length > 0) {
      anomalyCount++;
      repairsLog.push({
        row: idx + 1,
        name: cleanName,
        changes,
      });
    }

    return {
      ...item,
      name: cleanName,
      sku: cleanSku,
      category,
      price,
      hpp,
      stock,
      lowStock,
      variants,
      _aiRepaired: changes.length > 0,
      _aiChanges: changes,
    };
  });

  return {
    data: cleanedProducts,
    anomalyCount,
    repairsLog,
  };
}

// ==================== AI CLEANER: STOCK ====================
export function aiCleanStock(stockList) {
  let anomalyCount = 0;
  const repairsLog = [];

  const cleanedStock = stockList.map((item, idx) => {
    const changes = [];
    const cleanSku = String(item.sku || "").trim().toUpperCase();

    let newStock = Number(item.newStock) || 0;
    if (newStock < 0) {
      newStock = 0;
      changes.push("Nilai stok opname negatif diubah ke 0");
    }

    let note = String(item.note || "Update Excel").trim();
    if (!note || note === "-") {
      note = "Penyesuaian stok opname Excel";
      changes.push("Catatan penyesuaian dilengkapi otomatis");
    }

    if (changes.length > 0) {
      anomalyCount++;
      repairsLog.push({
        row: idx + 1,
        name: cleanSku,
        changes,
      });
    }

    return {
      ...item,
      sku: cleanSku,
      newStock,
      note,
      _aiRepaired: changes.length > 0,
      _aiChanges: changes,
    };
  });

  return {
    data: cleanedStock,
    anomalyCount,
    repairsLog,
  };
}
