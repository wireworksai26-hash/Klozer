/**
 * The exact amount each open bill is waiting for. A bill's amount is its price plus a small number (kode unik), chosen so no
 * two open bills ever wait for the same amount; that is what lets a payment of "Rp 115.037" be matched to exactly one bill.
 * The table has the amount as its primary key, so two bills made at the same moment cannot take the same one.
 */

const CODES_FIRST = 99; // codes 1 to 99 cost the payer at most Rp 99 more
const CODES_LAST = 999; // only used when every code up to 99 is taken for that price

/** Rows whose bill is no longer open (paid, cancelled, expired or gone) free their amount. */
async function releaseClosed(tx) {
  await tx.query(
    `DELETE r FROM platform_pay_amounts r
       LEFT JOIN token_topups t ON r.ref_type = 'topup' AND t.id = r.ref_id
       LEFT JOIN platform_orders o ON r.ref_type = 'order' AND o.id = r.ref_id
      WHERE (r.ref_type = 'topup' AND (t.id IS NULL OR t.status <> 'quoted'))
         OR (r.ref_type = 'order' AND (o.id IS NULL OR o.status <> 'pending' OR o.expires_at <= UTC_TIMESTAMP()))`
  );
}

const shuffled = (from, to) => {
  const list = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

/**
 * Take an amount for a bill: the price plus a free code. Call inside the transaction that makes the bill.
 * @returns {Promise<{ amount: number, code: number }>}
 */
export async function reservePayAmount(tx, { baseIdr, refType, refId }) {
  const base = Math.max(1, Math.round(baseIdr));
  await releaseClosed(tx);
  await tx.query("DELETE FROM platform_pay_amounts WHERE ref_type = ? AND ref_id = ?", [refType, refId]);
  for (const code of [...shuffled(1, CODES_FIRST), ...shuffled(CODES_FIRST + 1, CODES_LAST)]) {
    const result = await tx.query("INSERT IGNORE INTO platform_pay_amounts (amount, ref_type, ref_id) VALUES (?, ?, ?)", [base + code, refType, refId]);
    if (result.affectedRows) return { amount: base + code, code };
  }
  throw new Error("Tidak ada kode unik yang tersisa untuk nominal ini.");
}

/** The open bill waiting for this exact amount, or null. */
export async function findBillByAmount(db, amountIdr) {
  return db.queryOne("SELECT ref_type, ref_id FROM platform_pay_amounts WHERE amount = ?", [amountIdr]);
}
