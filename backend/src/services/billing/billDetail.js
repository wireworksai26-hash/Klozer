import { query, queryOne } from "../../config/db.js";
import { notFound } from "../../utils/errors.js";
import { getTopupForTeam } from "../tokenTopupService.js";
import { getOrderForTeam } from "./subscriptionOrderService.js";
import { listProofs } from "./billProofs.js";

/**
 * Everything the team needs to check one payment: the bill, the shop, the proof pictures, the payment notices that matched
 * it, and the history of what happened and who did it, in order. Plus a few plain signals that point at what to look at
 * (a payment confirmed by hand with no notice behind it, the same picture used on another bill, a claim without a proof).
 */

const ENTITY = { topup: "token_topup", order: "platform_order" };

export async function billDetail(type, id) {
  const { bill, shopId } = type === "topup" ? await getTopupForTeam(id).then((r) => ({ bill: r.topup, shopId: r.shopId })) : await getOrderForTeam(id).then((r) => ({ bill: r.order, shopId: r.shopId }));

  const shop = await queryOne(
    `SELECT i.id, i.name, i.email, i.subscription_tier, i.subscription_expires_at, i.ai_token_quota, i.ai_tokens_used, i.is_active,
            (SELECT u.name FROM users u WHERE u.institution_id = i.id AND u.role = 'owner' ORDER BY u.id LIMIT 1) AS owner_name
       FROM institutions i WHERE i.id = ?`,
    [shopId]
  );
  if (!shop) throw notFound("Toko tidak ditemukan.");

  const proofs = await listProofs(type, id);
  // the same picture on any other bill of any shop
  const reused = new Map();
  for (const proof of proofs) {
    const others = await query(
      `SELECT p.ref_type, p.ref_id, i.name AS institution_name FROM platform_payment_proofs p JOIN institutions i ON i.id = p.institution_id
        WHERE p.sha256 = ? AND NOT (p.ref_type = ? AND p.ref_id = ?)`,
      [proof.sha256, type, id]
    );
    if (others.length) reused.set(proof.id, others.map((o) => ({ refType: o.ref_type, refId: o.ref_id, institutionName: o.institution_name })));
  }

  const notices = await query(
    `SELECT id, amount_idr, reference, source, payer, status, note, created_at FROM platform_payment_notifications WHERE matched_type = ? AND matched_id = ? ORDER BY id`,
    [type, id]
  );

  const audits = await query(
    `SELECT a.action, a.created_at, a.metadata_json, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.entity_type = ? AND a.entity_id = ? ORDER BY a.id`,
    [ENTITY[type], String(id)]
  );

  const confirmerId = type === "topup" ? bill.creditedBy : bill.paidBy;
  const confirmer = confirmerId ? (await queryOne("SELECT name FROM users WHERE id = ?", [confirmerId]))?.name ?? null : null;
  const settledAt = type === "topup" ? bill.creditedAt : bill.paidAt;
  const settled = type === "topup" ? bill.status === "credited" : bill.status === "paid";

  const timeline = [{ at: bill.createdAt, kind: "created", by: bill.requestedByName ?? null }];
  if (bill.paymentClaimedAt) timeline.push({ at: bill.paymentClaimedAt, kind: "claimed", reference: bill.paymentReference ?? null });
  for (const proof of proofs) timeline.push({ at: proof.createdAt, kind: "proof", proofId: proof.id, by: proof.uploadedByName });
  for (const n of notices) timeline.push({ at: n.created_at, kind: "notice", amountIdr: Number(n.amount_idr), source: n.source, payer: n.payer, reference: n.reference });
  if (settled) timeline.push({ at: settledAt, kind: "settled", via: bill.paidVia, by: confirmer });
  if (bill.status === "cancelled") timeline.push({ at: bill.cancelledAt ?? bill.createdAt, kind: "cancelled" });
  timeline.sort((a, b) => new Date(a.at) - new Date(b.at));

  const payAmount = bill.payAmountIdr ?? bill.quotedAmountIdr;
  const noticeAmountOk = notices.some((n) => Number(n.amount_idr) === Number(payAmount));
  const signals = {
    proofCount: proofs.length,
    noticeMatched: notices.length > 0,
    noticeAmountMatches: noticeAmountOk,
    claimedWithoutProof: Boolean(bill.paymentClaimedAt) && proofs.length === 0,
    confirmedByHandWithoutNotice: settled && bill.paidVia === "manual" && notices.length === 0,
    proofReusedElsewhere: reused.size > 0,
  };

  return {
    type,
    bill,
    shop: {
      id: shop.id,
      name: shop.name,
      email: shop.email,
      ownerName: shop.owner_name ?? null,
      tier: shop.subscription_tier,
      expiresAt: shop.subscription_expires_at,
      tokenQuota: Number(shop.ai_token_quota),
      tokensUsed: Number(shop.ai_tokens_used),
      isActive: Boolean(shop.is_active),
    },
    proofs: proofs.map((p) => {
      const out = { ...p, reusedOn: reused.get(p.id) ?? [] };
      delete out.sha256; // the picture's fingerprint stays on the server
      return out;
    }),
    notices: notices.map((n) => ({ id: n.id, amountIdr: Number(n.amount_idr), reference: n.reference, source: n.source, payer: n.payer, note: n.note, createdAt: n.created_at })),
    timeline,
    audit: audits.map((a) => ({ action: a.action, at: a.created_at, by: a.user_name ?? null })),
    signals,
  };
}

