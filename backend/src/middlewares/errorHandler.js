import { logger } from "../config/logger.js";
import { config } from "../config/env.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan.`,
    code: "NOT_FOUND",
  });
}

/**
 * Central error handler. Only AppError messages reach the client; everything
 * else is logged with the request id and returned as a generic 500 so stack
 * traces and SQL never leak.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let message = err.expose ? err.message : null;
  let code = err.expose && typeof err.code === "string" ? err.code : undefined;

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Body JSON tidak valid.";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Ukuran request terlalu besar.";
  } else if (err.code === "ER_DUP_ENTRY") {
    status = 409;
    message = "Data dengan nilai yang sama sudah ada.";
    code = "DUPLICATE";
  } else if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_ROW_IS_REFERENCED_2") {
    status = 409;
    message = "Data terkait tidak ditemukan atau masih dipakai oleh data lain.";
    code = "REFERENCE_CONFLICT";
  }

  if (status >= 500) {
    (req.log || logger).error({ err, reqId: req.id }, "Unhandled error");
  }

  res.status(status).json({
    success: false,
    message: message || "Terjadi kesalahan internal server.",
    code,
    details: err.expose ? err.details : undefined,
    requestId: req.id,
    ...(config.nodeEnv === "development" && status >= 500 ? { stack: err.stack } : {}),
  });
}
