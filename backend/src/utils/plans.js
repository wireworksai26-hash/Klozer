/**
 * What the packages cost and include, for the server. The pricing section, the payment page and the dashboard read the
 * same numbers from frontend/src/utils/plans.js; a test in the frontend compares the two so they cannot drift apart.
 * Prices are rupiah per month. An annual plan is paid once for 12 months.
 */

export const PLANS = Object.freeze({
  starter: { name: "Starter", monthly: 449_000, intro: { monthly: 10, annual: 15 } },
  pro: { name: "Pro", monthly: 599_000, intro: { monthly: 30, annual: 20 } },
});

export const ANNUAL_MONTHS = 12;

/** The introductory discount applies to a shop's first purchase only. Set `active` false, or an `endsAt`, to stop offering it. */
export const PROMO = { active: true, endsAt: null };

/** Every switch a package controls (institutions.features_json), in the order of the dashboard's feature list. */
export const PLAN_FEATURE_KEYS = Object.freeze([
  "personaAi", "autoLabel", "printReceipt", "baileys", "instagram", "csBlast", "publicBooking", "stockManagement", "picFeature", "qris",
  "voiceAi", "antiFraud", "metaCapi", "multiCs", "knowledgeBase", "aiLearning", "multiAgent", "agentTools", "tasks", "chatCommerce", "publicApi",
]);

const STARTER = ["personaAi", "printReceipt", "stockManagement", "qris", "tasks", "chatCommerce"];
const PRO = [...STARTER, "multiCs", "voiceAi", "antiFraud", "metaCapi", "autoLabel", "picFeature", "knowledgeBase", "aiLearning", "multiAgent", "agentTools", "publicApi"];
export const PLAN_FEATURES = Object.freeze({ starter: Object.freeze(STARTER), pro: Object.freeze(PRO) });

/** The package's switches as { key: true|false } for every key, ready to merge into features_json. */
export const featureMapFor = (plan) => Object.fromEntries(PLAN_FEATURE_KEYS.map((key) => [key, PLAN_FEATURES[plan].includes(key)]));

/** How long an unpaid package order stays open. */
export const ORDER_TTL_HOURS = 24;

const isPromoRunning = (now) => PROMO.active && (!PROMO.endsAt || now < new Date(PROMO.endsAt));

/**
 * The price of a plan for a period.
 * @param {"starter"|"pro"} plan
 * @param {"monthly"|"annual"} period
 * @param {{ firstPurchase?: boolean, now?: Date }} [opts] the introductory discount only applies to a first purchase
 */
export function planOffer(plan, period, { firstPurchase = true, now = new Date() } = {}) {
  const def = PLANS[plan];
  if (!def || !["monthly", "annual"].includes(period)) return null;
  const months = period === "annual" ? ANNUAL_MONTHS : 1;
  const listPriceIdr = def.monthly * months;
  const percent = firstPurchase && isPromoRunning(now) ? def.intro[period] ?? 0 : 0;
  const priceIdr = Math.round((listPriceIdr * (100 - percent)) / 100);
  return { plan, period, months, listPriceIdr, percent, discountIdr: listPriceIdr - priceIdr, priceIdr };
}
