/**
 * Klozer AI HPP (Harga Pokok Penjualan) & Margin Intelligence Engine
 * Generates automated Bill of Materials (BOM), recipe ingredient costing,
 * overhead allocation, food cost ratio analysis, and multi-channel pricing simulation.
 */

// Sector-specific recipe & BOM templates for intelligent AI fallback
const INGREDIENT_KNOWLEDGE_BASE = {
  // F&B / Kuliner items
  geprek_ayam: {
    materials: [
      { name: "Ayam Potong Segar (1 Potong)", qty: "1 pcs", unitCost: 6500, category: "Bahan Utama" },
      { name: "Tepung Bumbu Crispy & Marinasi", qty: "60 gram", unitCost: 1400, category: "Bahan Utama" },
      { name: "Minyak Goreng & Gas (Porsi Goreng)", qty: "1 porsi", unitCost: 1200, category: "Overhead / Gas" },
      { name: "Cabai Rawit Merah & Bawang Putih (Sambal)", qty: "30 gram", unitCost: 1800, category: "Bumbu & Sambal" },
      { name: "Beras Pulen (Nasi 1 Porsi)", qty: "150 gram", unitCost: 1800, category: "Bahan Pokok" },
      { name: "Kemasan Paper Lunch Box + Kertas Minyak", qty: "1 set", unitCost: 900, category: "Packaging" },
      { name: "Sendok Plastik & Plastik Klip", qty: "1 set", unitCost: 300, category: "Packaging" },
    ],
    targetMargin: 50,
    idealFoodCostRatio: 45,
    tips: "Food cost ratio ideal di 40-48%. Tambahkan paket bundling dengan Es Teh Jumbo (Margin >75%) untuk mendongkrak margin rata-rata cabang.",
  },
  mozzarella: {
    materials: [
      { name: "Ayam Potong Segar (1 Potong)", qty: "1 pcs", unitCost: 6500, category: "Bahan Utama" },
      { name: "Keju Mozzarella Melted", qty: "35 gram", unitCost: 3200, category: "Bahan Tambahan" },
      { name: "Tepung Bumbu Crispy & Marinasi", qty: "60 gram", unitCost: 1400, category: "Bahan Utama" },
      { name: "Cabai & Bumbu Sambal Korek", qty: "25 gram", unitCost: 1500, category: "Bumbu & Sambal" },
      { name: "Gas Torch & Minyak Goreng", qty: "1 porsi", unitCost: 1200, category: "Overhead / Gas" },
      { name: "Paper Box Tebal & Alat Makan", qty: "1 set", unitCost: 1100, category: "Packaging" },
    ],
    targetMargin: 52,
    idealFoodCostRatio: 48,
    tips: "Keju mozzarella menyumbang 22% dari total HPP. Gunakan keju blok curah untuk diparut sendiri guna memangkas HPP hingga Rp 800/porsi.",
  },
  kulit_crispy: {
    materials: [
      { name: "Kulit Ayam Segar Bersih", qty: "120 gram", unitCost: 3800, category: "Bahan Utama" },
      { name: "Tepung Crispy & Seasoning Gurih", qty: "50 gram", unitCost: 1200, category: "Bahan Utama" },
      { name: "Minyak Goreng Deep Fry & Gas", qty: "1 porsi", unitCost: 1000, category: "Overhead / Gas" },
      { name: "Bumbu Tabur / Sambal Cocol", qty: "1 porsi", unitCost: 800, category: "Bumbu & Sambal" },
      { name: "Kantong Kertas Greaseproof / Box Snack", qty: "1 pcs", unitCost: 600, category: "Packaging" },
    ],
    targetMargin: 58,
    idealFoodCostRatio: 40,
    tips: "Menu side dish memiliki margin sangat tinggi (58-65%). Sangat bagus diposisikan sebagai Add-on wajib saat closing chat WhatsApp.",
  },
  minuman_teh: {
    materials: [
      { name: "Biang Teh Tubruk Melati Premium", qty: "1 porsi", unitCost: 400, category: "Bahan Utama" },
      { name: "Gula Pasir Asli Cair", qty: "30 gram", unitCost: 500, category: "Bahan Pokok" },
      { name: "Es Batu Kristal Higienis", qty: "1 porsi", unitCost: 300, category: "Bahan Utama" },
      { name: "Cup Plastik Sablon Logo 22oz + Sedotan", qty: "1 set", unitCost: 600, category: "Packaging" },
      { name: "Plastik Cup Sealer & Kresek Takeaway", qty: "1 set", unitCost: 150, category: "Packaging" },
    ],
    targetMargin: 70,
    idealFoodCostRatio: 30,
    tips: "Minuman adalah 'Profit Driver' utama F&B dengan margin >70%. Selalu buat strategi 'Upsell Es Teh Jumbo hanya tambah Rp 3.000'.",
  },
  minuman_kopi: {
    materials: [
      { name: "Biji Kopi Espresso Blend (House Blend)", qty: "18 gram", unitCost: 3200, category: "Bahan Utama" },
      { name: "Susu Fresh Milk UHT Full Cream", qty: "120 ml", unitCost: 2400, category: "Bahan Utama" },
      { name: "Sirup Gula Aren Organik", qty: "25 ml", unitCost: 900, category: "Bumbu & Perasa" },
      { name: "Cup Plastik Emboss 16oz + Tutup Lid", qty: "1 set", unitCost: 850, category: "Packaging" },
      { name: "Sedotan Ramah Lingkungan & Tissue", qty: "1 set", unitCost: 250, category: "Packaging" },
    ],
    targetMargin: 60,
    idealFoodCostRatio: 38,
    tips: "Susu adalah komponen biaya terbesar (35% HPP). Pantau volume susu per takaran jigger untuk menjaga konsistensi laba bersih.",
  },
  fashion_batik: {
    materials: [
      { name: "Kain Katun Primisima Mori Batik", qty: "2.2 meter", unitCost: 65000, category: "Bahan Utama" },
      { name: "Pewarnaan & Canting Lilin Tradisional", qty: "1 potong", unitCost: 28000, category: "Proses Produksi" },
      { name: "Furing Katun Hero Adem", qty: "1.5 meter", unitCost: 18000, category: "Bahan Tambahan" },
      { name: "Kancing Batok & Benang Jahit", qty: "1 set", unitCost: 5000, category: "Aksesoris" },
      { name: "Ongkos Jahit Standar Tailor Halusan", qty: "1 pcs", unitCost: 35000, category: "Tenaga Kerja" },
      { name: "Ziplock Bag Premium & Hangtag Brand", qty: "1 set", unitCost: 4500, category: "Packaging" },
    ],
    targetMargin: 55,
    idealFoodCostRatio: 45,
    tips: "HPP produksi pakaian halusan berada di margin 55-60%. Sisihkan buffer 5% HPP untuk mengantisipasi retur size atau garansi tukar.",
  },
  skincare_serum: {
    materials: [
      { name: "Active Ingredients (Niacinamide + HA)", qty: "30 ml", unitCost: 24000, category: "Formula & Bahan Aktif" },
      { name: "Botol Pipet Kaca Dropper Frost 30ml", qty: "1 pcs", unitCost: 8500, category: "Packaging Primer" },
      { name: "Box Karton Doff UV Emboss", qty: "1 pcs", unitCost: 3500, category: "Packaging Sekunder" },
      { name: "Ongkos Laboratorium Maklon & Uji BPOM", qty: "1 unit", unitCost: 12000, category: "Produksi & Regulasi" },
      { name: "Segel Plastik Shrink & Stiker Hologram", qty: "1 set", unitCost: 1000, category: "Keamanan Produk" },
    ],
    targetMargin: 68,
    idealFoodCostRatio: 32,
    tips: "Skincare memiliki margin tebal (65-75%) karena membutuhkan alokasi budget marketing iklan Meta Ads/TikTok Ads yang lebih tinggi (20-25%).",
  },
};

