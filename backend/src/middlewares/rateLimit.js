import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

// ---------------------------------------------------------------------------
// Brute-force alert helper (BE-01)
// Emits a structured WARN log that can be piped to any alerting channel
// (Telegram, email, SIEM) by attaching a pino transport in the future.
// ---------------------------------------------------------------------------
function bruteForceAlert(req) {
  logger.warn(
    {
      event: "BRUTE_FORCE_DETECTED",
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers["user-agent"] ?? "unknown",
      email: req.body?.email ?? null,
      at: new Date().toISOString(),
    },
    "[SECURITY] Login brute force terdeteksi — IP diblokir sementara selama 15 menit."
  );
}

const handler = (message) => (req, res) =>
  res.status(429).json({ success: false, message, code: "RATE_LIMITED" });

const base = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => config.nodeEnv === "test" && !process.env.TEST_ENABLE_RATE_LIMIT,
};

export const globalLimiter = rateLimit({
  ...base,
  // The public API has its own limit per API key; automations from one hosting provider share an address.
  skip: (req) => base.skip() || req.path.startsWith("/open/"),
  windowMs: 60 * 1000,
  limit: 300,
  handler: handler("Terlalu banyak permintaan. Coba lagi sebentar."),
});

export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  // Alert first, then respond 429.
  handler: (req, res) => {
    bruteForceAlert(req);
    res.status(429).json({
      success: false,
      message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
      code: "RATE_LIMITED",
    });
  },
});

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: handler("Terlalu banyak pendaftaran dari alamat ini. Coba lagi nanti."),
});

export const publicAiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: config.ai.publicAskDailyLimit,
  handler: handler("Batas pertanyaan AI publik tercapai. Silakan coba lagi nanti atau daftar untuk akses penuh."),
});

export const aiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => (req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip)),
  handler: handler("Terlalu banyak permintaan AI. Coba lagi sebentar."),
});

export const webhookLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 600,
  handler: handler("Terlalu banyak permintaan webhook."),
});

// Public API: a limit per API key, so one noisy automation cannot use up another tenant's allowance.
export const openApiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: (req) => (req.apiKey ? `k:${req.apiKey.id}` : ipKeyGenerator(req.ip)),
  handler: handler("Terlalu banyak permintaan untuk API key ini. Coba lagi sebentar."),
});

// Public web chat widget: anonymous visitors on other people's websites. Polling is frequent, sending is not.
export const webchatPollLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
  handler: handler("Terlalu banyak permintaan. Coba lagi sebentar."),
});

export const webchatSendLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 15,
  handler: handler("Terlalu banyak pesan. Coba lagi sebentar."),
});
