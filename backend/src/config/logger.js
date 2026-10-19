import pino from "pino";
import { config, isTest } from "./env.js";

const redact = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.body.password",
    "req.body.newPassword",
    "req.body.currentPassword",
    "*.password",
    "*.password_hash",
    "*.access_token",
    "*.accessToken",
  ],
  censor: "[REDACTED]",
};

export const logger = pino({
  level: isTest ? process.env.TEST_LOG_LEVEL || "silent" : config.logLevel,
  redact,
  base: { service: "klozer-backend" },
  ...(config.isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,service" },
        },
      }),
});
