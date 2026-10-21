import crypto from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pingDb } from "./config/db.js";
import apiRouter from "./routes/api.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { globalLimiter } from "./middlewares/rateLimit.js";

/**
 * Build the Express app. Kept separate from server.js so tests can mount it
 * without opening a port, a socket server, or running startup tasks.
 */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Behind nginx the real client IP arrives in X-Forwarded-For. Rate limits and
  // audit logs are only meaningful if exactly the proxy hops we run are trusted.
  app.set("trust proxy", config.trustProxy);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers["x-request-id"] || crypto.randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
      // Health probes would drown real traffic.
      autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
      // Log what is needed to debug a request, never headers (Authorization, cookies) or the
      // query string (it can carry tokens such as hub.verify_token).
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split("?")[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customProps: (req) => ({ ip: req.ip, userId: req.user?.id, tenantId: req.tenantId }),
    })
  );

  app.use(helmet());

  const allowed = new Set(config.corsOrigins);
  const dashboardCors = {
    // Requests without an Origin (webhooks, curl, server-to-server) are not browser CORS traffic.
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  };
  // The web chat widget runs on other people's websites. It carries its credential in a header, never a cookie, so any
  // origin may call these routes; each chat channel can still list the sites it accepts (checked in the controller).
  const publicCors = { origin: true, credentials: false, methods: ["GET", "POST", "OPTIONS"], maxAge: 600 };
  app.use(cors((req, cb) => cb(null, req.path.startsWith("/api/v1/public/") ? publicCors : dashboardCors)));

  // The payment-proof simulator uploads a photo as base64 (up to 5 MB of file), which is more than the default limit.
  // Registered first so the larger limit applies to this one path only.
  app.use("/api/v1/ai/analyze-proof", express.json({ limit: "8mb" }));
  // Knowledge-base documents (PDF or text) are also sent as base64.
  app.use("/api/v1/knowledge/file", express.json({ limit: "8mb" }));
  // The QRIS picture of a payment method is sent as base64 (up to 1.5 MB of image).
  app.use("/api/v1/platform/payment-methods", express.json({ limit: "3mb" }));
  // A transfer proof is a picture sent as base64 (up to 3 MB of image) on a top up or a package bill.
  app.use(["/api/v1/ai/topups", "/api/v1/billing/orders"], express.json({ limit: "5mb" })); // payment proofs

  // The raw body is needed to verify webhook signatures byte-for-byte.
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));


  // Liveness: the process is up. Readiness: it can actually serve (database reachable).
  app.get("/health", (req, res) => res.json({ status: "ok", uptime: Math.round(process.uptime()) }));
  app.get("/ready", async (req, res) => {
    try {
      await pingDb();
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.use("/api/v1", globalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
