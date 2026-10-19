// Subscription prices in rupiah per month. Annual is billed once a year (12 x the monthly figure).
// Used by the pricing section and the /bayar page so the two never disagree.
export const PLAN_PRICES = {
  Starter: { monthly: 199000, annual: 159000 },
  Pro: { monthly: 499000, annual: 399000 },
};

// Running promotion. To end it: set `active` to false, or set `endsAt` to an ISO date
// (e.g. "2026-11-30T23:59:59+07:00") and it switches off by itself after that moment.
export const PROMO = {
  active: true,
  plan: "Pro",
  percent: 30,
  endsAt: null,
};

export const formatRupiah = (n) => new Intl.NumberFormat("id-ID").format(n);

export function isPromoRunning(now = new Date()) {
  if (!PROMO.active) return false;
  return !PROMO.endsAt || now < new Date(PROMO.endsAt);
}

// Discounted prices are rounded down to the nearest Rp 1.000 so they read as clean numbers.
const afterDiscount = (price) => Math.floor((price * (100 - PROMO.percent)) / 100 / 1000) * 1000;

/**
 * Price of a plan for a billing period ("monthly" | "annual"), per month.
 * `original` is only set while a promotion applies to this plan (render it struck through).
 */
export function planPrice(name, period, now = new Date()) {
  const base = PLAN_PRICES[name]?.[period];
  if (base === undefined) return null;
  if (name === PROMO.plan && isPromoRunning(now)) return { final: afterDiscount(base), original: base, percent: PROMO.percent };
  return { final: base, original: null, percent: 0 };
}

/** "hingga 30 November 2026" for the promo banner, or "" when the promo has no end date. */
export function promoUntilText() {
  if (!PROMO.endsAt) return "";
  return `hingga ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(PROMO.endsAt))}`;
}

// ---------------------------------------------------------------- features per package
// Every feature the superadmin can switch for a tenant. `menu` lists the dashboard pages it controls.
export const FEATURE_LIST = [
  { key: "personaAi", label: "Persona AI CS", menu: ["/dashboard/escalation", "/dashboard/doa-knowledge"] },
  { key: "autoLabel", label: "Auto-Label AI", menu: ["/dashboard/labels", "/dashboard/label-stats"] },
  { key: "printReceipt", label: "Cetak Nota / Resi", menu: ["/dashboard/finance/invoices"] },
  { key: "baileys", label: "Baileys WhatsApp", menu: [] },
  { key: "instagram", label: "Instagram Direct DM", menu: ["/dashboard/instagram"] },
  { key: "csBlast", label: "Broadcast & Anti-Spam", menu: ["/dashboard/blasting", "/dashboard/credits", "/dashboard/blocked-contacts"] },
  { key: "publicBooking", label: "Booking & Etalase Publik", menu: ["/dashboard/bookings", "/dashboard/etalase"] },
  { key: "stockManagement", label: "Stok & Gudang", menu: ["/dashboard/stock", "/dashboard/warehouses"] },
  { key: "picFeature", label: "PIC Round Robin", menu: ["/dashboard/pic-roster"] },
  { key: "qris", label: "Dynamic QRIS di Chat", menu: [] },
  { key: "voiceAi", label: "Voice Note AI", menu: [] },
  { key: "antiFraud", label: "Anti-Fraud Bukti Transfer", menu: [] },
  { key: "metaCapi", label: "Meta Ads CAPI Tracking", menu: [] },
  { key: "multiCs", label: "Multi-CS & Chat Internal", menu: ["/dashboard/internal-chat"] },
  { key: "knowledgeBase", label: "Basis Pengetahuan AI (SOP & dokumen)", menu: [] },
  { key: "aiLearning", label: "Evaluasi & Pembelajaran AI", menu: [] },
];

const only = (keys) => Object.fromEntries(FEATURE_LIST.map(({ key }) => [key, keys.includes(key)]));

// What each package includes (follows the pricing table). The superadmin can still switch single features per tenant.
const STARTER_FEATURES = ["personaAi", "qris", "stockManagement", "printReceipt"];
const PRO_FEATURES = [...STARTER_FEATURES, "multiCs", "voiceAi", "antiFraud", "metaCapi", "autoLabel", "picFeature", "knowledgeBase", "aiLearning"];
export const PLAN_FEATURES = {
  Starter: only(STARTER_FEATURES),
  Pro: only(PRO_FEATURES),
  Enterprise: only(FEATURE_LIST.map((f) => f.key).filter((k) => k !== "baileys")),
};

/** Feature switches for a tier label such as "Starter", "Pro Plan" or "Enterprise". */
export function featuresForTier(tierLabel = "") {
  const text = String(tierLabel).toLowerCase();
  if (text.includes("enterprise")) return { ...PLAN_FEATURES.Enterprise };
  if (text.includes("starter")) return { ...PLAN_FEATURES.Starter };
  return { ...PLAN_FEATURES.Pro };
}

/** Which feature controls a dashboard path, or null when the page is part of every package. */
export function featureForPath(path) {
  const clean = String(path).split("?")[0];
  return FEATURE_LIST.find((f) => f.menu.includes(clean))?.key || null;
}
