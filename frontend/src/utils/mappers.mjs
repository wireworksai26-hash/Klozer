// Pure translation between the API's records and the shapes the dashboard pages already use.
// No imports on purpose: this file is unit-tested with plain `node --test`.

const pad = (n, width = 3) => String(n).padStart(width, "0");
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** "PRD-007" | 7 | "7" -> 7. Returns null when no id can be recovered. */
export function toDbId(value) {
  if (value && typeof value === "object") return toDbId(value.dbId ?? value.id);
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : null;
}

// ---------------------------------------------------------------- roles
const ROLE_LABELS = {
  superadmin: "Superadmin Platform",
  owner: "Owner Toko",
  supervisor: "Supervisor (SPV)",
  finance: "Finance & Rekonsiliasi",
  cs: "Customer Service",
  pic_warehouse: "PIC Gudang",
};

/** Which sidebar/theme set the dashboard shows for a server role. */
export function uiRoleFor(serverRole) {
  if (serverRole === "supervisor" || serverRole === "finance") return "spv";
  if (serverRole === "pic_warehouse") return "cs";
  return serverRole || "owner";
}

export const roleLabel = (serverRole) => ROLE_LABELS[serverRole] || serverRole;

/** Free-text role from the "add team member" form -> server role. */
export function roleToApi(label = "") {
  const text = String(label).toLowerCase();
  if (/finance|keuangan|rekonsiliasi/.test(text)) return "finance";
  if (/pic|gudang|warehouse/.test(text)) return "pic_warehouse";
  if (/supervisor|spv/.test(text)) return "supervisor";
  return "cs";
}

// ---------------------------------------------------------------- products
export function productFromApi(p) {
  return {
    id: `PRD-${pad(p.id)}`,
    dbId: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category || "Umum",
    price: num(p.selling_price),
    hpp: num(p.cost_price_hpp),
    stock: num(p.stock_quantity),
    lowStock: num(p.low_stock_threshold, 5),
    weight: num(p.weight_in_grams, 200),
    variants: Array.isArray(p.variants) && p.variants.length ? p.variants : ["Standard"],
    active: Boolean(p.is_active),
    description: p.description || "",
    imageUrl: p.image_url || "",
  };
}

/** Only fields that are present are sent, so a partial UI update never overwrites other columns. */
export function productToApi(ui) {
  const out = {};
  const set = (key, value) => {
    if (value !== undefined) out[key] = value;
  };
  set("sku", ui.sku);
  set("name", ui.name);
  set("category", ui.category);
  set("description", ui.description);
  set("selling_price", ui.price !== undefined ? num(ui.price) : undefined);
  set("cost_price_hpp", ui.hpp !== undefined ? num(ui.hpp) : undefined);
  set("stock_quantity", ui.stock !== undefined ? Math.max(0, Math.trunc(num(ui.stock))) : undefined);
  set("low_stock_threshold", ui.lowStock !== undefined ? Math.max(0, Math.trunc(num(ui.lowStock))) : undefined);
  set("weight_in_grams", ui.weight !== undefined ? Math.max(0, Math.trunc(num(ui.weight))) : undefined);
  set("is_active", ui.active !== undefined ? Boolean(ui.active) : undefined);
  if (ui.imageUrl) out.image_url = ui.imageUrl;
  return out;
}

// ---------------------------------------------------------------- orders
const PAYMENT_LABELS = {
  qris: "Dynamic QRIS",
  va: "Virtual Account",
  bank_transfer: "Transfer Bank",
  cod: "COD",
  cash: "Tunai (Kasir)",
};

export const PAID_STATUSES = ["paid", "processing", "shipped", "delivered", "completed"];

export function paymentMethodToApi(label = "") {
  const text = String(label).toLowerCase();
  if (text.includes("qris")) return "qris";
  if (text.includes("virtual") || text.includes("va")) return "va";
  if (text.includes("transfer")) return "bank_transfer";
  if (text.includes("cod")) return "cod";
  if (text.includes("tunai") || text.includes("cash") || text.includes("kasir")) return "cash";
  return "qris";
}

