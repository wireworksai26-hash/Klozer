import { logger } from "../config/logger.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan.`,
    code: "NOT_FOUND",
  });
}

/**
 * Central hardened error handler.
 * Only sanitized, safe messages reach API clients. Database stack traces,
 * SQL queries, table schemas, and internal file paths are strictly logged
 * on the server and never leaked in client responses (prevents Information Disclosure).
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let message = err.expose ? err.message : null;
  let code = err.expose && typeof err.code === "string" ? err.code : undefined;

  // JSON parse / payload size errors
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Body JSON tidak valid.";
    code = "INVALID_JSON";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Ukuran request terlalu besar.";
    code = "PAYLOAD_TOO_LARGE";
  }
  // Database connection & protocol errors
  else if (
    err.code === "ECONNREFUSED" ||
    err.code === "PROTOCOL_CONNECTION_LOST" ||
    err.code === "ER_ACCESS_DENIED_ERROR" ||
    err.code === "ETIMEDOUT"
  ) {
    status = 503;
    message = "Layanan database sedang tidak dapat dihubungi. Silakan coba sesaat lagi.";
    code = "DATABASE_UNAVAILABLE";
  }
  // Database constraint & conflict errors
  else if (err.code === "ER_DUP_ENTRY") {
    status = 409;
    message = "Data dengan nilai yang sama sudah ada.";
    code = "DUPLICATE";
  } else if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_ROW_IS_REFERENCED_2") {
    status = 409;
    message = "Data terkait tidak ditemukan atau masih dipakai oleh data lain.";
    code = "REFERENCE_CONFLICT";
  }
  // Database schema / query execution errors (must not leak table/column names)
  else if (err.code === "ER_PARSE_ERROR" || err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_FIELD_ERROR") {
    status = 500;
    message = "Terjadi kesalahan internal pada pemrosesan database.";
    code = "DATABASE_ERROR";
  }

  // Internal server errors are logged with full stack on the server side
  if (status >= 500) {
    (req.log || logger).error({ err, reqId: req.id }, "Unhandled error");
  }

  // Consistent clean JSON response without leaking stack traces or SQL internals
  const response = {
    success: false,
    message: message || "Terjadi kesalahan internal server.",
    code: code || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST"),
    requestId: req.id,
  };

  if (err.expose && err.details) {
    response.details = err.details;
  }

  res.status(status).json(response);
}
