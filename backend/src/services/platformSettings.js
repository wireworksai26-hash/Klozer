import { query, queryOne } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { decryptSecret, encryptSecret } from "../utils/crypto.js";

const AI_KEY = "ai";
const CACHE_MS = 15_000;
let cache = null; // { at, value }

const providerOf = (v) => (v === "gemini" ? "gemini" : "nvidia");

/** What is stored in the database for AI (secrets decrypted). Empty object when nothing was saved. */
async function readStored() {
  const row = await queryOne("SELECT value_json, encrypted_secrets FROM platform_settings WHERE setting_key = ?", [AI_KEY]);
  if (!row) return { values: {}, secrets: {} };
  let values = row.value_json || {};
  if (typeof values === "string") values = JSON.parse(values);
  let secrets = {};
  if (row.encrypted_secrets) {
    try {
      secrets = JSON.parse(decryptSecret(row.encrypted_secrets));
    } catch (err) {
      logger.error({ err: err.message }, "Pengaturan AI tersimpan tidak bisa didekripsi (DB_ENCRYPTION_KEY berubah?). Memakai nilai environment.");
    }
  }
  return { values, secrets };
}

/**
 * AI settings in effect: values saved from the superadmin UI win over environment variables.
 * Cached briefly so every chat reply does not hit the database; a failing database falls back to the environment.
 */
export async function getEffectiveAi() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  let stored = { values: {}, secrets: {} };
  try {
    stored = await readStored();
  } catch (err) {
    logger.warn({ err: err.message }, "Pengaturan AI di database tidak terbaca, memakai environment");
  }
  const { ai } = config;
  const v = stored.values;
  const value = {
    provider: providerOf(v.provider ?? ai.provider),
    nvidiaKey: stored.secrets.nvidiaKey || ai.nvidiaKey,
    nvidiaModel: v.nvidiaModel || ai.nvidiaModel,
    nvidiaFallbackModel: v.nvidiaFallbackModel || ai.nvidiaFallbackModel,
    nvidiaVisionModel: v.nvidiaVisionModel || ai.nvidiaVisionModel,
    geminiApiKey: stored.secrets.geminiApiKey || ai.geminiApiKey,
    geminiModel: v.geminiModel || ai.geminiModel,
    geminiFallbackModel: v.geminiFallbackModel || ai.geminiFallbackModel,
    sources: {
      nvidia: stored.secrets.nvidiaKey ? "database" : ai.nvidiaKey ? "environment" : "none",
      gemini: stored.secrets.geminiApiKey ? "database" : ai.geminiApiKey ? "environment" : "none",
    },
  };
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateAiSettingsCache() {
  cache = null;
}

const hint = (key) => (key ? `••••${key.slice(-4)}` : null);

/** Safe view for the UI: never includes a key, only whether one exists, where it comes from and its last 4 characters. */
export async function getAiSettingsPublic() {
  const s = await getEffectiveAi();
  return {
    provider: s.provider,
    nvidia: { configured: Boolean(s.nvidiaKey), source: s.sources.nvidia, hint: hint(s.nvidiaKey), model: s.nvidiaModel, fallbackModel: s.nvidiaFallbackModel },
    gemini: { configured: Boolean(s.geminiApiKey), source: s.sources.gemini, hint: hint(s.geminiApiKey), model: s.geminiModel, fallbackModel: s.geminiFallbackModel },
  };
}

/**
 * Save changes. A key field that is absent or empty leaves the stored key untouched;
 * `clearNvidiaKey` / `clearGeminiKey` remove a stored key (the environment value, if any, applies again).
 */
export async function saveAiSettings(input, userId) {
  const stored = await readStored();
  const values = { ...stored.values };
  const secrets = { ...stored.secrets };

  if (input.provider) values.provider = providerOf(input.provider);
  for (const field of ["nvidiaModel", "nvidiaFallbackModel", "geminiModel", "geminiFallbackModel"]) {
    if (input[field]) values[field] = input[field];
  }
  if (input.nvidiaKey) secrets.nvidiaKey = input.nvidiaKey;
  if (input.geminiApiKey) secrets.geminiApiKey = input.geminiApiKey;
  if (input.clearNvidiaKey) delete secrets.nvidiaKey;
  if (input.clearGeminiKey) delete secrets.geminiApiKey;

  const encrypted = Object.keys(secrets).length ? encryptSecret(JSON.stringify(secrets)) : null;
  await query(
    `INSERT INTO platform_settings (setting_key, value_json, encrypted_secrets, updated_by) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), encrypted_secrets = VALUES(encrypted_secrets), updated_by = VALUES(updated_by)`,
    [AI_KEY, JSON.stringify(values), encrypted, userId ?? null]
  );
  invalidateAiSettingsCache();
  return getAiSettingsPublic();
}
