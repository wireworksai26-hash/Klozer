import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query, getDbPool } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log("[Migration] Connecting to database...");
  await getDbPool();

  const migrationFile = path.join(__dirname, "migrations", "20260911_add_webhook_logs.sql");
  const sql = fs.readFileSync(migrationFile, "utf-8");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    console.log("[Migration] Executing statement...");
    await query(statement);
  }

  console.log("[Migration] All migrations executed successfully! ✅");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("[Migration Error]", err);
  process.exit(1);
});