/**
 * The money in a period: what was received (paid package orders and credited top ups, not grants), how it was confirmed,
 * what is waiting, and the things worth a look.
 */
export async function paymentSummary(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const topups = await queryOne(
    `SELECT COUNT(*) AS n, COALESCE(SUM(COALESCE(pay_amount_idr, quoted_amount_idr)), 0) AS amount,
            SUM(paid_via = 'auto') AS auto_n, COALESCE(SUM(CASE WHEN paid_via = 'auto' THEN COALESCE(pay_amount_idr, quoted_amount_idr) END), 0) AS auto_amount
       FROM token_topups WHERE status = 'credited' AND is_grant = 0 AND credited_at >= ?`,
    [since]
  );
  const orders = await queryOne(
    `SELECT COUNT(*) AS n, COALESCE(SUM(pay_amount_idr), 0) AS amount,
            SUM(paid_via = 'auto') AS auto_n, COALESCE(SUM(CASE WHEN paid_via = 'auto' THEN pay_amount_idr END), 0) AS auto_amount
       FROM platform_orders WHERE status = 'paid' AND paid_at >= ?`,
    [since]
  );
  const waiting = await queryOne(
    `SELECT (SELECT COALESCE(SUM(COALESCE(pay_amount_idr, quoted_amount_idr)), 0) FROM token_topups WHERE status = 'quoted') +
            (SELECT COALESCE(SUM(pay_amount_idr), 0) FROM platform_orders WHERE status = 'pending' AND expires_at > UTC_TIMESTAMP()) AS amount,
            (SELECT COUNT(*) FROM token_topups WHERE status = 'quoted') + (SELECT COUNT(*) FROM platform_orders WHERE status = 'pending' AND expires_at > UTC_TIMESTAMP()) AS n`
  );
  const claimedNoProof = await queryOne(
    `SELECT (SELECT COUNT(*) FROM token_topups t WHERE t.status = 'quoted' AND t.payment_claimed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM platform_payment_proofs p WHERE p.ref_type = 'topup' AND p.ref_id = t.id)) +
            (SELECT COUNT(*) FROM platform_orders o WHERE o.status = 'pending' AND o.payment_claimed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM platform_payment_proofs p WHERE p.ref_type = 'order' AND p.ref_id = o.id)) AS n`
  );
  const manualNoNotice = await queryOne(
    `SELECT (SELECT COUNT(*) FROM token_topups t WHERE t.status = 'credited' AND t.is_grant = 0 AND t.paid_via = 'manual' AND t.credited_at >= ? AND NOT EXISTS (SELECT 1 FROM platform_payment_notifications n WHERE n.matched_type = 'topup' AND n.matched_id = t.id)) +
            (SELECT COUNT(*) FROM platform_orders o WHERE o.status = 'paid' AND o.paid_via = 'manual' AND o.paid_at >= ? AND NOT EXISTS (SELECT 1 FROM platform_payment_notifications n WHERE n.matched_type = 'order' AND n.matched_id = o.id)) AS n`,
    [since, since]
  );
  const unmatched = await queryOne("SELECT COUNT(*) AS n, COALESCE(SUM(amount_idr), 0) AS amount FROM platform_payment_notifications WHERE status = 'unmatched' AND created_at >= ?", [since]);
  const reusedProofs = await queryOne(
    `SELECT COUNT(DISTINCT p.sha256) AS n FROM platform_payment_proofs p
      WHERE p.created_at >= ? AND EXISTS (SELECT 1 FROM platform_payment_proofs q WHERE q.sha256 = p.sha256 AND q.id <> p.id)`,
    [since]
  );

  const n = (v) => Number(v ?? 0);
  return {
    days,
    receivedIdr: n(topups.amount) + n(orders.amount),
    received: {
      topups: { count: n(topups.n), amountIdr: n(topups.amount) },
      orders: { count: n(orders.n), amountIdr: n(orders.amount) },
      auto: { count: n(topups.auto_n) + n(orders.auto_n), amountIdr: n(topups.auto_amount) + n(orders.auto_amount) },
    },
    waiting: { count: n(waiting.n), amountIdr: n(waiting.amount) },
    attention: {
      claimedWithoutProof: n(claimedNoProof.n),
      confirmedByHandWithoutNotice: n(manualNoNotice.n),
      unmatchedNotices: { count: n(unmatched.n), amountIdr: n(unmatched.amount) },
      reusedProofs: n(reusedProofs.n),
    },
  };
}
