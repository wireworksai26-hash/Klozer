import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: process.env.APP_URL || "http://localhost:5000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  jwt: {
    secret: process.env.JWT_SECRET || "klozer_ultra_secure_jwt_secret_key_2026_dev_mode",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  dbEncryptionKey: process.env.DB_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",

  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "klozer_db",
  },

  meta: {
    phoneNumberId: process.env.META_WABA_PHONE_NUMBER_ID || "",
    accessToken: process.env.META_ACCESS_TOKEN || "",
    verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "klozer_webhook_verify_token_secure_2026",
    pixelId: process.env.META_PIXEL_ID || "",
    capiAccessToken: process.env.META_CAPI_ACCESS_TOKEN || "",
  },

  paymentGateway: {
    provider: process.env.PAYMENT_GATEWAY_PROVIDER || "xendit",
    secretKey: process.env.PAYMENT_GATEWAY_SECRET_KEY || "",
    webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET || "",
  },

  ai: {
    provider: process.env.AI_PROVIDER || "gemini",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    nvidiaKey: process.env.NVIDIA_API_KEY || "",
    openaiKey: process.env.OPENAI_API_KEY || "",
  },
};
