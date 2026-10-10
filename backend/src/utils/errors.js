/**
 * Operational error that is safe to show to API clients.
 * Anything that is not an AppError is treated as an unexpected failure and
 * is reported to the client as a generic 500.
 */
export class AppError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}

export const badRequest = (message, opts) => new AppError(400, message, opts);
export const unauthorized = (message = "Otentikasi diperlukan.", opts) => new AppError(401, message, opts);
export const forbidden = (message = "Anda tidak memiliki izin untuk aksi ini.", opts) => new AppError(403, message, opts);
export const notFound = (message = "Data tidak ditemukan.", opts) => new AppError(404, message, opts);
export const conflict = (message, opts) => new AppError(409, message, opts);
export const paymentRequired = (message, opts) => new AppError(402, message, opts);
export const serviceUnavailable = (message, opts) => new AppError(503, message, opts);

/** Wrap an async express handler so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
