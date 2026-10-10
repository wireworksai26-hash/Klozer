import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { initDb, closeDb } from "../config/db.js";
import { logger } from "../config/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const LOCK_NAME = "klozer_schema_migrations";

// MySQL errno values that mean "this change is already applied".
const ALREADY_APPLIED = new Set([1050, 1060, 1061, 1091]);

function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Apply every pending `migrations/NNN_name.sql` in order. Failures are fatal:
 * a half-migrated schema must stop the deploy, not start a server on top of it.
 */
export async function runMigrations() {
  const pool = await initDb();
  const conn = await pool.getConnection();

  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK(?, 60) AS acquired", [LOCK_NAME]);
    if (!lock.acquired) throw new Error("Tidak bisa memperoleh migration lock (proses lain sedang migrasi).");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) NOT NULL PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const [appliedRows] = await conn.query("SELECT version, checksum FROM schema_migrations");
    const applied = new Map(appliedRows.map((r) => [r.version, r.checksum]));

    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    let ran = 0;

    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");

      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          throw new Error(`Migrasi ${file} sudah diterapkan tetapi isinya berubah. Buat file migrasi baru, jangan edit yang lama.`);
        }
        continue;
      }

      logger.info({ migration: file }, "Applying migration");
      for (const statement of splitStatements(sql)) {
        try {
          await conn.query(statement);
        } catch (err) {
          if (ALREADY_APPLIED.has(err.errno)) {
            logger.warn({ migration: file, err: err.message }, "Skipping statement that is already applied");
            continue;
          }
          throw new Error(`Migrasi ${file} gagal: ${err.message}\nSQL: ${statement.slice(0, 200)}`, { cause: err });
        }
      }
      await conn.query("INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)", [file, checksum]);
      ran++;
    }

    logger.info({ applied: ran, total: files.length }, "Migrations up to date");
    return ran;
  } finally {
    try {
      await conn.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
    } catch {
      // lock is released automatically when the connection closes
    }
    conn.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err: err.message }, "Migration failed");
      process.exit(1);
    });
}