/**
 * Generate AI Breakdown of Ingredients & Calculate HPP
 */
export function generateAiHppBreakdown({
  name = "Produk",
  category = "Kuliner",
  currentPrice = 0,
  currentHpp = 0,
  targetMargin = 50,
}) {
  const cleanName = String(name || "").toLowerCase();
  let baseTemplate = null;

  if (/geprek|ayam/i.test(cleanName) && /keju|mozz/i.test(cleanName)) {
    baseTemplate = INGREDIENT_KNOWLEDGE_BASE.mozzarella;
  } else if (/geprek|ayam|bebek/i.test(cleanName)) {
    baseTemplate = INGREDIENT_KNOWLEDGE_BASE.geprek_ayam;
  } else if (/kulit|jamur|tahu|tempe|snack|gorengan/i.test(cleanName)) {
    baseTemplate = INGREDIENT_KNOWLEDGE_BASE.kulit_crispy;
  } else if (/kopi|coffee|latte|espresso/i.test(cleanName)) {
    baseTemplate = INGREDIENT_KNOWLEDGE_BASE.minuman_kopi;
  } else if (/teh|jeruk|jus|lemon|minum|drink/i.test(cleanName)) {
    baseTemplate = INGREDIENT_KNOWLEDGE_BASE.minuman_teh;
  } else if (/batik|kemeja|baju|daster|gamis|tunik/i.test(cleanName)) {
    baseTemplate = INGREDIENT_KNOWLEDGE_BASE.fashion_batik;
  } else if (/serum|cream|skincare|facial|toner|sunscreen/i.test(cleanName)) {
    baseTemplate = INGREDIENT_KNOWLEDGE_BASE.skincare_serum;
  } else {
    // Universal Smart Fallback
    const estimatedCost = currentPrice > 0 ? Math.round(currentPrice * 0.45) : currentHpp > 0 ? currentHpp : 12000;
    baseTemplate = {
      materials: [
        { name: `Bahan Baku Utama (${name})`, qty: "1 unit", unitCost: Math.round(estimatedCost * 0.65), category: "Bahan Utama" },
        { name: "Bahan Pendukung & Operasional", qty: "1 paket", unitCost: Math.round(estimatedCost * 0.20), category: "Operasional" },
        { name: "Kemasan & Packaging Brand", qty: "1 set", unitCost: Math.round(estimatedCost * 0.15), category: "Packaging" },
      ],
      targetMargin: targetMargin || 50,
      idealFoodCostRatio: 45,
      tips: `Kalkulasi estimasi HPP untuk ${name}. Sesuaikan rincian bahan di tabel untuk mencerminkan biaya produksi riil dapur/gudang Anda.`,
    };
  }

  // Calculate Total HPP
  const materials = JSON.parse(JSON.stringify(baseTemplate.materials));
  const totalHpp = materials.reduce((acc, m) => acc + (Number(m.unitCost) || 0), 0);

  // Recommended Price based on target margin
  const marginPercent = targetMargin || baseTemplate.targetMargin || 50;
  const recommendedPrice = Math.ceil((totalHpp / (1 - marginPercent / 100)) / 1000) * 1000;

  // Active selling price
  const activePrice = currentPrice > 0 ? currentPrice : recommendedPrice;
  const grossProfit = activePrice - totalHpp;
  const actualGrossMarginPercent = activePrice > 0 ? Math.round((grossProfit / activePrice) * 100) : 0;
  const foodCostRatio = activePrice > 0 ? Math.round((totalHpp / activePrice) * 100) : 0;

  // Multi-Channel Pricing Simulation (GoFood / ShopeeFood / WhatsApp Direct)
  const channelSimulations = [
    {
      channel: "WhatsApp Direct / Dine-In",
      commissionRate: 0,
      paymentGatewayFee: 0.7, // QRIS 0.7%
      suggestedPrice: activePrice,
      netProfit: Math.round(grossProfit - (activePrice * 0.007)),
      netMarginPercent: Math.round(((grossProfit - (activePrice * 0.007)) / activePrice) * 100),
      note: "Margin Paling Bersih (100% Milik Toko)",
    },
    {
      channel: "Aplikasi Ojol (GoFood / GrabFood)",
      commissionRate: 20, // 20% Merchant fee
      paymentGatewayFee: 0,
      suggestedPrice: Math.ceil((activePrice * 1.25) / 1000) * 1000,
      netProfit: Math.round(activePrice * 1.25 * 0.8 - totalHpp),
      netMarginPercent: Math.round(((activePrice * 1.25 * 0.8 - totalHpp) / (activePrice * 1.25)) * 100),
      note: "Harga dinaikkan 25% untuk cover fee komisi ojol 20%",
    },
    {
      channel: "COD WhatsApp (Kurir Ekspedisi)",
      commissionRate: 0,
      paymentGatewayFee: 3.0, // COD Fee 3% + RTS risk buffer 2%
      suggestedPrice: activePrice,
      netProfit: Math.round(grossProfit - (activePrice * 0.05)),
      netMarginPercent: Math.round(((grossProfit - (activePrice * 0.05)) / activePrice) * 100),
      note: "Potongan COD fee & buffer risiko retur RTS",
    },
  ];

  // Food Cost Health Status
  let healthStatus = "safe"; // safe | warning | danger
  let healthLabel = "Sangat Sehat & Menguntungkan";
  let healthColor = "text-emerald-700 bg-emerald-50 border-emerald-200";

  if (foodCostRatio > 55) {
    healthStatus = "danger";
    healthLabel = "Biaya HPP Terlalu Tinggi (>55%)";
    healthColor = "text-rose-700 bg-rose-50 border-rose-200";
  } else if (foodCostRatio > 45) {
    healthStatus = "warning";
    healthLabel = "Batas Wajar / Menengah (45-55%)";
    healthColor = "text-amber-800 bg-amber-50 border-amber-200";
  }

  return {
    name,
    category,
    materials,
    totalHpp,
    recommendedPrice,
    activePrice,
    grossProfit,
    actualGrossMarginPercent,
    foodCostRatio,
    targetMargin: marginPercent,
    healthStatus,
    healthLabel,
    healthColor,
    tips: baseTemplate.tips,
    channelSimulations,
  };
}
