/**
 * Record the CS commission for a paid order. Runs inside the caller's
 * transaction and is idempotent per order: a second call is a no-op.
 * Returns null when the order has no commissionable CS or the amount is zero.
 */
export async function recordCsCommission(tx, { institutionId, csUserId, orderId, orderTotal }) {
  if (!csUserId) return null;

  const already = await tx.queryOne("SELECT id FROM cs_commission_ledgers WHERE order_id = ? AND cs_user_id = ?", [orderId, csUserId]);
  if (already) return null;

  const cs = await tx.queryOne(
    "SELECT commission_rate_percent, commission_flat_idr FROM users WHERE id = ? AND institution_id = ?",
    [csUserId, institutionId]
  );
  if (!cs) return null;

  let amount = 0;
  let basis = "percentage";
  if (Number(cs.commission_rate_percent) > 0) {
    amount = Math.round((Number(orderTotal) * Number(cs.commission_rate_percent)) / 100);
  } else if (Number(cs.commission_flat_idr) > 0) {
    amount = Math.round(Number(cs.commission_flat_idr));
    basis = "flat_per_order";
  }
  if (amount <= 0) return null;

  const result = await tx.query(
    `INSERT INTO cs_commission_ledgers (institution_id, cs_user_id, order_id, commission_amount, calculation_basis)
     VALUES (?, ?, ?, ?, ?)`,
    [institutionId, csUserId, orderId, amount, basis]
  );
  return { id: result.insertId, amount, basis };
}
