import crypto from "crypto";

/**
 * Normalize an Indonesian phone number to WhatsApp E.164 digits without '+'
 * (e.g. "0812-3456-7890" -> "6281234567890").
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
  else if (clean.startsWith("8")) clean = "62" + clean;
  return clean;
}

/** Parse `page` / `limit` query params into bounded integers plus SQL offset. */
export function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(maxLimit, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildPagination({ page, limit }, totalItems) {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    currentPage: page,
    perPage: limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/** Collision-resistant order number, e.g. ORD-20261009-K3F9A2. */
export function generateOrderNumber(prefix = "ORD") {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `${prefix}-${dateStr}-${suffix}`;
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatRupiah(amount = 0) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

/** Escape LIKE wildcards so user search input is matched literally. */
export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

/** Whitelist-copy `fields` from `source`, skipping undefined values. */
export function pick(source, fields) {
  const out = {};
  for (const f of fields) if (source[f] !== undefined) out[f] = source[f];
  return out;
}
