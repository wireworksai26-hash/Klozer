import { query, queryOne, transaction } from "../../config/db.js";
import { emitToTenant } from "../../realtime.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { TIER_TOKEN_BUNDLE } from "../../utils/constants.js";
import { ORDER_TTL_HOURS, PLANS, featureMapFor, planOffer } from "../../utils/plans.js";
import { dynamicQrisFor } from "../platformPaymentService.js";
import { reservePayAmount } from "./payAmounts.js";

/**
 * A shop buying a package. It picks a plan and a period, gets a bill with the exact amount to pay (and a dynamic QRIS for
 * it), and once the payment is confirmed (by a matching payment notice, or by the team) the plan, its features and its
 * tokens are applied at once, in one transaction and only once.
 *
 * What a paid order does to the shop:
 *  - the plan: subscription_tier is set, and subscription_expires_at moves forward by the months bought, starting from the
 *    current end when the shop renews the same plan and is still active, otherwise from now
 *  - the features: every package switch is set to what the plan includes
 *  - the tokens: the plan's token bundle for each month bought is added to the quota (see TIER_TOKEN_BUNDLE)
 */

const toOrder = (r) => {
  const expired = r.status === "pending" && new Date(r.expires_at).getTime() <= Date.now();
  return {
    id: r.id,
    institutionId: r.institution_id,
    institutionName: r.institution_name ?? undefined,
    requestedByName: r.requested_by_name ?? undefined,
    plan: r.plan,
    planName: PLANS[r.plan].name,
    period: r.period,
    months: r.months,
    listPriceIdr: Number(r.list_price_idr),
    discountIdr: Number(r.discount_idr),
    baseAmountIdr: Number(r.base_amount_idr),
    uniqueCode: Number(r.unique_code),
    payAmountIdr: r.pay_amount_idr === null ? null : Number(r.pay_amount_idr),
    status: expired ? "expired" : r.status,
    expiresAt: r.expires_at,
    paymentClaimedAt: r.payment_claimed_at,
    paymentReference: r.payment_reference,
    paidAt: r.paid_at,
    paidVia: r.paid_via,
    activatedUntil: r.activated_until,
    tokensGranted: r.tokens_granted === null ? null : Number(r.tokens_granted),
    proofCount: Number(r.proof_count ?? 0),
    paidBy: r.paid_by ?? null,
    cancelledAt: r.cancelled_at,
    createdAt: r.created_at,
  };
};

const SELECT = `SELECT o.*, i.name AS institution_name, u.name AS requested_by_name,
    (SELECT COUNT(*) FROM platform_payment_proofs p WHERE p.ref_type = 'order' AND p.ref_id = o.id) AS proof_count
  FROM platform_orders o JOIN institutions i ON i.id = o.institution_id LEFT JOIN users u ON u.id = o.requested_by`;

async function load(id, institutionId = null) {
  const row = await queryOne(`${SELECT} WHERE o.id = ? ${institutionId ? "AND o.institution_id = ?" : ""}`, institutionId ? [id, institutionId] : [id]);
  if (!row) throw notFound("Pesanan paket tidak ditemukan.");
  return row;
}

const tell = (institutionId, order) => emitToTenant(institutionId, "billing:updated", { id: order.id, status: order.status, plan: order.plan });

/** A shop's first purchase is the only one that gets the introductory discount. */
const isFirstPurchase = async (db, institutionId) => !(await db.queryOne("SELECT id FROM platform_orders WHERE institution_id = ? AND status = 'paid' LIMIT 1", [institutionId]));

/** The plans a shop can buy, with the price of each period for this shop, and where its plan stands now. */
export async function listPlans(institutionId) {
  const inst = await queryOne("SELECT subscription_tier, subscription_expires_at FROM institutions WHERE id = ?", [institutionId]);
  if (!inst) throw notFound("Toko tidak ditemukan.");
  const firstPurchase = await isFirstPurchase({ queryOne }, institutionId);
  const plans = Object.keys(PLANS).map((plan) => ({
    plan,
    name: PLANS[plan].name,
    tokensPerMonth: TIER_TOKEN_BUNDLE[plan],
    monthly: planOffer(plan, "monthly", { firstPurchase }),
    annual: planOffer(plan, "annual", { firstPurchase }),
  }));
  const expiresAt = inst.subscription_expires_at;
  return { plans, firstPurchase, current: { tier: inst.subscription_tier, expiresAt, active: Boolean(expiresAt) && new Date(expiresAt).getTime() > Date.now() } };
}

