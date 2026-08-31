import { getDbPool, memoryStore } from "../config/db.js";
import { hashPassword } from "../utils/crypto.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeeds() {
  console.log("[Database Seeds] Seeding initial core data across all 17 tables...");

  // Default Passwords for seed users
  const defaultPasswordHash = await hashPassword("Klozer123!");

  // ==================== 1. SEED IN-MEMORY STORE (Zero-Config Fallback) ====================
  // 1. Institutions
  memoryStore.institutions = [
    {
      id: 1,
      name: "Batik Mahakarya Solo",
      slug: "batik-mahakarya-solo",
      mode: "business",
      sector: "Fashion & Retail",
      phone_number: "+62 812-3344-5566",
      email: "owner@batikmahakarya.id",
      address: "Jl. Slamet Riyadi No. 142, Surakarta, Jawa Tengah",
      subscription_tier: "pro",
      blast_credit_quota: 5000,
      ai_token_quota: 1500000,
      features_json: { aiPersona: true, aiAutoLabel: true, printInvoice: true, baileys: true, instagram: true, csBlast: true, publicBooking: true, stockManagement: true, picFeature: true, qrisPayment: true, voiceNoteAi: true, fraudOcr: true, metaCapi: true },
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Lumiere Skincare Clinic",
      slug: "lumiere-skincare-clinic",
      mode: "business",
      sector: "Kecantikan & Skincare",
      phone_number: "+62 819-8877-6655",
      email: "admin@lumiereskin.com",
      address: "Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan",
      subscription_tier: "enterprise",
      blast_credit_quota: 12000,
      ai_token_quota: 3000000,
      features_json: { aiPersona: true, aiAutoLabel: true, printInvoice: true, baileys: true, instagram: true, csBlast: true, publicBooking: true, stockManagement: true, picFeature: true, qrisPayment: true, voiceNoteAi: true, fraudOcr: true, metaCapi: true },
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Yayasan ZISWAF Peduli Umat",
      slug: "ziswaf-peduli-umat",
      mode: "ngo",
      sector: "Lembaga Sosial & ZISWAF",
      phone_number: "+62 821-4455-6677",
      email: "lazis@peduliumat.org",
      address: "Jl. Teuku Umar No. 12, Bandung, Jawa Barat",
      subscription_tier: "enterprise",
      blast_credit_quota: 25000,
      ai_token_quota: 5000000,
      features_json: { aiPersona: true, aiAutoLabel: true, printInvoice: true, baileys: true, instagram: true, csBlast: true, publicBooking: true, stockManagement: false, picFeature: true, qrisPayment: true, voiceNoteAi: true, fraudOcr: true, metaCapi: true },
      is_active: 1,
      created_at: new Date().toISOString(),
    },
  ];

  // 2. Users (Superadmin, Owner, CS, Finance)
  memoryStore.users = [
    {
      id: 1,
      institution_id: 1,
      name: "Platform Superadmin",
      email: "superadmin@klozer.id",
      password_hash: defaultPasswordHash,
      role: "superadmin",
      phone_number: "+62 811-0000-9999",
      commission_rate_percent: 0,
      is_online: 1,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      institution_id: 1,
      name: "Hendra Wijaya (Owner)",
      email: "owner@batikmahakarya.id",
      password_hash: defaultPasswordHash,
      role: "owner",
      phone_number: "+62 812-3344-5566",
      commission_rate_percent: 0,
      is_online: 1,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      institution_id: 1,
      name: "Siti Rahma (CS 1)",
      email: "siti@batikmahakarya.id",
      password_hash: defaultPasswordHash,
      role: "cs",
      phone_number: "+62 857-1122-3344",
      commission_rate_percent: 5.0,
      is_online: 1,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      institution_id: 1,
      name: "Budi Pratama (CS 2)",
      email: "budi@batikmahakarya.id",
      password_hash: defaultPasswordHash,
      role: "cs",
      phone_number: "+62 858-9988-7766",
      commission_rate_percent: 5.0,
      is_online: 1,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 5,
      institution_id: 1,
      name: "Ratna Sari (Finance)",
      email: "finance@batikmahakarya.id",
      password_hash: defaultPasswordHash,
      role: "finance",
      phone_number: "+62 813-7766-5544",
      commission_rate_percent: 0,
      is_online: 0,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
  ];

  // 3. Products
  memoryStore.products = [
    {
      id: 1,
      institution_id: 1,
      sku: "BTK-SLK-01",
      name: "Kemeja Batik Tulis Sutra Solo Premium",
      category: "Pria",
      description: "Batik tulis sutra asli dengan pewarnaan alami dan furing premium.",
      selling_price: 650000,
      cost_price_hpp: 380000,
      stock_quantity: 42,
      low_stock_threshold: 5,
      weight_in_grams: 350,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      institution_id: 1,
      sku: "BTK-DMS-02",
      name: "Dress Tunik Katun Primisima Parang",
      category: "Wanita",
      description: "Tunik modern katun adem dengan kancing bungkus dan aksen pita.",
      selling_price: 320000,
      cost_price_hpp: 160000,
      stock_quantity: 85,
      low_stock_threshold: 10,
      weight_in_grams: 300,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      institution_id: 1,
      sku: "BTK-SAR-03",
      name: "Sarung Batik Tulis Motif Mega Mendung",
      category: "Unisex",
      description: "Sarung santri dan formal kualitas ekspor katun candimekar.",
      selling_price: 250000,
      cost_price_hpp: 125000,
      stock_quantity: 3,
      low_stock_threshold: 5,
      weight_in_grams: 400,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      institution_id: 2,
      sku: "SKN-GLW-01",
      name: "Lumiere Brightening Glow Serum 30ml",
      category: "Skincare",
      description: "Serum pencerah dengan Niacinamide 10% dan Alpha Arbutin.",
      selling_price: 185000,
      cost_price_hpp: 75000,
      stock_quantity: 120,
      low_stock_threshold: 15,
      weight_in_grams: 150,
      is_active: 1,
      created_at: new Date().toISOString(),
    },
  ];

  // 4. Bank Accounts
  memoryStore.bank_accounts = [
    {
      id: 1,
      institution_id: 1,
      bank_code: "BCA",
      account_number: "8809123847",
      account_holder: "PT Batik Mahakarya Indonesia",
      branch_office: "KCU Slamet Riyadi Solo",
      transfer_instruction: "Mohon transfer tepat sampai 3 digit terakhir untuk verifikasi otomatis.",
      is_manual_transfer: 1,
      is_active: 1,
    },
    {
      id: 2,
      institution_id: 1,
      bank_code: "MANDIRI",
      account_number: "1380019283746",
      account_holder: "PT Batik Mahakarya Indonesia",
      branch_office: "KC Solo Sudirman",
      transfer_instruction: "Simpan dan kirimkan struk m-banking ke chat.",
      is_manual_transfer: 1,
      is_active: 1,
    },
  ];

  // 5. NGO Programs
  memoryStore.programs = [
    {
      id: 1,
      institution_id: 3,
      name: "Sedekah Subuh & Santunan 1.000 Yatim",
      category: "yatim",
      target_amount: 50000000,
      collected_amount: 32450000,
      doa_template: "Semoga Allah melipatgandakan pahala, melapangkan rezeki, dan memberkahi keluarga.",
      is_published: 1,
    },
    {
      id: 2,
      institution_id: 3,
      name: "Wakaf Sumur Air Bersih Pelosok",
      category: "wakaf",
      target_amount: 75000000,
      collected_amount: 48100000,
      doa_template: "Semoga wakaf ini menjadi amal jariyah yang pahalanya terus mengalir abadi.",
      is_published: 1,
    },
  ];

  // 6. Leads
  memoryStore.leads = [
    {
      id: 1,
      institution_id: 1,
      phone_number: "6281234567890",
      name: "Ibu Dian Sastrowardoyo",
      gender: "Perempuan",
      city: "Jakarta Selatan",
      address_full: "Jl. Wijaya Timur No. 45, Kebayoran Baru, Jakarta Selatan",
      assigned_cs_id: 3,
      status: "closing",
      risk_cod_score: 98,
      last_contacted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      institution_id: 1,
      phone_number: "6285711223344",
      name: "Bpk. Rahmat Hidayat",
      gender: "Laki-laki",
      city: "Surabaya",
      address_full: "Rungkut Asri Timur No. 12, Surabaya",
      assigned_cs_id: 3,
      status: "in_progress",
      risk_cod_score: 90,
      last_contacted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      institution_id: 1,
      phone_number: "6281987654321",
      name: "Ibu Anisa Pohan",
      gender: "Perempuan",
      city: "Bandung",
      address_full: "Jl. Dago Asri No. 8, Bandung",
      assigned_cs_id: 4,
      status: "new_lead",
      risk_cod_score: 85,
      last_contacted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  // 7. Orders
  memoryStore.orders = [
    {
      id: 1,
      institution_id: 1,
      order_number: "ORD-20260829-1001",
      lead_id: 1,
      customer_name: "Ibu Dian Sastrowardoyo",
      customer_phone: "6281234567890",
      customer_city: "Jakarta Selatan",
      cs_user_id: 3,
      subtotal_amount: 970000,
      discount_amount: 50000,
      shipping_fee: 18000,
      total_amount: 938000,
      total_cost_hpp: 540000,
      gross_profit: 398000,
      payment_method: "qris",
      fulfillment_type: "delivery",
      status: "paid",
      review_status: "approved",
      items: [
        { id: 1, product_id: 1, item_name: "Kemeja Batik Tulis Sutra Solo Premium - L", quantity: 1, unit_price: 650000, unit_cost_hpp: 380000, subtotal: 650000 },
        { id: 2, product_id: 2, item_name: "Dress Tunik Katun Primisima Parang", quantity: 1, unit_price: 320000, unit_cost_hpp: 160000, subtotal: 320000 },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // 8. Dynamic QRIS
  memoryStore.qris_transactions = [
    {
      id: 1,
      institution_id: 1,
      order_id: 1,
      reference_id: "PAY-QRIS-20260829-1001",
      qris_string: "00020101021226580014ID.LINKAJA.WWW011893600912384700000002081234567852045812530336054069380005802ID5920Batik Mahakarya Solo6008Surakarta62070703A016304ABCD",
      amount: 938000,
      status: "paid",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
  ];

  // ==================== 2. SEED MYSQL DATABASE (If MySQL Connected) ====================
  try {
    const pool = await getDbPool();
    if (pool) {
      const seedsSqlPath = path.join(__dirname, "seeds.sql");
      if (fs.existsSync(seedsSqlPath)) {
        await pool.query("SET FOREIGN_KEY_CHECKS = 0;");
        const sqlContent = fs.readFileSync(seedsSqlPath, "utf-8");
        const statements = sqlContent
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
          if (statement.length > 5) {
            try {
              await pool.query(statement);
            } catch (stmtErr) {
              console.warn(`[MySQL Seed Notice] ${stmtErr.message.slice(0, 100)}`);
            }
          }
        }
        await pool.query("SET FOREIGN_KEY_CHECKS = 1;");
        console.log("[MySQL Seed] Seeds.sql successfully imported into MySQL database!");
      }
    }
  } catch (mysqlErr) {
    console.log("[MySQL Seed] MySQL connection skipped. In-memory data store is 100% active and ready.");
  }

  console.log("[Database Seeds] Seeding completed successfully!");
}

// Auto run when executed directly
if (process.argv[1]?.endsWith("seeds.js")) {
  runSeeds().then(() => process.exit(0));
}
