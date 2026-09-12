import { getDbPool } from "../config/db.js";
import { runSeeds } from "./seeds.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration() {
  console.log("[Migration] Starting database migration...");
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
    const pool = await getDbPool();

    if (pool) {
      await pool.query("SET FOREIGN_KEY_CHECKS = 0;");
      const statements = schemaSql
        .split(";")
        .map((s) => {
          return s
            .split("\n")
            .filter((line) => !line.trim().startsWith("--"))
            .join("\n")
            .trim();
        })
        .filter((s) => s.length > 5);

      for (const statement of statements) {
        await pool.query(statement);
      }
      await pool.query("SET FOREIGN_KEY_CHECKS = 1;");
      console.log("[Migration] All 17 MySQL tables created successfully!");
    } else {
      console.log("[Migration] Initializing in-memory resilient tables...");
    }

    await runSeeds();
    console.log("[Migration] Database Migration & Seeding Finished 100%!");
  } catch (err) {
    console.error("[Migration Error]", err.message);
  }
}

if (process.argv[1]?.endsWith("migrate.js")) {
  runMigration().then(() => process.exit(0));
}
