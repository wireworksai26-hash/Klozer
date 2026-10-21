import { query, queryOne, transaction } from "../config/db.js";
import { emitToTenant } from "../realtime.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { TOPUP_PACKS, topupPrice } from "../utils/constants.js";
import { getTokenBalance } from "./tokenService.js";
import { evaluateVoucher } from "./platformVoucherService.js";
import { reservePayAmount } from "./billing/payAmounts.js";
import { dynamicQrisFor } from "./platformPaymentService.js";

/**
 * Top up of AI tokens. The shop picks an amount and gets the price from the price list at once (the team can still set a
 * different price). The shop pays with one of Klozer's payment methods and says it has paid; once the team confirms the
 * payment it credits the tokens. Crediting adds to the quota inside one transaction and only from the "quoted" state, so
 * a request can never be credited twice.
 */

export const TOPUP_STEP = 100_000;
export const TOPUP_MIN = 100_000;
export const TOPUP_MAX = 100_000_000;
/** The team may grant in smaller steps than a shop can buy. */
export const GRANT_STEP = 1_000;
/** Requests a shop may have open (asked or quoted, not yet paid) at the same time. */
export const MAX_OPEN_PER_SHOP = 3;
const OPEN = ["requested", "quoted"];

const toTopup = (r) => ({
  id: r.id,
  institutionId: r.institution_id,
  institutionName: r.institution_name ?? undefined,
  tokens: Number(r.tokens),
  note: r.note,
  status: r.status,
  quotedAmountIdr: r.quoted_amount_idr === null ? null : Number(r.quoted_amount_idr),
  quoteNote: r.quote_note,
  voucherCode: r.voucher_code,
  listPriceIdr: r.list_price_idr === null ? null : Number(r.list_price_idr),
  discountIdr: Number(r.discount_idr ?? 0),
  isGrant: Boolean(r.is_grant),
  payAmountIdr: r.pay_amount_idr === null || r.pay_amount_idr === undefined ? null : Number(r.pay_amount_idr),
  uniqueCode: Number(r.unique_code ?? 0),
  paidVia: r.paid_via ?? null,
  proofCount: Number(r.proof_count ?? 0),
  creditedBy: r.credited_by ?? null,
  requestedBy: r.requested_by,
  requestedByName: r.requested_by_name ?? undefined,
  quotedAt: r.quoted_at,
  quotedBySystem: r.status !== "requested" && r.quoted_by === null,
  paymentClaimedAt: r.payment_claimed_at,
  paymentReference: r.payment_reference,
  creditedAt: r.credited_at,
  cancelledAt: r.cancelled_at,
  createdAt: r.created_at,
});

const SELECT = `SELECT t.*, i.name AS institution_name, u.name AS requested_by_name,
  (SELECT COUNT(*) FROM platform_payment_proofs p WHERE p.ref_type = 'topup' AND p.ref_id = t.id) AS proof_count
  FROM token_topups t JOIN institutions i ON i.id = t.institution_id LEFT JOIN users u ON u.id = t.requested_by`;

async function load(id, institutionId = null) {
  const row = await queryOne(`${SELECT} WHERE t.id = ? ${institutionId ? "AND t.institution_id = ?" : ""}`, institutionId ? [id, institutionId] : [id]);
  if (!row) throw notFound("Permintaan top up tidak ditemukan.");
  return row;
}

const tell = (institutionId, topup) => emitToTenant(institutionId, "topup:updated", { id: topup.id, status: topup.status });

// ---------------------------------------------------------------- the shop's side
export async function listTopups(institutionId, { limit = 30 } = {}) {
  const rows = await query(`${SELECT} WHERE t.institution_id = ? ORDER BY t.id DESC LIMIT ?`, [institutionId, limit]);
  return { topups: rows.map(toTopup), balance: await getTokenBalance(institutionId), packs: TOPUP_PACKS };
}

