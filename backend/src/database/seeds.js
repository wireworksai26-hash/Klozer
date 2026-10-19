import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { initDb, closeDb, queryOne, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { hashPassword } from "../utils/crypto.js";
import { DEFAULT_FEATURES } from "../utils/constants.js";
import { runMigrations } from "./migrate.js";
import { DEMO_TENANTS, FIRST_NAMES, LAST_NAMES, STREETS } from "./demoData.js";

/**
 * DEMO DATA. Three fictional businesses with staff, catalog, leads, chats, orders, payments,
 * shipments, commissions and AI usage spread over the last 45 days, so every dashboard page
 * has something to show in a client demo.
 *
 *   npm run seed                      create the demo tenants (skips ones that already exist)
 *   npm run seed -- --reset           delete the demo tenants first, then create them again
 *
 * Refuses to run in production unless ALLOW_DEMO_SEED=true. The password comes from
 * SEED_PASSWORD, or is generated and printed once. Data is deterministic per tenant, relative to "now".
 * No WhatsApp channel is connected to these tenants, so nothing is ever sent to the fake phone numbers.
 */

// Demo tenants get every module switched on (except Baileys), so the whole product can be shown.
const DEMO_FEATURES = Object.fromEntries(Object.keys(DEFAULT_FEATURES).map((k) => [k, k !== "baileys"]));

const DAY = 86400000;
const PAID_GROUP = new Set(["paid", "processing", "shipped", "delivered", "completed"]);
const DAYS_BACK = 45;

// ---------- small helpers ----------
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const money = (n) => Math.round(n).toLocaleString("id-ID");
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? "" : String(vars[k])));
const addMinutes = (d, m) => new Date(d.getTime() + m * 60000);
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");

function makeRng(seedText) {
  const r = mulberry32(hashString(seedText));
  return {
    next: r,
    int: (min, max) => min + Math.floor(r() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
    hex: (n) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(r() * 16)]).join(""),
    digits: (n) => Array.from({ length: n }, () => Math.floor(r() * 10)).join(""),
    weighted: (weights) => {
      const entries = Object.entries(weights);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let x = r() * total;
      for (const [k, w] of entries) {
        x -= w;
        if (x <= 0) return k;
      }
      return entries[entries.length - 1][0];
    },
  };
}

