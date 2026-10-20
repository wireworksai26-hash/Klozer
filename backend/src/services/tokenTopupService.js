import { query, queryOne, transaction } from "../config/db.js";
import { emitToTenant } from "../realtime.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { getTokenBalance } from "./tokenService.js";

/**
 * Top up of AI tokens. The shop asks for an amount, the Klozer team quotes a price and says how to pay, and once the
 * payment is confirmed the team credits the tokens. Crediting adds to the quota inside one transaction and only from
 * the "quoted" state, so a request can never be credited twice.
 */

export const TOPUP_STEP = 100_000;
export const TOPUP_MIN = 100_000;
export const TOPUP_MAX = 100_000_000;
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
  requestedBy: r.requested_by,
  requestedByName: r.requested_by_name ?? undefined,
  quotedAt: r.quoted_at,
  creditedAt: r.credited_at,
  cancelledAt: r.cancelled_at,
  createdAt: r.created_at,
});

const SELECT = `SELECT t.*, i.name AS institution_name, u.name AS requested_by_name
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
  return { topups: rows.map(toTopup), balance: await getTokenBalance(institutionId) };
}

export async function createTopup({ institutionId, userId, tokens, note = null }) {
  if (!Number.isInteger(tokens) || tokens < TOPUP_MIN || tokens > TOPUP_MAX || tokens % TOPUP_STEP !== 0) {
    throw badRequest(`Jumlah token harus kelipatan ${TOPUP_STEP.toLocaleString("id-ID")}, antara ${TOPUP_MIN.toLocaleString("id-ID")} dan ${TOPUP_MAX.toLocaleString("id-ID")}.`, { code: "INVALID_TOKEN_AMOUNT" });
  }
  const id = await transaction(async (tx) => {
    // the shop's row is locked so two requests at once cannot both slip under the limit
    await tx.queryOne("SELECT id FROM institutions WHERE id = ? FOR UPDATE", [institutionId]);
    const open = await tx.queryOne("SELECT COUNT(*) AS n FROM token_topups WHERE institution_id = ? AND status IN (?)", [institutionId, OPEN]);
    if (Number(open.n) >= MAX_OPEN_PER_SHOP) throw conflict(`Maksimal ${MAX_OPEN_PER_SHOP} permintaan top up yang belum selesai. Batalkan atau tunggu yang berjalan.`, { code: "TOPUP_OPEN_LIMIT" });
    const result = await tx.query("INSERT INTO token_topups (institution_id, requested_by, tokens, note) VALUES (?, ?, ?, ?)", [institutionId, userId, tokens, note]);
    return result.insertId;
  });
  const topup = toTopup(await load(id));
  tell(institutionId, topup);
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
    query(`${SELECT} ${where} ORDER BY FIELD(t.status, 'requested', 'quoted', 'credited', 'cancelled'), t.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
    queryOne(`SELECT COUNT(*) AS n FROM token_topups t ${where}`, params),
  ]);
  const open = await queryOne("SELECT COUNT(*) AS n FROM token_topups WHERE status IN (?)", [OPEN]);
  return { topups: rows.map(toTopup), total: Number(total.n), open: Number(open.n) };
}

/** Set (or change) the price and how to pay, while the request is still open. */
export async function quoteTopup({ id, amountIdr, note = null, userId }) {
  const row = await load(id);
  const result = await query(
    "UPDATE token_topups SET status = 'quoted', quoted_amount_idr = ?, quote_note = ?, quoted_by = ?, quoted_at = UTC_TIMESTAMP() WHERE id = ? AND status IN (?)",
    [amountIdr, note, userId, id, OPEN]
  );
  if (!result.affectedRows) throw conflict("Permintaan ini sudah selesai atau dibatalkan.", { code: "TOPUP_CLOSED" });
  const topup = toTopup(await load(id));
  tell(row.institution_id, topup);
  return topup;
}

/** The payment is confirmed: add the tokens to the shop's quota. Happens once; a second call is refused. */
export async function creditTopup({ id, userId }) {
  const outcome = await transaction(async (tx) => {
    const row = await tx.queryOne("SELECT * FROM token_topups WHERE id = ? FOR UPDATE", [id]);
    if (!row) throw notFound("Permintaan top up tidak ditemukan.");
    if (row.status === "credited") throw conflict("Token untuk permintaan ini sudah ditambahkan.", { code: "TOPUP_ALREADY_CREDITED" });
    if (row.status !== "quoted") throw conflict("Beri harga dulu sebelum menambahkan token.", { code: "TOPUP_NOT_QUOTED" });
    await tx.query("UPDATE institutions SET ai_token_quota = ai_token_quota + ? WHERE id = ?", [row.tokens, row.institution_id]);
    await tx.query("UPDATE token_topups SET status = 'credited', credited_by = ?, credited_at = UTC_TIMESTAMP() WHERE id = ?", [userId, id]);
    return row;
  });
  const topup = toTopup(await load(id));
  tell(outcome.institution_id, topup);
  return { topup, balance: await getTokenBalance(outcome.institution_id) };
}