/** The price of an amount from the price list, after checking it is an amount that can be bought. */
export function quotePrice(tokens) {
  if (!Number.isInteger(tokens) || tokens < TOPUP_MIN || tokens > TOPUP_MAX || tokens % TOPUP_STEP !== 0) {
    throw badRequest(`Jumlah token harus kelipatan ${TOPUP_STEP.toLocaleString("id-ID")}, antara ${TOPUP_MIN.toLocaleString("id-ID")} dan ${TOPUP_MAX.toLocaleString("id-ID")}.`, { code: "INVALID_TOKEN_AMOUNT" });
  }
  const priceIdr = topupPrice(tokens);
  return { tokens, priceIdr, perThousandIdr: Math.round((priceIdr / tokens) * 1000 * 100) / 100 };
}

/** The price of an amount for one shop with an optional voucher code: the list price, the discount, and what is charged. */
export async function quoteWithVoucher({ institutionId, tokens, voucher = null }) {
  const quote = quotePrice(tokens);
  if (!voucher) return { ...quote, discountIdr: 0, chargeIdr: quote.priceIdr, voucher: null };
  const applied = await evaluateVoucher({ queryOne }, { code: voucher, institutionId, tokens, listPriceIdr: quote.priceIdr });
  return { ...quote, discountIdr: applied.discountIdr, chargeIdr: applied.finalPriceIdr, voucher: { code: applied.code, description: applied.description } };
}

export async function createTopup({ institutionId, userId, tokens, note = null, voucher = null }) {
  const quote = quotePrice(tokens);
  const id = await transaction(async (tx) => {
    // the shop's row is locked so two requests at once cannot both slip under the limit
    await tx.queryOne("SELECT id FROM institutions WHERE id = ? FOR UPDATE", [institutionId]);
    const open = await tx.queryOne("SELECT COUNT(*) AS n FROM token_topups WHERE institution_id = ? AND status IN (?)", [institutionId, OPEN]);
    if (Number(open.n) >= MAX_OPEN_PER_SHOP) throw conflict(`Maksimal ${MAX_OPEN_PER_SHOP} permintaan top up yang belum selesai. Batalkan atau tunggu yang berjalan.`, { code: "TOPUP_OPEN_LIMIT" });
    // priced from the list straight away: the shop sees what to pay without waiting for anyone
    let charge = quote.priceIdr;
    let discount = 0;
    let voucherId = null;
    let voucherCode = null;
    let quoteNote = "Harga mengikuti daftar harga top up.";
    if (voucher) {
      // the voucher row is locked while its use is counted and recorded, so the last use cannot be taken twice
      const applied = await evaluateVoucher(tx, { code: voucher, institutionId, tokens, listPriceIdr: quote.priceIdr, lock: true });
      charge = applied.finalPriceIdr;
      discount = applied.discountIdr;
      voucherId = applied.voucherId;
      voucherCode = applied.code;
      quoteNote = `Voucher ${applied.code}: potongan Rp ${discount.toLocaleString("id-ID")} dari harga Rp ${quote.priceIdr.toLocaleString("id-ID")}.`;
    }
    const result = await tx.query(
      "INSERT INTO token_topups (institution_id, requested_by, tokens, note, status, quoted_amount_idr, quote_note, voucher_id, voucher_code, list_price_idr, discount_idr, quoted_at) VALUES (?, ?, ?, ?, 'quoted', ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())",
      [institutionId, userId, tokens, note, charge, quoteNote, voucherId, voucherCode, quote.priceIdr, discount]
    );
    // the amount this bill waits for: the price plus a unique code, so the payment can be matched to it
    const reserved = await reservePayAmount(tx, { baseIdr: charge, refType: "topup", refId: result.insertId });
    await tx.query("UPDATE token_topups SET pay_amount_idr = ?, unique_code = ? WHERE id = ?", [reserved.amount, reserved.code, result.insertId]);
    return result.insertId;
  });
  const topup = toTopup(await load(id));
  tell(institutionId, topup);
  return topup;
}

