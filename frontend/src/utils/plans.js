// Subscription prices in rupiah. The regular price is per month; an annual plan is paid once for 12 months (price x 12).
// Used by the pricing section and the /bayar page so the two never disagree.
export const PLAN_PRICES = {
  Starter: { monthly: 449000 },
  Pro: { monthly: 599000 },
};

export const ANNUAL_MONTHS = 12;

// Introductory discount in percent. It applies to the first period only: the first month of a monthly plan, the
// first year of an annual plan. Renewals are charged the regular price.
export const FIRST_PERIOD_DISCOUNT = {
  Starter: { monthly: 10, annual: 15 },
  Pro: { monthly: 30, annual: 20 },
};

// To stop offering the introductory discount: set `active` to false, or set `endsAt` to an ISO date
// (e.g. "2026-11-30T23:59:59+07:00") and it switches off by itself after that moment.
export const PROMO = {
  active: true,
  endsAt: null,
};

export const formatRupiah = (n) => new Intl.NumberFormat("id-ID").format(n);

export function isPromoRunning(now = new Date()) {
  if (!PROMO.active) return false;
  return !PROMO.endsAt || now < new Date(PROMO.endsAt);
}

/**
 * What a plan costs for a billing period ("monthly" | "annual"), exact to the rupiah (no rounding to round numbers,
 * because this is what the customer is charged).
 *  - regularMonthly: the monthly price
 *  - months: how many months one payment covers (1 or 12)
 *  - regularTotal: regularMonthly x months, the price from the second period on
 *  - firstTotal: what the first payment is (regularTotal minus the introductory discount)
 *  - percent: the introductory discount (0 when none applies), saving: how much it takes off
 */
export function planOffer(name, period, now = new Date()) {
  const regularMonthly = PLAN_PRICES[name]?.monthly;
  if (regularMonthly === undefined || !["monthly", "annual"].includes(period)) return null;
  const months = period === "annual" ? ANNUAL_MONTHS : 1;
  const regularTotal = regularMonthly * months;
  const percent = isPromoRunning(now) ? FIRST_PERIOD_DISCOUNT[name]?.[period] ?? 0 : 0;
  const firstTotal = Math.round((regularTotal * (100 - percent)) / 100);
  return { period, months, regularMonthly, regularTotal, firstTotal, percent, saving: regularTotal - firstTotal };
}

/** "599.000 x 12 bulan = 7.188.000": the yearly price spelled out, for the pricing section and the payment page. */
export const annualBreakdown = (offer) => `Rp ${formatRupiah(offer.regularMonthly)} x ${offer.months} bulan = Rp ${formatRupiah(offer.regularTotal)}`;

/** "hingga 30 November 2026" when the introductory discount has an end date, or "". */
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
  { key: "knowledgeBase", label: "Basis Pengetahuan AI (SOP & dokumen)", menu: ["/dashboard/knowledge"] },
  { key: "aiLearning", label: "Evaluasi & Pembelajaran AI", menu: ["/dashboard/ai-evaluation"] },
  { key: "multiAgent", label: "Multi-Agen AI", menu: ["/dashboard/agents"] },
  { key: "agentTools", label: "Alat untuk Agen AI (cek stok, buat tugas, oper chat)", menu: [] },
  { key: "tasks", label: "Tugas Tim", menu: ["/dashboard/tasks"] },
  { key: "chatCommerce", label: "Pesanan Langsung di Chat", menu: ["/dashboard/chat-commerce"] },
  { key: "publicApi", label: "API Key dan Webhook", menu: ["/dashboard/integrations"] },
];

const only = (keys) => Object.fromEntries(FEATURE_LIST.map(({ key }) => [key, keys.includes(key)]));

// What each package includes (follows the pricing table). The superadmin can still switch single features per tenant.
const STARTER_FEATURES = ["personaAi", "qris", "stockManagement", "printReceipt", "tasks", "chatCommerce"];
const PRO_FEATURES = [...STARTER_FEATURES, "multiCs", "voiceAi", "antiFraud", "metaCapi", "autoLabel", "picFeature", "knowledgeBase", "aiLearning", "multiAgent", "agentTools", "publicApi"];
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
