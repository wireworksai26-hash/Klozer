/**
 * What Meta charges a business for WhatsApp messages (per delivered message, Indonesian numbers, IDR, before 11% VAT).
 * Meta bills the client's own WhatsApp account directly; Klozer only shows an estimate so nobody is surprised.
 * Rates change on the first day of a quarter: check Meta's rate card and update these when it does.
 * Source: developers.facebook.com/docs/whatsapp/pricing (rate card of 1 October 2026).
 */
export const META_RATES_AS_OF = "2026-10-01";
export const META_RATE_IDR = { marketing: 586.33, utility: 356.65, authentication: 356.65, service: 356.65 };
/** Free-form replies inside the 24-hour window: this many per business number per month are free, the rest are charged. */
export const META_SERVICE_FREE_PER_MONTH = 1000;
export const META_VAT = 0.11;

const WIB_OFFSET_HOURS = 7;

/** The first instant of this month in Jakarta, as a UTC Date (what the database stores). */
export function wibMonthStart(now = new Date()) {
  const wib = new Date(now.getTime() + WIB_OFFSET_HOURS * 3600_000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - WIB_OFFSET_HOURS * 3600_000);
}

/** Estimated Meta charge for `count` delivered messages of a category; an unknown category is priced as marketing. */
export function estimateMetaCost(category, count) {
  const known = Object.hasOwn(META_RATE_IDR, category);
  const perMessage = known ? META_RATE_IDR[category] : META_RATE_IDR.marketing;
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const total = Math.round(perMessage * n);
  return { category: known ? category : "marketing", count: n, perMessage, total, totalWithVat: Math.round(total * (1 + META_VAT)), asOf: META_RATES_AS_OF };
}

/** Where a business number stands on the free service messages this month. */
export function serviceUsage(sent) {
  const used = Math.max(0, Math.floor(Number(sent) || 0));
  const billable = Math.max(0, used - META_SERVICE_FREE_PER_MONTH);
  return { used, freeTier: META_SERVICE_FREE_PER_MONTH, remainingFree: Math.max(0, META_SERVICE_FREE_PER_MONTH - used), billable, estimatedCost: estimateMetaCost("service", billable).total, asOf: META_RATES_AS_OF };
}
