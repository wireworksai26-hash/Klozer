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
