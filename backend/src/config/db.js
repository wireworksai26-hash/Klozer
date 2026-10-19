import mysql from "mysql2/promise";
import { config } from "./env.js";
import { logger } from "./logger.js";

let pool = null;

const POOL_OPTIONS = () => ({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.poolSize,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: "utf8mb4",
  timezone: "Z",
  decimalNumbers: true,
  connectTimeout: 10000,
});

async function ensureDatabaseExists() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }
}

/**
 * Connect to MySQL. There is deliberately no in-memory fallback: if the
 * database is unreachable the process must fail instead of silently serving
 * data that disappears on restart.
 */
export async function initDb({ retries = 10, delayMs = 3000 } = {}) {
  if (pool) return pool;

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (config.db.createDatabaseIfMissing) await ensureDatabaseExists();
      const candidate = mysql.createPool(POOL_OPTIONS());
      // Keep NOW()/CURRENT_TIMESTAMP in UTC so they agree with the driver's timezone: 'Z'.
      candidate.on("connection", (c) => c.query("SET time_zone = '+00:00'"));
      const conn = await candidate.getConnection();
      await conn.query("SELECT 1");
      conn.release();
      pool = candidate;
      logger.info({ host: config.db.host, database: config.db.database }, "Database connected");
      return pool;
    } catch (err) {
      lastError = err;
      logger.warn({ attempt, retries, err: err.message }, "Database not reachable, retrying");
      if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Tidak dapat terhubung ke MySQL setelah ${retries} percobaan: ${lastError?.message}`);
}

export function getPool() {
  if (!pool) throw new Error("Database belum diinisialisasi. Panggil initDb() lebih dulu.");
  return pool;
}

/** Run a statement and return rows (SELECT) or the result header (INSERT/UPDATE/DELETE). */
export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

const DEADLOCK = 1213;
const LOCK_WAIT_TIMEOUT = 1205;

/**
 * Run `fn` inside a transaction. `tx.query` / `tx.queryOne` mirror the helpers
 * above but share one connection. Commits on success, rolls back on any throw,
 * and retries once on deadlock.
 */
/**
 * Run a single statement (or a small group of them) again when MySQL picks it as the victim of a deadlock. An
 * "insert or update this row" on a table with two unique keys can deadlock with an identical statement running at the
 * same moment; the loser is safe to repeat.
 */
export async function retryOnDeadlock(fn, { attempts = 4 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.errno !== DEADLOCK || attempt >= attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 10 * attempt + Math.floor(Math.random() * 25)));
    }
  }
}

export async function transaction(fn, { attempts = 2 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const conn = await getPool().getConnection();
    try {
      await conn.beginTransaction();
      const tx = {
        query: async (sql, params = []) => (await conn.query(sql, params))[0],
        queryOne: async (sql, params = []) => {
          const [rows] = await conn.query(sql, params);
          return rows.length ? rows[0] : null;
        },
      };
      const result = await fn(tx);
      await conn.commit();
      return result;
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // connection already broken; release below discards it
      }
      if ((err.errno === DEADLOCK || err.errno === LOCK_WAIT_TIMEOUT) && attempt < attempts) {
        continue;
      }
      throw err;
    } finally {
      conn.release();
    }
  }
}

export async function pingDb() {
  const started = process.hrtime.bigint();
  await query("SELECT 1");
  return Number(process.hrtime.bigint() - started) / 1e6;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export default { query, queryOne, transaction, retryOnDeadlock, initDb, getPool, pingDb, closeDb };
