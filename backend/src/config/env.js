import dotenv from "dotenv";

// Tests must be hermetic: never pick up a developer's local .env (real keys, real DB).
if (process.env.NODE_ENV !== "test") dotenv.config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || undefined });

const nodeEnv = process.env.NODE_ENV || "development";
export const isProduction = nodeEnv === "production";
export const isTest = nodeEnv === "test";

const problems = [];

// Defaults that were committed to the repository at some point: public, so never acceptable in production.
const KNOWN_LEAKED = /klozer_ultra_secure|klozer-dev-only|klozer_secure_(root_)?pass|0123456789abcdef0123456789abcdef/i;

/**
 * Read an env var. In production a missing/weak required value is a startup
 * error; outside production the dev fallback is used so local setup stays easy.
 */
function read(name, { required = false, devDefault = "", minLength = 0, pattern = null, hint = "" } = {}) {
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? null : raw;

  if (isProduction && required) {
    if (value === null) {
      problems.push(`${name} wajib diisi di production. ${hint}`.trim());
      return "";
    }
    if (minLength && value.length < minLength) {
      problems.push(`${name} terlalu pendek (minimal ${minLength} karakter). ${hint}`.trim());
    }
    if (pattern && !pattern.test(value)) {
      problems.push(`${name} formatnya tidak valid. ${hint}`.trim());
    }
    if (/change_in_production|your_|example|secret_key_here/i.test(value)) {
      problems.push(`${name} masih berisi nilai placeholder dari .env.example.`);
    }
    if (KNOWN_LEAKED.test(value)) {
      problems.push(`${name} memakai nilai default yang pernah dipublikasikan di repository. Buat nilai baru.`);
    }
    return value;
  }

  return value ?? devDefault;
}

function readInt(name, fallback) {
  const parsed = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readList(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const frontendUrl = read("FRONTEND_URL", { devDefault: "http://localhost:3000" });

export const config = {
  port: readInt("PORT", 5000),
  nodeEnv,
  isProduction,
  appUrl: read("APP_URL", { devDefault: "http://localhost:5000" }),
  frontendUrl,
  trustProxy: readInt("TRUST_PROXY_HOPS", isProduction ? 1 : 0),
  corsOrigins: readList("CORS_ORIGINS", [frontendUrl, "http://localhost:3000"]),
  logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

  jwt: {
    secret: read("JWT_SECRET", {
      required: true,
      devDefault: "klozer-dev-only-jwt-secret-do-not-use-in-production",
      minLength: 32,
      hint: "Buat dengan: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    }),
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    issuer: "klozer",
  },

  dbEncryptionKey: read("DB_ENCRYPTION_KEY", {
    required: true,
    devDefault: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    pattern: /^[0-9a-fA-F]{64}$/,
    hint: "Harus 64 karakter hex (32 byte). Buat dengan: openssl rand -hex 32",
  }),

  db: {
    host: read("DB_HOST", { required: true, devDefault: "127.0.0.1" }),
    port: readInt("DB_PORT", 3306),
    user: read("DB_USER", { required: true, devDefault: "root" }),
    password: read("DB_PASSWORD", { required: true, devDefault: "", minLength: 12 }),
    database: read("DB_NAME", { required: true, devDefault: "klozer_db" }),
    poolSize: readInt("DB_POOL_SIZE", 15),
    createDatabaseIfMissing: !isProduction,
  },

  bootstrap: {
    superadminEmail: (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase(),
    superadminPassword: process.env.SUPERADMIN_PASSWORD || "",
    superadminName: process.env.SUPERADMIN_NAME || "Platform Superadmin",
  },

  meta: {
    appSecret: read("META_APP_SECRET", { devDefault: "" }),
    verifyToken: read("META_WEBHOOK_VERIFY_TOKEN", { devDefault: "klozer-dev-verify-token" }),
    pixelId: process.env.META_PIXEL_ID || "",
    capiAccessToken: process.env.META_CAPI_ACCESS_TOKEN || "",
    graphVersion: process.env.META_GRAPH_VERSION || "v21.0",
  },

  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  },

  ai: {
    provider: process.env.AI_PROVIDER || "nvidia",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    nvidiaKey: process.env.NVIDIA_API_KEY || "",
    nvidiaModel: process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct",
    openaiKey: process.env.OPENAI_API_KEY || "",
    publicAskDailyLimit: readInt("AI_PUBLIC_ASK_PER_HOUR", 20),
    // Rough IDR cost used for the usage dashboard only (not billing).
    costIdrPerToken: parseFloat(process.env.AI_COST_IDR_PER_TOKEN || "0.012"),
  },

  trial: {
    blastCredits: readInt("TRIAL_BLAST_CREDITS", 5000),
    aiTokens: readInt("TRIAL_AI_TOKENS", 1000000),
    tier: process.env.TRIAL_TIER || "pro",
  },

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: readInt("SMTP_PORT", 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Klozer <no-reply@klozer.id>",
  },
};

if (isProduction) {
  if (config.corsOrigins.some((o) => o === "*")) {
    problems.push("CORS_ORIGINS tidak boleh '*' di production.");
  }
  if (!process.env.CORS_ORIGINS && !process.env.FRONTEND_URL) {
    problems.push("Set FRONTEND_URL atau CORS_ORIGINS agar browser frontend diizinkan mengakses API.");
  }
  if (problems.length) {
    console.error(`\n[FATAL] Konfigurasi production tidak valid:\n - ${problems.join("\n - ")}\n`);
    process.exit(1);
  }
}
