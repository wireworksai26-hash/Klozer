import { query, queryOne, transaction } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { findBillByAmount } from "./payAmounts.js";
import { announceOrder, settleOrderInTx } from "./subscriptionOrderService.js";
import { announceTopup, settleTopupInTx } from "../tokenTopupService.js";

/**
 * A payment notice from outside: "Rp 115.037 received". It can come from a bank or e-wallet feed, a notification
 * forwarder, or a payment gateway callback. The amount is matched to the one open bill waiting for exactly that amount (a bill's
 * amount carries a unique code, see payAmounts.js); the bill is then settled the same way the team would do it by hand:
 * tokens added, or the plan, features and tokens applied. Every notice is kept, matched or not, so nothing is lost and the
 * team can settle an unmatched one by hand.
 */

const toNotification = (r) => ({
  id: r.id,
  amountIdr: Number(r.amount_idr),
  reference: r.reference,
  source: r.source,
  payer: r.payer,
  status: r.status,
  matchedType: r.matched_type,
  matchedId: r.matched_id,
  institutionId: r.institution_id,
  institutionName: r.institution_name ?? null,
  note: r.note,
  createdAt: r.created_at,
});

export async function listNotifications({ limit = 30 } = {}) {
  const rows = await query(
    `SELECT n.*, i.name AS institution_name FROM platform_payment_notifications n LEFT JOIN institutions i ON i.id = n.institution_id ORDER BY n.id DESC LIMIT ?`,
    [limit]
  );
  return rows.map(toNotification);
}

/**
 * @param {{ amountIdr: number, reference?: string|null, source?: string|null, payer?: string|null }} notice
 * @returns {Promise<{ status: "matched"|"unmatched"|"duplicate", matchedType?: string, matchedId?: number, note?: string }>}
 */
export async function receivePayment({ amountIdr, reference = null, source = null, payer = null }) {
  const saved = await query(
    "INSERT IGNORE INTO platform_payment_notifications (amount_idr, reference, source, payer, status, note) VALUES (?, ?, ?, ?, 'unmatched', 'Diterima, belum dicocokkan.')",
    [amountIdr, reference, source, payer]
  );
  // the same notice twice (a forwarder that retries): the first one already did its work
  if (!saved.affectedRows) return { status: "duplicate" };
  const noticeId = saved.insertId;

  let outcome = { status: "unmatched", note: "Tidak ada tagihan terbuka dengan nominal ini. Cek manual." };
  try {
    const bill = await findBillByAmount({ queryOne }, amountIdr);
    if (bill) {
      const result = await transaction(async (tx) => {
        const settled = bill.ref_type === "topup" ? await settleTopupInTx(tx, bill.ref_id, { via: "auto" }) : await settleOrderInTx(tx, bill.ref_id, { via: "auto" });
        return { institutionId: settled.institution_id };
      });
      outcome = { status: "matched", matchedType: bill.ref_type, matchedId: bill.ref_id, institutionId: result.institutionId, note: bill.ref_type === "topup" ? "Token top up ditambahkan otomatis." : "Paket diaktifkan otomatis." };
      if (bill.ref_type === "topup") await announceTopup(bill.ref_id);
      else await announceOrder(bill.ref_id);
    }
  } catch (err) {
    // a bill that cannot be settled (already paid, expired, cancelled) leaves the notice for the team to look at
    outcome = { status: "unmatched", note: String(err.message).slice(0, 280) };
    logger.warn({ err: err.message, amountIdr }, "Payment notice could not settle its bill");
  }

  await query("UPDATE platform_payment_notifications SET status = ?, matched_type = ?, matched_id = ?, institution_id = ?, note = ? WHERE id = ?", [
    outcome.status,
    outcome.matchedType ?? null,
    outcome.matchedId ?? null,
    outcome.institutionId ?? null,
    outcome.note,
    noticeId,
  ]);
  return { id: noticeId, ...outcome };
}
