import "./setupEnv.js";
import mysql from "mysql2/promise";
import request from "supertest";
import { config } from "../src/config/env.js";
import { closeDb, initDb, query } from "../src/config/db.js";
import { runMigrations } from "../src/database/migrate.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/crypto.js";
import { DEFAULT_FEATURES } from "../src/utils/constants.js";

export const PASSWORD = "Str0ngPassw0rd!";
let passwordHash;
let app;

async function adminConnection() {
  return mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password });
}

/** Fresh, fully migrated database for this test file. */
export async function setupDatabase() {
  const admin = await adminConnection();
  await admin.query(`DROP DATABASE IF EXISTS \`${config.db.database}\``);
  await admin.end();
  await initDb({ retries: 3, delayMs: 500 });
  await runMigrations();
  passwordHash = await hashPassword(PASSWORD);
  app = createApp();
  return app;
}

export async function teardownDatabase() {
  await closeDb();
  const admin = await adminConnection();
  await admin.query(`DROP DATABASE IF EXISTS \`${config.db.database}\``);
  await admin.end();
}

export const api = () => request(app);

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function createInstitution(overrides = {}) {
  const id = uniq();
  const result = await query(
    `INSERT INTO institutions (name, slug, email, subscription_tier, ai_token_quota, features_json)
     VALUES (?, ?, ?, 'pro', ?, ?)`,
    [overrides.name || `Toko ${id}`, overrides.slug || `toko-${id}`, `owner@${id}.test`, overrides.ai_token_quota ?? 1000000, JSON.stringify(DEFAULT_FEATURES)]
  );
  // The fast path answers short routine messages itself, so most tests (which check what the model is asked and says)
  // start with it off. The fast path tests ask for it with `fastPath: true`.
  if (overrides.fastPath !== true) await query("INSERT INTO fast_path_settings (institution_id, enabled, topics_json) VALUES (?, 0, '{}')", [result.insertId]);
  return result.insertId;
}

export async function createUser(institutionId, role = "owner", overrides = {}) {
  const id = uniq();
  const email = overrides.email || `${role}-${id}@test.local`;
  const result = await query(
    `INSERT INTO users (institution_id, name, email, password_hash, role, commission_rate_percent, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [institutionId, overrides.name || `${role} ${id}`, email, passwordHash, role, overrides.commission ?? 5, overrides.is_active ?? 1]
  );
  return { id: result.insertId, email, role, institutionId };
}

export async function login(email, password = PASSWORD) {
  const res = await api().post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

/** A tenant with an owner, a cs and a finance user, plus ready-to-use bearer tokens. */
export async function createTenant(overrides = {}) {
  const institutionId = await createInstitution(overrides);
  const owner = await createUser(institutionId, "owner");
  const cs = await createUser(institutionId, "cs");
  const finance = await createUser(institutionId, "finance");
  const [ownerToken, csToken, financeToken] = await Promise.all([login(owner.email), login(cs.email), login(finance.email)]);
  return { institutionId, owner, cs, finance, ownerToken, csToken, financeToken };
}

export async function createSuperadmin() {
  const platformId = await createInstitution({ name: "Platform", slug: `platform-${uniq()}` });
  const user = await createUser(platformId, "superadmin");
  return { user, token: await login(user.email), institutionId: platformId };
}

export async function createProduct(institutionId, overrides = {}) {
  const result = await query(
    `INSERT INTO products (institution_id, sku, name, selling_price, cost_price_hpp, stock_quantity)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [institutionId, overrides.sku || `SKU-${uniq()}`, overrides.name || "Produk Uji", overrides.price ?? 100000, overrides.hpp ?? 60000, overrides.stock ?? 10]
  );
  return result.insertId;
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** Poll until `fn` returns a truthy value (for work done after the HTTP response). */
export async function waitFor(fn, { timeout = 4000, interval = 50 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("waitFor timed out");
}