export function formatDateId(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
}

export function orderFromApi(o) {
  const items = (o.items || []).map((it) => ({
    productId: it.product_id ? `PRD-${pad(it.product_id)}` : null,
    name: it.item_name,
    qty: num(it.quantity, 1),
    price: num(it.unit_price),
  }));
  return {
    id: o.order_number,
    dbId: o.id,
    leadDbId: o.lead_id,
    customer: o.customer_name || "Pelanggan",
    customerName: o.customer_name || "Pelanggan",
    phone: o.customer_phone || "",
    city: o.customer_city || "-",
    items,
    subtotal: num(o.subtotal_amount),
    discount: num(o.discount_amount),
    shippingFee: num(o.shipping_fee),
    total: num(o.total_amount),
    total_amount: num(o.total_amount),
    grossProfit: num(o.gross_profit),
    paymentMethod: PAYMENT_LABELS[o.payment_method] || o.payment_method,
    status: o.status,
    paymentStatus: PAID_STATUSES.includes(o.status) ? "paid" : o.status === "cancelled" ? "cancelled" : "unpaid",
    cs: o.cs_name || "-",
    csDbId: o.cs_user_id || null,
    courier: o.courier || "",
    awb: o.awb || "",
    notes: o.notes || "",
    created_at: o.created_at,
    date: formatDateId(o.created_at),
  };
}

/** Context order payload (as the orders page builds it) -> POST /orders body. Prices are intentionally omitted: the server prices items. */
export function orderToApi(ui) {
  return {
    customer_name: ui.customer || undefined,
    customer_phone: ui.phone && String(ui.phone).replace(/\D/g, "").length >= 8 ? ui.phone : undefined,
    items: (ui.items || [])
      .map((it) => ({ product_id: toDbId(it.productId), quantity: Math.max(1, Math.trunc(num(it.qty, 1))) }))
      .filter((it) => it.product_id),
    shipping_fee: num(ui.shippingFee),
    payment_method: paymentMethodToApi(ui.paymentMethod),
    notes: ui.notes || undefined,
  };
}

// ---------------------------------------------------------------- leads
const LEAD_STATUS_TO_UI = { new: "new", in_progress: "follow_up", closing: "closing", repeat: "repeat_order", idle: "idle", closed_lost: "closed_lost" };
const LEAD_STATUS_TO_API = { new: "new", follow_up: "in_progress", closing: "closing", repeat_order: "repeat", idle: "idle", closed_lost: "closed_lost" };

export const leadStatusToUi = (s) => LEAD_STATUS_TO_UI[s] || "new";
export const leadStatusToApi = (s) => LEAD_STATUS_TO_API[s] || "new";