export async function listOrders(institutionId, { limit = 20 } = {}) {
  const rows = await query(`${SELECT} WHERE o.institution_id = ? ORDER BY o.id DESC LIMIT ?`, [institutionId, limit]);
  return rows.map(toOrder);
}

/** Make a bill for a plan and period. The shop has one open bill at a time: a new choice replaces the old one. */
export async function createOrder({ institutionId, userId, plan, period }) {
  if (!PLANS[plan]) throw badRequest("Paket tidak dikenal.", { code: "UNKNOWN_PLAN" });
  const id = await transaction(async (tx) => {
    const inst = await tx.queryOne("SELECT id FROM institutions WHERE id = ? FOR UPDATE", [institutionId]);
    if (!inst) throw notFound("Toko tidak ditemukan.");
    const offer = planOffer(plan, period, { firstPurchase: await isFirstPurchase(tx, institutionId) });
    if (!offer) throw badRequest("Periode tidak dikenal.", { code: "UNKNOWN_PERIOD" });
    await tx.query("UPDATE platform_orders SET status = 'cancelled', cancelled_at = UTC_TIMESTAMP(), cancelled_by = ? WHERE institution_id = ? AND status = 'pending'", [userId, institutionId]);
    const result = await tx.query(
      `INSERT INTO platform_orders (institution_id, requested_by, plan, period, months, list_price_idr, discount_idr, base_amount_idr, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))`,
      [institutionId, userId, plan, period, offer.months, offer.listPriceIdr, offer.discountIdr, offer.priceIdr, ORDER_TTL_HOURS]
    );
    const reserved = await reservePayAmount(tx, { baseIdr: offer.priceIdr, refType: "order", refId: result.insertId });
    await tx.query("UPDATE platform_orders SET pay_amount_idr = ?, unique_code = ? WHERE id = ?", [reserved.amount, reserved.code, result.insertId]);
    return result.insertId;
  });
  const order = toOrder(await load(id));
  tell(institutionId, order);
  return order;
}

/** What a shop needs to pay one order: the exact amount, and the dynamic QRIS for it when the team has set one up. */
export async function orderPayInfo({ id, institutionId }) {
  const order = toOrder(await load(id, institutionId));
  const open = order.status === "pending" && order.payAmountIdr > 0;
  return { order, qris: open ? await dynamicQrisFor(order.payAmountIdr) : null };
}

/** The shop says it has paid, so the team can find the payment. Only for an open order. */
export async function claimOrderPayment({ id, institutionId, reference = null }) {
  const result = await query("UPDATE platform_orders SET payment_claimed_at = UTC_TIMESTAMP(), payment_reference = ? WHERE id = ? AND institution_id = ? AND status = 'pending' AND expires_at > UTC_TIMESTAMP()", [reference, id, institutionId]);
  if (!result.affectedRows) {
    await load(id, institutionId);
    throw conflict("Pesanan ini sudah dibayar, dibatalkan, atau kedaluwarsa.", { code: "ORDER_CLOSED" });
  }
  const order = toOrder(await load(id));
  tell(institutionId, order);
  return order;
}

export async function cancelOrder({ id, institutionId = null, userId }) {
  const row = await load(id, institutionId);
  const result = await query("UPDATE platform_orders SET status = 'cancelled', cancelled_at = UTC_TIMESTAMP(), cancelled_by = ? WHERE id = ? AND status = 'pending'", [userId, id]);
  if (!result.affectedRows) throw conflict("Pesanan ini sudah dibayar atau dibatalkan.", { code: "ORDER_CLOSED" });
  const order = toOrder(await load(id));
  tell(row.institution_id, order);
  return order;
}

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
};

