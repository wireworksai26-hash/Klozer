// Keys match the module toggles in the dashboard (superadmin > Institusi).
export const DEFAULT_FEATURES = Object.freeze({
  personaAi: true,
  autoLabel: true,
  printReceipt: true,
  baileys: false,
  instagram: true,
  csBlast: true,
  publicBooking: false,
  stockManagement: true,
  picFeature: true,
  qris: true,
  voiceAi: true,
  antiFraud: true,
  metaCapi: true,
  multiCs: true,
  knowledgeBase: true,
  aiLearning: true,
  chatCommerce: true,
  publicApi: true,
  multiAgent: true,
  tasks: true,
  agentTools: true,
});

/**
 * AI tokens that come with each plan. Enterprise is agreed per customer, so it has no fixed bundle. Extra tokens are
 * bought separately (see services/tokenTopupService.js); the two are deliberately not shown together in the price list.
 */
export const TIER_TOKEN_BUNDLE = Object.freeze({ starter: 700_000, pro: 1_000_000 });

/**
 * Token top up price list (rupiah). One place to change prices. The price per 1.000 tokens falls with the pack size, and
 * stays well under what the bundled tokens cost inside a plan, so topping up is the cheap way to get more tokens.
 * An amount that is not a pack is priced at the rate of the largest pack not above it (the smallest pack's rate below
 * the smallest pack), rounded up to the next Rp 1.000, and never above the price of the next pack up.
 */
export const TOPUP_PACKS = Object.freeze([
  { id: "t500k", tokens: 500_000, priceIdr: 75_000 },
  { id: "t1m", tokens: 1_000_000, priceIdr: 135_000 },
  { id: "t2500k", tokens: 2_500_000, priceIdr: 315_000 },
  { id: "t5m", tokens: 5_000_000, priceIdr: 595_000 },
]);

export function topupPrice(tokens) {
  const sorted = [...TOPUP_PACKS].sort((a, b) => a.tokens - b.tokens);
  const exact = sorted.find((p) => p.tokens === tokens);
  if (exact) return exact.priceIdr;
  const below = [...sorted].reverse().find((p) => p.tokens <= tokens) ?? sorted[0];
  const above = sorted.find((p) => p.tokens > tokens);
  // at the rate of the pack below, but never more than the next pack up costs (a bigger pack is never cheaper than a smaller amount)
  const atRate = Math.ceil((tokens * below.priceIdr) / below.tokens / 1000) * 1000;
  return above ? Math.min(atRate, above.priceIdr) : atRate;
}

export const LEAD_STATUSES = ["new", "in_progress", "closing", "repeat", "idle", "closed_lost"];
export const ORDER_STATUSES = ["waiting_payment", "paid", "processing", "shipped", "delivered", "completed", "cancelled"];
export const PAYMENT_METHODS = ["qris", "va", "bank_transfer", "cod", "cash"];
export const STAFF_ROLES = ["supervisor", "owner", "finance", "cs", "pic_warehouse"];

/** Allowed order status transitions. Anything not listed is rejected. */
export const ORDER_TRANSITIONS = Object.freeze({
  waiting_payment: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
});

export const PLATFORM_INSTITUTION_SLUG = "klozer-platform";
