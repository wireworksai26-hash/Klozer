import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { config } from "../config/env.js";

const handler = (message) => (req, res) =>
  res.status(429).json({ success: false, message, code: "RATE_LIMITED" });

const base = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => config.nodeEnv === "test" && !process.env.TEST_ENABLE_RATE_LIMIT,
};

export const globalLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
  handler: handler("Terlalu banyak permintaan. Coba lagi sebentar."),
});

export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: handler("Terlalu banyak percobaan login. Coba lagi dalam 15 menit."),
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
