import { verifyReceiptImage, autoMatchBankMutation } from "../services/fraudService.js";

/** POST /fraud/verify-receipt */
export async function verifyReceipt(req, res) {
  const { order_id, imageUrl, expectedAmount } = req.body;
  res.json(await verifyReceiptImage({ institutionId: req.tenantId, orderId: order_id, imageUrl, expectedAmount }));
}

/** POST /fraud/reconcile-mutation */
export async function reconcileMutation(req, res) {
  res.json(await autoMatchBankMutation({ institutionId: req.tenantId, amount: req.body.amount }));
}
