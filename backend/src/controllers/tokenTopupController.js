import { audit } from "../services/auditService.js";
import { cancelTopup, claimPayment, createTopup, grantTokens, quoteWithVoucher, creditTopup, listAllTopups, listTopups, quoteTopup, TOPUP_MAX, TOPUP_MIN, TOPUP_STEP, MAX_OPEN_PER_SHOP } from "../services/tokenTopupService.js";

const idOf = (req) => Number(req.params.id);

/** GET /ai/topups: this shop's requests and its token balance. */
export async function list(req, res) {
  const data = await listTopups(req.tenantId);
  res.json({ success: true, data: data.topups, balance: data.balance, packs: data.packs, rules: { step: TOPUP_STEP, min: TOPUP_MIN, max: TOPUP_MAX, maxOpen: MAX_OPEN_PER_SHOP } });
}

/** GET /ai/topups/price?tokens=: what an amount costs, so the screen can show it before the shop asks. */
export async function price(req, res) {
  res.json({ success: true, data: await quoteWithVoucher({ institutionId: req.tenantId, tokens: req.query.tokens, voucher: req.query.voucher }) });
}

/** POST /ai/topups: ask for more tokens. The team answers with the price. */
export async function create(req, res) {
  const topup = await createTopup({ institutionId: req.tenantId, userId: req.user.id, ...req.body });
  await audit(req, "token_topup.request", { entityType: "token_topup", entityId: topup.id, metadata: { tokens: topup.tokens, voucher: topup.voucherCode ?? undefined, discountIdr: topup.discountIdr || undefined } });
  res.status(201).json({ success: true, message: "Permintaan top up dibuat. Bayar sesuai nominal, lalu konfirmasi.", data: topup });
}

/** POST /ai/topups/:id/paid: the shop says it has paid, so the team can find the payment. */
export async function paid(req, res) {
  const topup = await claimPayment({ id: idOf(req), institutionId: req.tenantId, reference: req.body.reference });
  await audit(req, "token_topup.paid_claim", { entityType: "token_topup", entityId: topup.id });
  res.json({ success: true, message: "Terima kasih. Tim Klozer akan mengecek pembayaran Anda.", data: topup });
}

/** POST /ai/topups/:id/cancel: the shop withdraws a request that is not paid yet. */
export async function cancel(req, res) {
  const topup = await cancelTopup({ id: idOf(req), institutionId: req.tenantId, userId: req.user.id });
  await audit(req, "token_topup.cancel", { entityType: "token_topup", entityId: topup.id });
  res.json({ success: true, data: topup });
}

/** GET /ai/topups/admin (superadmin): the queue across every shop. */
export async function adminList(req, res) {
  res.json({ success: true, ...(await listAllTopups(req.query)) });
}

/** PUT /ai/topups/:id/quote (superadmin) */
export async function adminQuote(req, res) {
  const topup = await quoteTopup({ id: idOf(req), userId: req.user.id, ...req.body });
  await audit(req, "token_topup.quote", { entityType: "token_topup", entityId: topup.id, institutionId: topup.institutionId, metadata: { amountIdr: topup.quotedAmountIdr } });
  res.json({ success: true, data: topup });
}

/** POST /ai/topups/:id/credit (superadmin): payment confirmed, add the tokens. */
export async function adminCredit(req, res) {
  const { topup, balance } = await creditTopup({ id: idOf(req), userId: req.user.id });
  await audit(req, "token_topup.credit", { entityType: "token_topup", entityId: topup.id, institutionId: topup.institutionId, metadata: { tokens: topup.tokens } });
  res.json({ success: true, message: "Token ditambahkan ke kuota toko.", data: topup, balance });
}

/** POST /ai/topups/:id/cancel-by-team (superadmin) */
export async function adminCancel(req, res) {
  const topup = await cancelTopup({ id: idOf(req), userId: req.user.id });
  await audit(req, "token_topup.cancel", { entityType: "token_topup", entityId: topup.id, institutionId: topup.institutionId });
  res.json({ success: true, data: topup });
}

/** POST /ai/topups/grant (superadmin): add tokens to a client directly, with the reason. */
export async function adminGrant(req, res) {
  const { topup, balance } = await grantTokens({ ...req.body, userId: req.user.id });
  await audit(req, "token_topup.grant", { entityType: "token_topup", entityId: topup.id, institutionId: topup.institutionId, metadata: { tokens: topup.tokens, reason: req.body.reason } });
  res.status(201).json({ success: true, message: "Token ditambahkan ke kuota toko.", data: topup, balance });
}