/** The shop says it has paid (and how, for the team to match the payment). Only for a priced, unpaid request. */
export async function claimPayment({ id, institutionId, reference = null }) {
  const row = await load(id, institutionId);
  const result = await query("UPDATE token_topups SET payment_claimed_at = UTC_TIMESTAMP(), payment_reference = ? WHERE id = ? AND status = 'quoted'", [reference, id]);
  if (!result.affectedRows) throw conflict("Permintaan ini sudah selesai atau dibatalkan.", { code: "TOPUP_CLOSED" });
  const topup = toTopup(await load(id));
  tell(row.institution_id, topup);
  return topup;
}

/** The shop withdraws a request before it is paid. The team can cancel any request that is not credited. */
export async function cancelTopup({ id, institutionId = null, userId }) {
  const row = await load(id, institutionId);
  const result = await query("UPDATE token_topups SET status = 'cancelled', cancelled_by = ?, cancelled_at = UTC_TIMESTAMP() WHERE id = ? AND status IN (?)", [userId, id, OPEN]);
  if (!result.affectedRows) throw conflict("Permintaan ini sudah selesai atau dibatalkan.", { code: "TOPUP_CLOSED" });
  const topup = toTopup(await load(id));
  tell(row.institution_id, topup);
  return topup;
}

// ---------------------------------------------------------------- the team's side
export async function listAllTopups({ status = null, limit = 50, offset = 0 } = {}) {
  const where = status ? "WHERE t.status = ?" : "";
  const params = status ? [status] : [];
  const [rows, total] = await Promise.all([
    query(`${SELECT} ${where} ORDER BY FIELD(t.status, 'requested', 'quoted', 'credited', 'cancelled'), (t.payment_claimed_at IS NULL), t.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
    queryOne(`SELECT COUNT(*) AS n FROM token_topups t ${where}`, params),
  ]);
  const open = await queryOne("SELECT COUNT(*) AS n FROM token_topups WHERE status IN (?)", [OPEN]);
  return { topups: rows.map(toTopup), total: Number(total.n), open: Number(open.n) };
}

/** Set (or change) the price and how to pay, while the request is still open. The amount to pay gets a fresh unique code. */
export async function quoteTopup({ id, amountIdr, note = null, userId }) {
  const row = await load(id);
  await transaction(async (tx) => {
    const result = await tx.query(
      "UPDATE token_topups SET status = 'quoted', quoted_amount_idr = ?, quote_note = ?, quoted_by = ?, quoted_at = UTC_TIMESTAMP() WHERE id = ? AND status IN (?)",
      [amountIdr, note, userId, id, OPEN]
    );
    if (!result.affectedRows) throw conflict("Permintaan ini sudah selesai atau dibatalkan.", { code: "TOPUP_CLOSED" });
    const reserved = await reservePayAmount(tx, { baseIdr: amountIdr, refType: "topup", refId: id });
    await tx.query("UPDATE token_topups SET pay_amount_idr = ?, unique_code = ? WHERE id = ?", [reserved.amount, reserved.code, id]);
  });
  const topup = toTopup(await load(id));
  tell(row.institution_id, topup);
  return topup;
}

/**
 * Add a paid bill's tokens to the shop's quota, inside the caller's transaction. Happens once: a bill that is already
 * credited, or not open, is refused. `via` says how the payment was confirmed: by the team ("manual") or by a payment
 * notice that matched its amount ("auto").
 */
export async function settleTopupInTx(tx, id, { userId = null, via = "manual" } = {}) {
  const row = await tx.queryOne("SELECT * FROM token_topups WHERE id = ? FOR UPDATE", [id]);
  if (!row) throw notFound("Permintaan top up tidak ditemukan.");
  if (row.status === "credited") throw conflict("Token untuk permintaan ini sudah ditambahkan.", { code: "TOPUP_ALREADY_CREDITED" });
  if (row.status !== "quoted") throw conflict("Beri harga dulu sebelum menambahkan token.", { code: "TOPUP_NOT_QUOTED" });
  await tx.query("UPDATE institutions SET ai_token_quota = ai_token_quota + ? WHERE id = ?", [row.tokens, row.institution_id]);
  await tx.query("UPDATE token_topups SET status = 'credited', credited_by = ?, credited_at = UTC_TIMESTAMP(), paid_via = ? WHERE id = ?", [userId, via, id]);
  return row;
}

/** The payment is confirmed: add the tokens to the shop's quota. Happens once; a second call is refused. */
export async function creditTopup({ id, userId }) {
  const outcome = await transaction((tx) => settleTopupInTx(tx, id, { userId, via: "manual" }));
  const topup = toTopup(await load(id));
  tell(outcome.institution_id, topup);
  return { topup, balance: await getTokenBalance(outcome.institution_id) };
}

/** What a shop needs to pay one bill: the exact amount, and the dynamic QRIS for it when the team has set one up. */
export async function topupPayInfo({ id, institutionId }) {
  const row = await load(id, institutionId);
  const topup = toTopup(row);
  const amount = topup.payAmountIdr ?? (topup.quotedAmountIdr === null ? null : Math.round(topup.quotedAmountIdr));
  const open = topup.status === "quoted" && amount !== null && amount > 0;
  return { status: topup.status, paid: topup.status === "credited", amountIdr: amount, uniqueCode: topup.uniqueCode, proofCount: topup.proofCount, qris: open ? await dynamicQrisFor(amount) : null };
}

/** After a notice-matched payment: tell the shop's screens. */
export const announceTopup = async (id) => {
  const row = await load(id);
  tell(row.institution_id, toTopup(row));
};

/**
 * The team adds tokens to a client directly (a gift, a goodwill credit, or a correction), without a bill to pay. It is kept
 * as a credited top up marked as a grant, with the reason, so the client's history and the team's record both show it.
 */
export async function grantTokens({ institutionId, tokens, reason, userId }) {
  if (!Number.isInteger(tokens) || tokens < GRANT_STEP || tokens > TOPUP_MAX || tokens % GRANT_STEP !== 0) {
    throw badRequest(`Jumlah token harus kelipatan ${GRANT_STEP.toLocaleString("id-ID")}, antara ${GRANT_STEP.toLocaleString("id-ID")} dan ${TOPUP_MAX.toLocaleString("id-ID")}.`, { code: "INVALID_TOKEN_AMOUNT" });
  }
  const id = await transaction(async (tx) => {
    const shop = await tx.queryOne("SELECT id FROM institutions WHERE id = ? FOR UPDATE", [institutionId]);
    if (!shop) throw notFound("Toko tidak ditemukan.");
    await tx.query("UPDATE institutions SET ai_token_quota = ai_token_quota + ? WHERE id = ?", [tokens, institutionId]);
    const result = await tx.query(
      "INSERT INTO token_topups (institution_id, requested_by, tokens, note, status, quoted_amount_idr, quote_note, discount_idr, is_grant, quoted_by, quoted_at, credited_by, credited_at) VALUES (?, NULL, ?, ?, 'credited', 0, ?, 0, 1, ?, UTC_TIMESTAMP(), ?, UTC_TIMESTAMP())",
      [institutionId, tokens, reason, "Diberikan oleh tim Klozer.", userId, userId]
    );
    return result.insertId;
  });
  const topup = toTopup(await load(id));
  tell(institutionId, topup);
  return { topup, balance: await getTokenBalance(institutionId) };
}

/** One bill as the team sees it (the detail screen reads it, with the shop and the history around it). */
export async function getTopupForTeam(id) {
  const row = await load(id);
  return { topup: toTopup(row), shopId: row.institution_id };
}
