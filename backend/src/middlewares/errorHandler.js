/**
 * Centralized Error & Exception Handler Middleware
 */
export function errorHandler(err, req, res, next) {
  console.error(`[API Error ${req.method} ${req.originalUrl}]`, err.stack || err.message);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Terjadi kesalahan internal server.",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}
