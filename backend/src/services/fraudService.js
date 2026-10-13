import { query, queryOne } from "../config/db.js";
import { notFound } from "../utils/errors.js";

/**
 * Register a payment-proof image against an order for review.
 *
 * No OCR/forensics engine is integrated, so this never claims a receipt is
 * genuine. It stores the proof, compares nothing it cannot read, and returns
 * MANUAL_REVIEW_REQUIRED so a human confirms the transfer against the bank
 * statement. Plug an OCR provider in here and set the extracted_* columns.
 */
export async function verifyReceiptImage({ institutionId, orderId, imageUrl, expectedAmount }) {
  const order = await queryOne("SELECT id, total_amount FROM orders WHERE id = ? AND institution_id = ?", [orderId, institutionId]);
  if (!order) throw notFound("Pesanan tidak ditemukan.");

  const result = await query(
    `INSERT INTO payment_proofs (order_id, image_url, is_suspicious, confidence_score, fraud_reasons_json)
     VALUES (?, ?, 0, 0, ?)`,
    [order.id, imageUrl, JSON.stringify(["ocr_not_available"])]
  );

  return {
    success: true,
    proofId: result.insertId,
    ocrAvailable: false,
    verificationStatus: "MANUAL_REVIEW_REQUIRED",
    expectedAmount: expectedAmount ?? Number(order.total_amount),
    message: "Bukti tersimpan. Cocokkan nominal dengan mutasi rekening sebelum mengonfirmasi pembayaran.",
  };
}

/**
 * Match an incoming credit against an unreconciled bank mutation of the same
 * amount. The row is claimed with a conditional UPDATE so two requests cannot
 * reconcile the same mutation.
 */
export async function autoMatchBankMutation({ institutionId, amount }) {
  const candidates = await query(
    `SELECT id FROM bank_mutations
      WHERE institution_id = ? AND type = 'CR' AND is_reconciled = 0 AND ABS(amount - ?) < 1
      ORDER BY transaction_date ASC LIMIT 5`,
    [institutionId, amount]
  );

  for (const candidate of candidates) {
    const claimed = await query("UPDATE bank_mutations SET is_reconciled = 1 WHERE id = ? AND is_reconciled = 0", [candidate.id]);
    if (claimed.affectedRows === 1) {
      return { success: true, matched: true, mutationId: candidate.id, reconciledAt: new Date().toISOString() };
    }
  }

  return { success: true, matched: false, message: "Mutasi dengan nominal ini belum tercatat di sistem." };
}
