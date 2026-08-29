/**
 * Normalize phone number to standard Indonesian WhatsApp E.164 format (e.g. 6281234567890)
 * @param {string} phone 
 * @returns {string} normalized phone
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  } else if (clean.startsWith("+62")) {
    clean = clean.slice(1);
  } else if (!clean.startsWith("62") && clean.length >= 9) {
    clean = "62" + clean;
  }
  return clean;
}

/**
 * High-performance array / query result pagination helper
 * @param {Array} data 
 * @param {number|string} page 
 * @param {number|string} limit 
 * @returns {Object} paginated response metadata
 */
export function paginate(data = [], page = 1, limit = 10) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const total = data.length;
  const totalPages = Math.ceil(total / l) || 1;
  const offset = (p - 1) * l;
  const paginatedItems = data.slice(offset, offset + l);

  return {
    items: paginatedItems,
    pagination: {
      currentPage: p,
      perPage: l,
      totalItems: total,
      totalPages: totalPages,
      hasNextPage: p < totalPages,
      hasPrevPage: p > 1,
    },
  };
}

/**
 * Generate unique Order Number
 */
export function generateOrderNumber(prefix = "ORD") {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

/**
 * Format IDR Rupiah currency
 */
export function formatRupiah(amount = 0) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