async function insert(tx, table, row) {
  const cols = Object.keys(row);
  const result = await tx.query(
    `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    cols.map((c) => row[c])
  );
  return result.insertId;
}

async function insertMany(tx, table, rows, chunk = 300) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    await tx.query(`INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES ?`, [part.map((r) => cols.map((c) => r[c]))]);
  }
}

// ---------- order planning ----------
function pickOrderDate(rng, now) {
  // Square-ish skew toward recent days so the revenue chart trends upward.
  const daysAgo = Math.min(DAYS_BACK - 1, Math.floor(DAYS_BACK * Math.pow(rng.next(), 1.35)));
  const d = new Date(now.getTime() - daysAgo * DAY);
  const hourWib = 8 + Math.floor(rng.next() * 14);
  d.setUTCHours(hourWib - 7, rng.int(0, 59), rng.int(0, 59), 0);
  if (d > now) d.setTime(d.getTime() - DAY);
  return d;
}

function pickStatus(rng, ageDays, method, fulfillment) {
  const pickup = fulfillment === "pickup";
  let weights;
  if (ageDays > 10) weights = { completed: 0.86, cancelled: 0.08, delivered: 0.06 };
  else if (ageDays > 3) weights = { completed: 0.45, delivered: 0.2, shipped: 0.2, processing: 0.08, cancelled: 0.07 };
  else weights = { waiting_payment: 0.22, paid: 0.18, processing: 0.25, shipped: 0.2, delivered: 0.08, cancelled: 0.07 };

  let status = rng.weighted(weights);
  if ((method === "cod" || method === "cash") && status === "waiting_payment") status = "processing";
  if (method === "cod" && status === "paid") status = "processing";
  if (pickup && (status === "shipped" || status === "delivered")) status = "completed";
  if (method === "cash" && ageDays > 0 && status === "processing") status = "completed";
  return status;
}

function pickMethod(rng, t, fulfillment) {
  let method = rng.weighted(t.methods);
  if (fulfillment === "pickup" && (method === "cod" || method === "va" || method === "bank_transfer")) method = rng.chance(0.6) ? "qris" : "cash";
  if (fulfillment === "delivery" && method === "cash") method = "qris";
  return method;
}

function planOrders(rng, t, products, promos, buyerCount, repeatCount, orderCount, now) {
  const plans = [];
  for (let i = 0; i < orderCount; i++) {
    const leadIdx = rng.chance(0.4) ? rng.int(0, repeatCount - 1) : rng.int(0, buyerCount - 1);
    const createdAt = pickOrderDate(rng, now);
    const ageDays = (now - createdAt) / DAY;

    const lineCount = rng.chance(0.55) ? 1 : rng.chance(0.7) ? 2 : 3;
    const used = new Set();
    const items = [];
    for (let l = 0; l < lineCount; l++) {
      const prod = products[Math.floor(products.length * Math.pow(rng.next(), 1.6))];
      if (used.has(prod.sku)) continue;
      used.add(prod.sku);
      const qty = prod.category === "Catering" ? 1 : rng.int(1, t.qtyMax);
      const variant = prod.variants.length ? rng.pick(prod.variants) : null;
      items.push({ prod, variant, qty });
    }

    const fulfillment = t.fulfillment === "mixed" ? (rng.chance(0.75) ? "delivery" : "pickup") : t.fulfillment;
    const method = pickMethod(rng, t, fulfillment);
    const subtotal = items.reduce((s, it) => s + it.prod.price * it.qty, 0);
    const hpp = items.reduce((s, it) => s + it.prod.hpp * it.qty, 0);
    const shipping = fulfillment === "delivery" ? Math.round(rng.int(t.shipping.fee[0], t.shipping.fee[1]) / 500) * 500 : 0;

    let discount = 0;
    let promo = null;
    if (rng.chance(0.3)) {
      const candidates = promos.filter((p) => subtotal >= p.min && (p.type !== "free_shipping" || shipping > 0));
      if (candidates.length) {
        promo = rng.pick(candidates);
        if (promo.type === "percentage") discount = Math.min(Math.round((subtotal * promo.value) / 100), promo.max ?? Infinity);
        else if (promo.type === "fixed") discount = promo.value;
        else discount = Math.min(shipping, promo.max ?? shipping);
      }
    }

    plans.push({
      leadIdx,
      createdAt,
      items,
      subtotal,
      hpp,
      discount,
      promo,
      shipping,
      total: subtotal - discount + shipping,
      method,
      fulfillment,
      status: pickStatus(rng, ageDays, method, fulfillment),
      ageDays,
    });
  }
  plans.sort((a, b) => a.createdAt - b.createdAt);
  return plans;
}

// ---------- tenant seeding ----------
export async function seedTenant(tx, t, ctx) {
  const { passwordHash, now } = ctx;
  const rng = makeRng(t.slug);
  const summary = { slug: t.slug, name: t.name, users: [], leads: 0, orders: 0, messages: 0 };

  // Institution
  const instId = await insert(tx, "institutions", {
    name: t.name,
    slug: t.slug,
    mode: "business",
    sector: t.sector,
    phone_number: t.phone,
    email: `owner@${t.emailDomain}`,
    address: t.address,
    subscription_tier: "pro",
    subscription_expires_at: new Date(now.getTime() + 24 * DAY),
    blast_credit_quota: 5000,
    ai_token_quota: 1500000,
    features_json: JSON.stringify(DEMO_FEATURES),
    language: "id",
    ai_persona_json: JSON.stringify(t.persona),
    is_active: 1,
    created_at: new Date(now.getTime() - 60 * DAY),
  });

  // Staff
  const staff = {};
  const csUsers = [];
  let csIndex = 0;
  for (const s of t.staff) {
    const email = `${s.mail}@${t.emailDomain}`;
    const id = await insert(tx, "users", {
      institution_id: instId,
      name: s.name,
      email,
      password_hash: passwordHash,
      role: s.role,
      phone_number: s.phone,
      commission_rate_percent: s.rate,
      is_online: s.role === "cs" && csIndex === 0 ? 1 : s.role === "owner" ? 1 : 0,
      is_active: 1,
      last_login_at: addMinutes(now, -rng.int(5, 600)),
      created_at: new Date(now.getTime() - 58 * DAY),
    });
    const user = { id, name: s.name, role: s.role, rate: s.rate, email };
    staff[s.role] = staff[s.role] || user;
    if (s.role === "cs") {
      csUsers.push(user);
      csIndex++;
    }
    summary.users.push({ role: s.role, email, name: s.name });
  }

  // Catalog
  const products = [];
  for (const [sku, name, category, price, hpp, stock, low, weight, variants] of t.products) {
    const id = await insert(tx, "products", {
      institution_id: instId,
      sku,
      name,
      category,
      description: `${name}. Produk demo ${t.name}.`,
      selling_price: price,
      cost_price_hpp: hpp,
      stock_quantity: stock,
      low_stock_threshold: low,
      weight_in_grams: weight,
      is_active: 1,
      created_at: new Date(now.getTime() - 55 * DAY),
    });
    products.push({ id, sku, name, category, price, hpp, stock, variants });
    if (variants.length) {
      const base = Math.floor(stock / variants.length);
      let remainder = stock - base * variants.length;
      const rows = variants.map((v) => {
        const qty = base + (remainder-- > 0 ? 1 : 0);
        return { product_id: id, variant_sku: `${sku}-${v}`, variant_name: v, stock_quantity: qty, is_active: 1 };
      });
      await insertMany(tx, "product_variants", rows);
    }
  }

  // Labels
  const labelIds = {};
  for (const [name, color] of t.labels) labelIds[name] = await insert(tx, "lead_labels", { institution_id: instId, name, color_hex: color });
  const labelByPattern = (re) => {
    const name = Object.keys(labelIds).find((n) => re.test(n));
    return name ? labelIds[name] : null;
  };

  // Payment destinations, warehouse, promos
  const bankIds = [];
  for (const b of t.banks) {
    bankIds.push(
      await insert(tx, "bank_accounts", {
        institution_id: instId,
        bank_code: b.bank_code,
        account_number: b.account_number,
        account_holder: b.account_holder,
        branch_office: b.branch_office,
        transfer_instruction: b.instruction,
        is_manual_transfer: 1,
        is_active: 1,
      })
    );
  }
  await insert(tx, "shipping_warehouses", {
    institution_id: instId,
    name: t.warehouse.name,
    phone_number: t.phone,
    address_line: t.address,
    subdistrict: t.warehouse.subdistrict,
    city: t.warehouse.city,
    province: t.warehouse.province,
    postal_code: t.warehouse.postal,
    couriers_active_json: JSON.stringify(t.warehouse.couriers),
    cod_enabled: 1,
    is_default: 1,
  });
  const promos = t.promos.map((p) => ({ ...p, used: 0 }));
  const promoIds = {};
  for (const p of promos) {
    promoIds[p.code] = await insert(tx, "promos_vouchers", {
      institution_id: instId,
      code: p.code,
      discount_type: p.type,
      discount_value: p.value,
      min_spend_idr: p.min,
      max_discount_idr: p.max,
      max_uses_total: p.uses,
      used_count: 0,
      valid_from: new Date(now.getTime() - 40 * DAY),
      valid_until: new Date(now.getTime() + 20 * DAY),
      is_active: 1,
    });
  }

  // People who will chat with the business
  const leadCount = t.slug === "geprek-juara" ? 66 : 52;
  const buyerCount = Math.round(leadCount * 0.7);
  const repeatCount = Math.max(6, Math.round(buyerCount * 0.35));
  const orderCount = t.slug === "geprek-juara" ? 120 : 72;
  const usedPhones = new Set();
  const usedNames = new Set();
  const leads = [];
  for (let i = 0; i < leadCount; i++) {
    let name;
    do name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    while (usedNames.has(name));
    usedNames.add(name);
    let phone;
    do phone = `${rng.pick(["62812", "62813", "62821", "62852", "62857", "62878", "62896"])}${rng.digits(7)}`;
    while (usedPhones.has(phone));
    usedPhones.add(phone);
    const city = rng.pick(t.leadCities);
    const source = rng.weighted({ whatsapp: 0.4, meta_ads: 0.3, instagram: 0.2, manual: 0.1 });
    leads.push({
      name,
      phone,
      city,
      source,
      gender: rng.chance(0.62) ? "Perempuan" : "Laki-laki",
      address: `${rng.pick(STREETS)} No. ${rng.int(1, 120)}, ${city}`,
      interest: rng.pick(t.interests),
      cs: csUsers[i % csUsers.length],
      orders: [],
    });
  }

  const plans = planOrders(rng, t, products, promos, buyerCount, repeatCount, orderCount, now);
  for (const p of plans) leads[p.leadIdx].orders.push(p);

  // Lead timeline, status and risk
  for (const [i, lead] of leads.entries()) {
    const nonCancelled = lead.orders.filter((o) => o.status !== "cancelled");
    if (lead.orders.length) {
      lead.createdAt = addMinutes(lead.orders[0].createdAt, -rng.int(25, 90));
      lead.lastContactedAt = addMinutes(lead.orders[lead.orders.length - 1].createdAt, rng.int(5, 600));
      if (lead.lastContactedAt > now) lead.lastContactedAt = now;
      const newest = lead.orders[lead.orders.length - 1];
      if (!nonCancelled.length) lead.status = "closed_lost";
      else if (nonCancelled.length >= 2) lead.status = "repeat";
      else if (newest.ageDays < 7 || newest.status === "waiting_payment") lead.status = "closing";
      else lead.status = "idle";
    } else {
      const age = rng.chance(0.25) ? rng.int(0, 1) : rng.chance(0.4) ? rng.int(2, 9) : rng.int(10, 30);
      lead.createdAt = new Date(now.getTime() - age * DAY - rng.int(0, 600) * 60000);
      lead.lastContactedAt = addMinutes(lead.createdAt, rng.int(3, 120));
      lead.status = age < 2 ? "new" : age < 10 ? "in_progress" : rng.chance(0.6) ? "idle" : "closed_lost";
    }
    lead.risk = lead.orders.some((o) => o.method === "cod") ? rng.int(55, 95) : 100;
    if (i === buyerCount - 1) lead.risk = 28;
  }

  // Insert leads
  for (const lead of leads) {
    const avg = lead.orders.length ? Math.round(lead.orders.reduce((s, o) => s + o.total, 0) / lead.orders.length) : rng.int(2, 9) * 50000;
    const adSeq = rng.int(1, 4);
    lead.adId = lead.source === "meta_ads" ? `${t.adPrefix}-AD-${adSeq}` : null;
    lead.id = await insert(tx, "leads", {
      institution_id: instId,
      phone_number: lead.phone,
      external_id: lead.phone,
      name: lead.name,
      gender: lead.gender,
      address_full: lead.orders.length ? lead.address : null,
      city: lead.city,
      assigned_cs_id: lead.cs.id,
      status: lead.status,
      source: lead.source,
      interest: lead.interest,
      est_value: avg,
      notes: lead.risk < 40 ? "Pernah menolak COD saat kurir tiba. Disarankan bayar di muka." : null,
      risk_cod_score: lead.risk,
      meta_ad_id: lead.adId,
      meta_campaign_id: lead.adId ? `${t.adPrefix}-CMP-${adSeq <= 2 ? 1 : 2}` : null,
      last_contacted_at: lead.lastContactedAt,
      created_at: lead.createdAt,
    });
  }
  summary.leads = leads.length;

  // Ad attribution
  const headlines = [`Promo spesial ${t.name}`, "Chat sekarang, dapat voucher", "Stok terbatas minggu ini"];
  const adRows = leads
    .filter((l) => l.adId)
    .map((l) => ({
      institution_id: instId,
      lead_id: l.id,
      ad_id: l.adId,
      campaign_id: `${t.adPrefix}-CMP-${Number(l.adId.slice(-1)) <= 2 ? 1 : 2}`,
      adset_id: `${t.adPrefix}-SET-${Number(l.adId.slice(-1))}`,
      headline: headlines[Number(l.adId.slice(-1)) % headlines.length],
      source_url: `https://www.instagram.com/p/demo${l.adId.slice(-1)}/`,
      created_at: l.createdAt,
    }));
  await insertMany(tx, "meta_ad_referrals", adRows);

  // Labels on leads
  const followLabel = labelByPattern(/follow/i);
  const loyalLabel = labelByPattern(/vip|setia/i);
  const repeatLabel = labelByPattern(/repeat|langganan|reseller/i);
  const mapRows = [];
  const bySpend = [...leads].sort((a, b) => b.orders.reduce((s, o) => s + o.total, 0) - a.orders.reduce((s, o) => s + o.total, 0));
  bySpend.slice(0, 3).forEach((l) => loyalLabel && mapRows.push({ lead_id: l.id, label_id: loyalLabel, assigned_at: now }));
  for (const l of leads) {
    if (l.status === "repeat" && repeatLabel && !mapRows.some((m) => m.lead_id === l.id && m.label_id === repeatLabel)) mapRows.push({ lead_id: l.id, label_id: repeatLabel, assigned_at: now });
    if ((l.status === "idle" || l.status === "closed_lost") && followLabel) mapRows.push({ lead_id: l.id, label_id: followLabel, assigned_at: now });
  }
  await insertMany(tx, "leads_labels_map", mapRows);

  // Orders and everything hanging off them
  const usedNumbers = new Set();
  const paymentRows = [];
  const mutationRows = [];
  const followups = [];

  for (const p of plans) {
    const lead = leads[p.leadIdx];
    let orderNumber;
    do orderNumber = `ORD-${ymd(p.createdAt)}-${rng.hex(6)}`;
    while (usedNumbers.has(orderNumber));
    usedNumbers.add(orderNumber);
    p.number = orderNumber;

    const paidAt = addMinutes(p.createdAt, rng.int(2, 25));
    const bankTransferPaid = p.method === "bank_transfer" && PAID_GROUP.has(p.status);
    const reviewer = staff.finance;
    p.id = await insert(tx, "orders", {
      institution_id: instId,
      order_number: orderNumber,
      lead_id: lead.id,
      cs_user_id: lead.cs.id,
      subtotal_amount: p.subtotal,
      discount_amount: p.discount,
      shipping_fee: p.shipping,
      admin_fee: 0,
      total_amount: p.total,
      total_cost_hpp: p.hpp,
      gross_profit: p.subtotal - p.discount - p.hpp,
      payment_method: p.method,
      fulfillment_type: p.fulfillment,
      status: p.status,
      review_status: bankTransferPaid ? "approved" : "not_required",
      reviewed_by_user_id: bankTransferPaid ? reviewer.id : null,
      reviewed_at: bankTransferPaid ? addMinutes(paidAt, 20) : null,
      notes: [p.promo ? `Voucher ${p.promo.code}` : null, rng.chance(0.08) ? "Mohon dikemas rapi untuk kado." : null].filter(Boolean).join(". ") || null,
      created_at: p.createdAt,
      updated_at: p.status === "waiting_payment" ? p.createdAt : addMinutes(p.createdAt, rng.int(30, 2000)),
    });
    if (p.promo) promos.find((x) => x.code === p.promo.code).used++;

    await insertMany(
      tx,
      "order_items",
      p.items.map((it) => ({
        order_id: p.id,
        product_id: it.prod.id,
        item_name: it.variant ? `${it.prod.name} (${it.variant})` : it.prod.name,
        quantity: it.qty,
        unit_price: it.prod.price,
        unit_cost_hpp: it.prod.hpp,
        subtotal: it.prod.price * it.qty,
      }))
    );

    // Payment record
    const paid = PAID_GROUP.has(p.status);
    if (p.method === "qris" || p.method === "va") {
      const ref = `KLZ-${instId}-${p.id}-${rng.hex(6)}`;
      const status = paid ? "paid" : "expired";
      paymentRows.push({
        institution_id: instId,
        order_id: p.id,
        payment_reference: ref,
        provider_transaction_id: paid ? `${rng.digits(7)}` : null,
        provider: "ipaymu",
        payment_type: p.method === "qris" ? "qris" : "va_bca",
        amount: p.total,
        fee_amount: p.method === "qris" ? Math.round(p.total * 0.007) : 4500,
        qr_string: p.method === "qris" ? `DEMO-QRIS|${ref}|${p.total}` : null,
        va_number: p.method === "va" ? `8077${rng.digits(11)}` : null,
        status,
        paid_at: paid ? paidAt : null,
        expires_at: addMinutes(p.createdAt, p.method === "qris" ? 5 : 1440),
        created_at: p.createdAt,
      });
    } else if (bankTransferPaid) {
      paymentRows.push({
        institution_id: instId,
        order_id: p.id,
        payment_reference: `MAN-${instId}-${p.id}-${rng.hex(6)}`,
        provider_transaction_id: null,
        provider: "manual",
        payment_type: "manual_transfer",
        amount: p.total,
        fee_amount: 0,
        qr_string: null,
        va_number: null,
        status: "paid",
        paid_at: paidAt,
        expires_at: addMinutes(p.createdAt, 1440),
        created_at: p.createdAt,
      });
      mutationRows.push({
        institution_id: instId,
        bank_account_id: rng.pick(bankIds),
        amount: p.total,
        type: "CR",
        description_raw: `TRF ${lead.name.toUpperCase()} ${orderNumber}`,
        sender_name: lead.name,
        transaction_date: paidAt,
        is_reconciled: 1,
        matched_order_id: p.id,
        created_at: paidAt,
      });
    }

    // Commission for the CS who closed it
    if (paid && lead.cs.rate > 0) {
      await insert(tx, "cs_commission_ledgers", {
        institution_id: instId,
        cs_user_id: lead.cs.id,
        order_id: p.id,
        commission_amount: Math.round((p.total * lead.cs.rate) / 100),
        calculation_basis: "percentage",
        is_settled: p.ageDays > 14 ? 1 : 0,
        settled_at: p.ageDays > 14 ? addMinutes(p.createdAt, 14 * 1440) : null,
        created_at: paidAt,
      });
    }

    // Shipment
    if (p.fulfillment === "delivery" && ["processing", "shipped", "delivered", "completed"].includes(p.status)) {
      const [courier, service] = rng.pick(t.shipping.couriers);
      const instant = /go|grab/i.test(courier);
      const delivered = p.status === "delivered" || p.status === "completed";
      const shipStatus = delivered ? "delivered" : p.status === "shipped" ? "in_transit" : "pickup_requested";
      const awb = shipStatus === "pickup_requested" ? null : `${courier.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}${rng.digits(11)}`;
      const isCod = p.method === "cod";
      p.courier = courier;
      p.awb = awb;
      p.shippedAt = addMinutes(p.createdAt, instant ? 30 : 1440 + rng.int(0, 600));
      const shipmentId = await insert(tx, "shipping_shipments", {
        order_id: p.id,
        courier_code: courier,
        service_name: service,
        awb_number: awb,
        shipping_fee_customer: p.shipping,
        shipping_fee_real: Math.round((p.shipping * 0.85) / 500) * 500,
        cashback_amount: p.shipping - Math.round((p.shipping * 0.85) / 500) * 500,
        is_cod: isCod ? 1 : 0,
        cod_amount: isCod ? p.total : 0,
        cod_status: !isCod ? "none" : delivered ? (p.ageDays > 7 ? "settled_to_merchant" : "collected_by_courier") : "pending_courier",
        shipping_status: shipStatus,
        created_at: p.createdAt,
      });
      if (awb) {
        const steps = instant
          ? [["ASSIGNED", "Driver ditugaskan"], ["PICKED_UP", "Pesanan dijemput driver"], ...(delivered ? [["DELIVERED", "Pesanan diterima pelanggan"]] : [["ON_THE_WAY", "Driver menuju lokasi pelanggan"]])]
          : [
              ["PICKED_UP", "Paket diambil kurir", t.warehouse.city],
              ["IN_TRANSIT", "Paket diproses di hub transit", "Semarang"],
              ["OUT_FOR_DELIVERY", "Paket dibawa kurir ke alamat tujuan", lead.city],
              ...(delivered ? [["DELIVERED", "Paket diterima oleh yang bersangkutan", lead.city]] : []),
            ];
        const shown = delivered ? steps : steps.slice(0, Math.min(steps.length, 2));
        const logs = shown.map(([code, desc, city], idx) => ({
          shipment_id: shipmentId,
          status_code: code,
          status_description: desc,
          location_city: city || null,
          event_timestamp: new Date(Math.min(now.getTime(), p.shippedAt.getTime() + idx * (instant ? 20 : 720) * 60000)),
        }));
        await insertMany(tx, "shipping_tracking_logs", logs);
      }
    }

    // Abandoned-payment follow-ups
    if (p.status === "waiting_payment") {
      const recent = p.ageDays < 1;
      followups.push({
        institution_id: instId,
        lead_id: lead.id,
        step_number: 1,
        trigger_reason: "abandoned_qris",
        scheduled_at: addMinutes(p.createdAt, 30),
        executed_at: recent ? null : addMinutes(p.createdAt, 31),
        status: recent ? "pending" : "sent",
      });
    }
  }
  summary.orders = plans.length;
  paymentRows.sort((a, b) => a.created_at - b.created_at);
  await insertMany(tx, "payments", paymentRows);

  // Bank mutations that were never matched: shows the reconciliation queue.
  for (let i = 0; i < 3; i++) {
    mutationRows.push({
      institution_id: instId,
      bank_account_id: bankIds[0],
      amount: rng.int(1, 12) * 25000 + 15000,
      type: "CR",
      description_raw: `TRSF E-BANKING CR ${rng.digits(10)} ${rng.pick(FIRST_NAMES).toUpperCase()}`,
      sender_name: null,
      transaction_date: addMinutes(now, -rng.int(60, 3000)),
      is_reconciled: 0,
      matched_order_id: null,
      created_at: now,
    });
  }
  mutationRows.push({
    institution_id: instId,
    bank_account_id: bankIds[0],
    amount: 150000,
    type: "DB",
    description_raw: "BIAYA ADM BULANAN",
    sender_name: null,
    transaction_date: addMinutes(now, -2 * 1440),
    is_reconciled: 1,
    matched_order_id: null,
    created_at: now,
  });
  await insertMany(tx, "bank_mutations", mutationRows);

  // Voucher usage counters
  for (const p of promos) await tx.query("UPDATE promos_vouchers SET used_count = ? WHERE id = ?", [p.used, promoIds[p.code]]);

  // Idle leads get a re-engagement job
  for (const l of leads.filter((x) => x.status === "idle").slice(0, 4)) {
    followups.push({
      institution_id: instId,
      lead_id: l.id,
      step_number: 1,
      trigger_reason: "re_engagement",
      scheduled_at: addMinutes(now, rng.int(60, 1500)),
      executed_at: null,
      status: "pending",
    });
  }
  await insertMany(tx, "proactive_followup_jobs", followups);

  // ---------- chats ----------
  const C = t.chat;
  const messages = [];
  const usage = [];
  let tokenTotal = 0;
  const addMsg = (lead, sender, type, text, at, extra = {}) => {
    const row = {
      institution_id: instId,
      lead_id: lead.id,
      sender_type: sender,
      sender_user_id: sender === "cs" ? lead.cs.id : null,
      message_type: type,
      content_text: text,
      tokens_used: 0,
      model_used: null,
      is_delivered: 1,
      created_at: at,
      ...extra,
    };
    if (sender === "ai_agent") {
      const prompt = rng.int(420, 950);
      const completion = rng.int(45, 170);
      row.tokens_used = prompt + completion;
      row.model_used = "meta/llama-3.3-70b-instruct";
      tokenTotal += prompt + completion;
      usage.push({
        institution_id: instId,
        user_id: null,
        model: "meta/llama-3.3-70b-instruct",
        usage_type: "chat_cs",
        prompt_tokens: prompt,
        completion_tokens: completion,
        total_tokens: prompt + completion,
        latency_ms: rng.int(700, 2600),
        cost_idr: Number(((prompt + completion) * config.ai.costIdrPerToken).toFixed(4)),
        status: "ok",
        created_at: at,
      });
    }
    messages.push(row);
  };

  for (const lead of leads) {
    const first = lead.name.split(" ")[0];
    const focus = lead.orders[0]?.items[0]?.prod || rng.pick(products);
    const firstOrder = lead.orders[0];
    const quotedShip = firstOrder?.shipping || rng.int(t.shipping.fee[0], t.shipping.fee[1]);
    const vars = { n: first, p: focus.name, price: money(focus.price), city: lead.city, ship: money(quotedShip), courier: firstOrder?.courier || t.shipping.couriers[0][0], qty: 1 };
    let at = addMinutes(lead.createdAt, 0);
    const step = (min = 1, max = 3) => (at = addMinutes(at, rng.int(min, max)));

    addMsg(lead, "customer", "text", fill(rng.pick(C.greet), vars), at);
    addMsg(lead, "ai_agent", "text", fill(C.aiHello, vars), step(0, 1));
    addMsg(lead, "ai_agent", "text", fill(C.aiPrice, vars), step(0, 1));

    if (!lead.orders.length) {
      if (lead.status !== "new") {
        addMsg(lead, "customer", "text", fill(rng.pick(C.ask), vars), step(2, 8));
        addMsg(lead, "ai_agent", "text", fill(C.aiAnswer, vars), step(0, 1));
      }
      if (lead.status === "idle" || lead.status === "closed_lost") addMsg(lead, "customer", "text", rng.pick(C.idle), step(5, 60));
      continue;
    }

    // First order conversation
    addMsg(lead, "customer", "text", fill(rng.pick(C.ask), vars), step(2, 6));
    addMsg(lead, "ai_agent", "text", fill(C.aiAnswer, vars), step(0, 1));
    for (const [idx, o] of lead.orders.entries()) {
      const itemsText = o.items.map((it) => `${it.qty}x ${it.prod.name}${it.variant ? ` (${it.variant})` : ""}`).join(", ");
      const ov = { ...vars, qty: o.items[0].qty, items: itemsText, total: money(o.total), ship: money(o.shipping), no: o.number, courier: o.courier || vars.courier, awb: o.awb || "-" };
      if (idx === 0) at = addMinutes(o.createdAt, -3);
      else at = addMinutes(o.createdAt, -rng.int(4, 15));
      addMsg(lead, "customer", "text", idx === 0 ? fill(rng.pick(C.closing), ov) : `Kak, mau order lagi ya. ${itemsText}`, at);
      addMsg(lead, "ai_agent", "text", fill(C.aiOrder, ov), addMinutes(o.createdAt, 0));
      if (o.method === "qris") addMsg(lead, "ai_agent", "qris_invoice", `QRIS ${o.number} • Total Rp ${money(o.total)} • berlaku 5 menit`, addMinutes(o.createdAt, 0));
      else if (o.method === "bank_transfer") addMsg(lead, "ai_agent", "text", `Silakan transfer Rp ${money(o.total)} ke ${t.banks[0].bank_code} ${t.banks[0].account_number} a.n. ${t.banks[0].account_holder}, lalu kirim bukti transfernya di sini ya Kak.`, addMinutes(o.createdAt, 0));
      else if (o.method === "va") addMsg(lead, "ai_agent", "text", `Nomor Virtual Account untuk pesanan ${o.number} sudah kami kirim. Total Rp ${money(o.total)}.`, addMinutes(o.createdAt, 0));
      else if (o.method === "cod") addMsg(lead, "ai_agent", "text", `Pesanan dengan COD dicatat ya Kak. Mohon siapkan uang tunai Rp ${money(o.total)} saat kurir tiba.`, addMinutes(o.createdAt, 0));

      const paidOrder = PAID_GROUP.has(o.status);
      if (paidOrder && (o.method === "qris" || o.method === "va" || o.method === "bank_transfer")) {
        const payAt = addMinutes(o.createdAt, rng.int(3, 25));
        if (payAt <= now) {
          if (o.method === "bank_transfer") addMsg(lead, "customer", "document_receipt", "Bukti transfer terlampir", payAt);
          addMsg(lead, "ai_agent", "text", fill(C.aiPaid, ov), addMinutes(payAt, 1));
        }
      }
      if (o.awb && o.shippedAt <= now) addMsg(lead, "ai_agent", "text", fill(C.aiShipped, ov), o.shippedAt);
      if ((o.status === "completed" || o.status === "delivered") && o.ageDays > 3) {
        addMsg(lead, "customer", "text", rng.pick(C.thanks), new Date(Math.min(now.getTime(), o.createdAt.getTime() + rng.int(2, 4) * DAY)));
      }
      if (o.status === "waiting_payment") addMsg(lead, "ai_agent", "text", t.persona.abandonedMessage, addMinutes(o.createdAt, 30));
    }
    // A handover to a human now and then
    if (rng.chance(0.18)) {
      const when = new Date(Math.min(now.getTime(), lead.lastContactedAt.getTime()));
      addMsg(lead, "customer", "text", "Kak, boleh bicara dengan admin langsung? Ada yang mau saya tanyakan soal pesanan.", addMinutes(when, 1));
      addMsg(lead, "cs", "text", `Halo Kak ${first}, saya ${lead.cs.name.split(" ")[0]} dari tim ${t.name}. Ada yang bisa kami bantu?`, addMinutes(when, 4));
    }
  }
  messages.sort((a, b) => a.created_at - b.created_at);
  await insertMany(tx, "chat_messages", messages);
  await insertMany(tx, "ai_token_usage_logs", usage);
  await tx.query("UPDATE institutions SET ai_tokens_used = ? WHERE id = ?", [tokenTotal, instId]);
  summary.messages = messages.length;
  summary.aiTokens = tokenTotal;

  // A little audit trail
  const trail = [
    ["auth.login", staff.owner, "user", staff.owner.id],
    ["bank_account.create", staff.owner, "bank_account", bankIds[0]],
    ["ai.persona_update", staff.spv || staff.owner, null, null],
    ["order.status_update", staff.finance || staff.owner, "order", plans[plans.length - 1]?.id],
    ["auth.login", staff.finance || staff.owner, "user", (staff.finance || staff.owner).id],
  ];
  await insertMany(
    tx,
    "audit_logs",
    trail.map(([action, user, entityType, entityId], i) => ({
      institution_id: instId,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      ip_address: "127.0.0.1",
      metadata_json: JSON.stringify({ demo: true }),
      created_at: addMinutes(now, -(i + 1) * 180),
    }))
  );
  return summary;
}