export function relativeTimeId(iso, now = Date.now()) {
  if (!iso) return "-";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export function leadFromApi(l, now = Date.now()) {
  const score = num(l.risk_cod_score, 100);
  return {
    id: `LEAD-${pad(l.id)}`,
    dbId: l.id,
    name: l.name || "Pelanggan",
    phone: l.phone_number ? `+${l.phone_number}` : "",
    email: "-",
    city: l.city || "",
    source: l.source || "manual",
    interest: l.interest || "",
    status: leadStatusToUi(l.status),
    cs: l.cs_name || "-",
    csDbId: l.assigned_cs_id || null,
    createdAt: l.created_at,
    codScore: score,
    codRisk: score > 80 ? "low" : score > 60 ? "medium" : "high",
    estValue: num(l.est_value),
    notes: l.notes || "",
    category: l.status === "repeat" ? "VIP" : "Lead",
    totalSpent: 0,
    lastInteraction: relativeTimeId(l.last_contacted_at || l.created_at, now),
  };
}

/** `team` is the mapped team list, used to turn the CS name picked in the form into an id. */
export function leadToApi(ui, team = []) {
  const out = {};
  const set = (k, v) => {
    if (v !== undefined) out[k] = v;
  };
  set("name", ui.name);
  set("phone_number", ui.phone !== undefined ? String(ui.phone).replace(/[^\d]/g, "") : undefined);
  set("source", ui.source);
  set("interest", ui.interest);
  set("notes", ui.notes);
  set("city", ui.city || undefined);
  if (ui.status !== undefined) out.status = leadStatusToApi(ui.status);
  if (ui.estValue !== undefined) out.est_value = Math.max(0, num(ui.estValue));
  if (ui.codScore !== undefined) out.risk_cod_score = Math.min(100, Math.max(0, Math.trunc(num(ui.codScore, 100))));
  if (ui.cs !== undefined) {
    const staff = team.find((m) => m.name === ui.cs);
    if (staff) out.assigned_cs_id = staff.dbId;
  }
  return out;
}

// ---------------------------------------------------------------- team
export const DEFAULT_PERMISSIONS = Object.freeze({
  qrisGenerate: true,
  voiceAiManage: false,
  mutationApproval: false,
  exportReports: false,
  productEdit: false,
});

export function teamMemberFromApi(u, performance = null) {
  const perf = performance || {};
  return {
    id: `USR-${pad(u.id)}`,
    dbId: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone_number || "",
    role: roleLabel(u.role),
    roleKey: u.role,
    status: u.is_active ? "active" : "inactive",
    csClosingRate: perf.handledChats ? `${Math.round((perf.closedOrders / perf.handledChats) * 100)}%` : "-",
    revenueGen: perf.revenueGenerated !== undefined ? `Rp ${Number(perf.revenueGenerated).toLocaleString("id-ID")}` : "-",
    permissions: { ...DEFAULT_PERMISSIONS, ...(u.permissions_json || {}) },
  };
}

// ---------------------------------------------------------------- institutions
export const DEFAULT_MODULES = Object.freeze({
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
});

const TIER_LABELS = { starter: "Starter", pro: "Pro Plan", enterprise: "Enterprise" };

export function tierToApi(label = "") {
  const text = String(label).toLowerCase();
  if (text.includes("enterprise")) return "enterprise";
  if (text.includes("starter")) return "starter";
  return "pro";
}

export function institutionFromApi(i) {
  return {
    id: `INST-${pad(i.id)}`,
    dbId: i.id,
    name: i.name,
    sector: i.sector || "Bisnis & Jasa",
    mode: i.mode,
    owner: i.owner_name || "-",
    email: i.email || "",
    phone: i.phone_number || "",
    address: i.address || "",
    tier: TIER_LABELS[i.subscription_tier] || "Pro Plan",
    tierKey: i.subscription_tier,
    quotaUsed: num(i.ai_tokens_used),
    quotaMax: num(i.ai_token_quota),
    blastCredits: num(i.blast_credit_quota),
    status: i.is_active ? "active" : "inactive",
    language: i.language || "id",
    modules: { ...DEFAULT_MODULES, ...(i.features_json || {}) },
    metaPixelId: i.meta_pixel_id || "",
    joinedDate: i.created_at ? new Date(i.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-",
  };
}

export function institutionToApi(ui, { superadmin = false } = {}) {
  const out = {};
  const set = (k, v) => {
    if (v !== undefined && v !== "") out[k] = v;
  };
  set("name", ui.name);
  set("sector", ui.sector);
  set("email", ui.email);
  set("phone_number", ui.phone);
  set("address", ui.address);
  set("language", ui.language);
  if (superadmin) {
    if (ui.modules) out.features = ui.modules;
    if (ui.tier !== undefined) out.subscription_tier = tierToApi(ui.tier);
    if (ui.quotaMax !== undefined) out.ai_token_quota = Math.max(0, Math.trunc(num(ui.quotaMax)));
    if (ui.status !== undefined) out.is_active = ui.status === "active";
  }
  return out;
}
