import { verifyReceiptImage, autoMatchBankMutation } from "../services/fraudService.js";

/**
 * Verify Receipt Image (OCR & ELA Forensics)
 * POST /api/v1/fraud/verify-receipt
 */
export async function verifyReceipt(req, res, next) {
  try {
    const { imageUrl, expectedAmount } = req.body;
    const result = await verifyReceiptImage({
      imageUrl,
      expectedAmount: Number(expectedAmount || 0),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Reconcile Bank Mutation
 * POST /api/v1/fraud/reconcile-mutation
 */
export async function reconcileMutation(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const { amount, reference } = req.body;
    const result = await autoMatchBankMutation({
      institutionId,
      amount: Number(amount || 0),
      reference,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