/**
 * Apply a paid order to the shop, inside the caller's transaction: plan, end date, features and tokens. Refused when the
 * order is not open. `via` "auto" (a payment notice matched its amount) also refuses an order that has expired; the team
 * can still confirm an expired order by hand, because the money did arrive.
 */
export async function settleOrderInTx(tx, id, { userId = null, via = "manual" } = {}) {
  const order = await tx.queryOne("SELECT * FROM platform_orders WHERE id = ? FOR UPDATE", [id]);
  if (!order) throw notFound("Pesanan paket tidak ditemukan.");
  if (order.status === "paid") throw conflict("Pesanan ini sudah dibayar dan paketnya sudah aktif.", { code: "ORDER_ALREADY_PAID" });
  if (order.status !== "pending") throw conflict("Pesanan ini sudah dibatalkan.", { code: "ORDER_CLOSED" });
  if (via === "auto" && new Date(order.expires_at).getTime() <= Date.now()) throw conflict("Pesanan ini sudah kedaluwarsa.", { code: "ORDER_EXPIRED" });

  const shop = await tx.queryOne("SELECT subscription_tier, subscription_expires_at FROM institutions WHERE id = ? FOR UPDATE", [order.institution_id]);
  const now = new Date();
  const current = shop.subscription_expires_at ? new Date(shop.subscription_expires_at) : null;
  const renewing = shop.subscription_tier === order.plan && current && current > now;
  const until = addMonths(renewing ? current : now, order.months);
  const tokens = TIER_TOKEN_BUNDLE[order.plan] * order.months;

  await tx.query(
    `UPDATE institutions SET subscription_tier = ?, subscription_expires_at = ?, ai_token_quota = ai_token_quota + ?,
            features_json = JSON_MERGE_PATCH(COALESCE(features_json, JSON_OBJECT()), ?) WHERE id = ?`,
    [order.plan, until, tokens, JSON.stringify(featureMapFor(order.plan)), order.institution_id]
  );
  await tx.query("UPDATE platform_orders SET status = 'paid', paid_at = UTC_TIMESTAMP(), paid_via = ?, paid_by = ?, activated_until = ?, tokens_granted = ? WHERE id = ?", [via, userId, until, tokens, id]);
  return { ...order, activatedUntil: until, tokensGranted: tokens };
}

/** The team confirms a payment by hand: the plan, features and tokens are applied now. */
export async function confirmOrder({ id, userId }) {
  const settled = await transaction((tx) => settleOrderInTx(tx, id, { userId, via: "manual" }));
  const order = toOrder(await load(id));
  tell(settled.institution_id, order);
  return order;
}

export const announceOrder = async (id) => {
  const order = toOrder(await load(id));
  tell(order.institutionId, order);
};

export async function listAllOrders({ status = null, limit = 50, offset = 0 } = {}) {
  // "expired" is not stored: it is an open order past its time
  const where = status === "expired" ? "WHERE o.status = 'pending' AND o.expires_at <= UTC_TIMESTAMP()" : status === "pending" ? "WHERE o.status = 'pending' AND o.expires_at > UTC_TIMESTAMP()" : status ? "WHERE o.status = ?" : "";
  const params = status && !["expired", "pending"].includes(status) ? [status] : [];
  const [rows, total, open] = await Promise.all([
    query(`${SELECT} ${where} ORDER BY (o.payment_claimed_at IS NULL), o.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
    queryOne(`SELECT COUNT(*) AS n FROM platform_orders o ${where}`, params),
    queryOne("SELECT COUNT(*) AS n FROM platform_orders WHERE status = 'pending' AND expires_at > UTC_TIMESTAMP()"),
  ]);
  return { orders: rows.map(toOrder), total: Number(total.n), open: Number(open.n) };
}

/** One order as the team sees it. */
export async function getOrderForTeam(id) {
  const row = await load(id);
  return { order: toOrder(row), shopId: row.institution_id };
}
