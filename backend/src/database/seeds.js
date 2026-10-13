import path from "path";
import { fileURLToPath } from "url";
import { initDb, closeDb, queryOne, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { hashPassword } from "../utils/crypto.js";
import { DEFAULT_FEATURES } from "../utils/constants.js";
import { runMigrations } from "./migrate.js";

/**
 * LOCAL DEVELOPMENT DATA ONLY. Refuses to run in production.
 * Creates two demo tenants (idempotent) so the dashboard has something to show.
 */
const DEMO_PASSWORD = process.env.SEED_PASSWORD || "DemoPass123!";

const TENANTS = [
  {
    name: "Batik Mahakarya Solo",
    slug: "batik-mahakarya-solo",
    sector: "Fashion & Retail",
    users: [
      ["Hendra Wijaya (Owner)", "owner@batikmahakarya.test", "owner", 0],
      ["Siti Rahma (CS 1)", "siti@batikmahakarya.test", "cs", 5],
      ["Ratna Sari (Finance)", "finance@batikmahakarya.test", "finance", 0],
    ],
    products: [
      ["BTK-SLK-01", "Kemeja Batik Tulis Sutra Solo Premium", "Pria", 650000, 380000, 42],
      ["BTK-DMS-02", "Dress Tunik Katun Primisima Parang", "Wanita", 320000, 160000, 85],
      ["BTK-SRG-03", "Sarung Batik Cap Sidomukti", "Aksesoris", 185000, 90000, 120],
    ],
  },
  {
    name: "Geprek Juara",
    slug: "geprek-juara",
    sector: "Kuliner & F&B",
    users: [
      ["SPV - Geprek Juara", "spv@geprekjuara.test", "owner", 0],
      ["CS 1 - Geprek Juara", "cs1@geprekjuara.test", "cs", 5],
    ],
    products: [
      ["GJ-001", "Paket Juara 1 (Nasi + Ayam Geprek + Es Teh)", "Paket Hemat", 22000, 11000, 120],
      ["GJ-002", "Ayam Geprek Mozzarella", "Menu Spesial", 26000, 13000, 60],
      ["GJ-003", "Es Teh Manis Jumbo", "Minuman", 5000, 1500, 300],
    ],
  },
];

export async function seedDemoData() {
  if (config.isProduction) throw new Error("Seeding demo data dilarang di production.");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const t of TENANTS) {
    if (await queryOne("SELECT id FROM institutions WHERE slug = ?", [t.slug])) {
      logger.info({ tenant: t.slug }, "Seed skipped (already exists)");
      continue;
    }
    await transaction(async (tx) => {
      const inst = await tx.query(
        `INSERT INTO institutions (name, slug, mode, sector, email, subscription_tier, blast_credit_quota, ai_token_quota, features_json)
         VALUES (?, ?, 'business', ?, ?, 'pro', 5000, 1500000, ?)`,
        [t.name, t.slug, t.sector, t.users[0][1], JSON.stringify(DEFAULT_FEATURES)]
      );
      for (const [name, email, role, rate] of t.users) {
        await tx.query(
          "INSERT INTO users (institution_id, name, email, password_hash, role, commission_rate_percent) VALUES (?, ?, ?, ?, ?, ?)",
          [inst.insertId, name, email, passwordHash, role, rate]
        );
      }
      for (const [sku, name, category, price, hpp, stock] of t.products) {
        await tx.query(
          "INSERT INTO products (institution_id, sku, name, category, selling_price, cost_price_hpp, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [inst.insertId, sku, name, category, price, hpp, stock]
        );
      }
    });
    logger.info({ tenant: t.slug }, "Seeded demo tenant");
  }
  logger.info(`Demo logins use password: ${DEMO_PASSWORD}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  initDb()
    .then(runMigrations)
    .then(seedDemoData)
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err: err.message }, "Seeding failed");
      process.exit(1);
    });
}