// ---------- entry points ----------
export async function resetDemoData() {
  for (const t of DEMO_TENANTS) {
    const inst = await queryOne("SELECT id FROM institutions WHERE slug = ?", [t.slug]);
    if (!inst) continue;
    await transaction(async (tx) => {
      // orders reference leads without ON DELETE, so they have to go first.
      await tx.query("DELETE FROM orders WHERE institution_id = ?", [inst.id]);
      await tx.query("DELETE FROM audit_logs WHERE institution_id = ?", [inst.id]);
      await tx.query("DELETE FROM institutions WHERE id = ?", [inst.id]);
    });
    logger.info({ tenant: t.slug }, "Demo tenant removed");
  }
}

export async function seedDemoData({ reset = false, password } = {}) {
  if (config.isProduction && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Seeding demo data dilarang di production. Set ALLOW_DEMO_SEED=true bila memang disengaja.");
  }
  const generated = !password && !process.env.SEED_PASSWORD;
  const demoPassword = password || process.env.SEED_PASSWORD || `${crypto.randomBytes(9).toString("base64url")}!9`;
  if (reset) await resetDemoData();
  const passwordHash = await hashPassword(demoPassword);
  const now = new Date();

  const created = [];
  for (const t of DEMO_TENANTS) {
    if (await queryOne("SELECT id FROM institutions WHERE slug = ?", [t.slug])) {
      logger.info({ tenant: t.slug }, "Seed skipped (already exists). Use --reset to rebuild.");
      continue;
    }
    created.push(await transaction((tx) => seedTenant(tx, t, { passwordHash, now })));
    logger.info({ tenant: t.slug }, "Seeded demo tenant");
  }

  if (created.length) {
    const lines = ["", "================ AKUN DEMO ================", `Password semua akun: ${demoPassword}${generated ? "  (dibuat acak, catat sekarang)" : ""}`, ""];
    for (const c of created) {
      lines.push(`${c.name}  [${c.orders} pesanan, ${c.leads} lead, ${c.messages} pesan chat]`);
      for (const u of c.users) lines.push(`  ${u.role.padEnd(14)} ${u.email}`);
      lines.push("");
    }
    // eslint-disable-next-line no-console -- the credentials list is the output of this CLI
    console.log(lines.join("\n"));
  } else {
    // eslint-disable-next-line no-console -- CLI output
    console.log("Tidak ada tenant baru. Jalankan dengan --reset untuk membangun ulang data demo.");
  }
  return created;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  initDb()
    .then(runMigrations)
    .then(() => seedDemoData({ reset: process.argv.includes("--reset") }))
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err: err.message }, "Seeding failed");
      process.exit(1);
    });
}
