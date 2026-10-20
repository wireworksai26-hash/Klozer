import { query, queryOne } from "../config/db.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";

/**
 * Discount codes the Klozer team gives to its clients. A code is applied to a token top up bill: the bill keeps the list
 * price, the discount and the code. A code can be limited to one client, to a minimum amount, to a number of uses in
 * all and per client, and to a period. A use is a bill that is not cancelled, so cancelling a bill gives the use back.
 */

/** A bill is never discounted below this, so a bill always has something to pay and confirm. */
export const MIN_CHARGE_IDR = 1_000;

const toVoucher = (r) => {
  const now = Date.now();
  const uses = Number(r.uses_count ?? 0);
  const maxUses = r.max_uses === null ? null : Number(r.max_uses);
  let state = "active";
  if (!r.is_active) state = "off";
  else if (r.valid_until && new Date(r.valid_until).getTime() < now) state = "expired";
  else if (r.valid_from && new Date(r.valid_from).getTime() > now) state = "scheduled";
  else if (maxUses !== null && uses >= maxUses) state = "used_up";
  return {
    id: r.id,
    code: r.code,
    description: r.description,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    maxDiscountIdr: r.max_discount_idr === null ? null : Number(r.max_discount_idr),
    minTokens: r.min_tokens === null ? null : Number(r.min_tokens),
    institutionId: r.institution_id,
    institutionName: r.institution_name ?? null,
    maxUses,
    perShopLimit: Number(r.per_shop_limit),
    validFrom: r.valid_from,
    validUntil: r.valid_until,
    isActive: Boolean(r.is_active),
    usesCount: uses,
    state,
    createdAt: r.created_at,
  };
};

const SELECT = `SELECT v.*, i.name AS institution_name,
    (SELECT COUNT(*) FROM token_topups t WHERE t.voucher_id = v.id AND t.status <> 'cancelled') AS uses_count
  FROM platform_vouchers v LEFT JOIN institutions i ON i.id = v.institution_id`;

export const normalizeCode = (code) => String(code ?? "").trim().toUpperCase();

async function load(id) {
  const row = await queryOne(`${SELECT} WHERE v.id = ?`, [id]);
  if (!row) throw notFound("Voucher tidak ditemukan.");
  return row;
}

export async function listVouchers({ limit = 100, offset = 0 } = {}) {
  const [rows, total] = await Promise.all([query(`${SELECT} ORDER BY v.id DESC LIMIT ? OFFSET ?`, [limit, offset]), queryOne("SELECT COUNT(*) AS n FROM platform_vouchers")]);
  return { vouchers: rows.map(toVoucher), total: Number(total.n) };
}

/** The shape of the discount must make sense for its type (a percent between 0 and 100 with an optional cap, or a fixed amount). */
function checkShape(v) {
  if (v.discountType === "percent") {
    if (!(v.discountValue > 0 && v.discountValue <= 100)) throw badRequest("Potongan persen harus di antara 0 dan 100.", { code: "INVALID_VOUCHER" });
  } else {
    if (!(v.discountValue >= MIN_CHARGE_IDR)) throw badRequest(`Potongan tetap minimal Rp ${MIN_CHARGE_IDR.toLocaleString("id-ID")}.`, { code: "INVALID_VOUCHER" });
    if (v.maxDiscountIdr !== null && v.maxDiscountIdr !== undefined) throw badRequest("Batas potongan hanya untuk voucher persen.", { code: "INVALID_VOUCHER" });
  }
  if (v.validFrom && v.validUntil && new Date(v.validUntil) <= new Date(v.validFrom)) throw badRequest("Tanggal berakhir harus setelah tanggal mulai.", { code: "INVALID_VOUCHER" });
}

async function assertShop(institutionId) {
  if (institutionId === null || institutionId === undefined) return;
  if (!(await queryOne("SELECT id FROM institutions WHERE id = ?", [institutionId]))) throw badRequest("Toko tidak ditemukan.", { code: "SHOP_NOT_FOUND" });
}

const dateOrNull = (v) => (v ? new Date(v) : null);

export async function createVoucher({ code, description = null, discountType, discountValue, maxDiscountIdr = null, minTokens = null, institutionId = null, maxUses = null, perShopLimit = 1, validFrom = null, validUntil = null, isActive = true, userId = null }) {
  const clean = normalizeCode(code);
  checkShape({ discountType, discountValue, maxDiscountIdr, validFrom, validUntil });
  await assertShop(institutionId);
  if (await queryOne("SELECT id FROM platform_vouchers WHERE code = ?", [clean])) throw conflict("Kode voucher ini sudah dipakai. Pilih kode lain.", { code: "VOUCHER_CODE_TAKEN" });
  const result = await query(
    `INSERT INTO platform_vouchers (code, description, discount_type, discount_value, max_discount_idr, min_tokens, institution_id, max_uses, per_shop_limit, valid_from, valid_until, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clean, description, discountType, discountValue, maxDiscountIdr, minTokens, institutionId, maxUses, perShopLimit, dateOrNull(validFrom), dateOrNull(validUntil), isActive ? 1 : 0, userId]
  );
  return toVoucher(await load(result.insertId));
}

const COLUMNS = { description: "description", discountType: "discount_type", discountValue: "discount_value", maxDiscountIdr: "max_discount_idr", minTokens: "min_tokens", institutionId: "institution_id", maxUses: "max_uses", perShopLimit: "per_shop_limit", validFrom: "valid_from", validUntil: "valid_until" };

/** Change a voucher. The code stays as it is (bills already point at it). Bills made before keep the discount they were given. */
export async function updateVoucher(id, patch) {
  const current = toVoucher(await load(id));
  const next = { ...current, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
  checkShape(next);
  if (patch.institutionId !== undefined) await assertShop(patch.institutionId);
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (patch[key] === undefined) continue;
    sets.push(`${column} = ?`);
    params.push(key === "validFrom" || key === "validUntil" ? dateOrNull(patch[key]) : patch[key]);
  }
  if (patch.isActive !== undefined) {
    sets.push("is_active = ?");
    params.push(patch.isActive ? 1 : 0);
  }
  if (sets.length) await query(`UPDATE platform_vouchers SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  return toVoucher(await load(id));
}

/** Only a voucher nobody has used can be deleted; one that has been used is switched off instead, so the bills keep their record. */
export async function deleteVoucher(id) {
  await load(id);
  if (await queryOne("SELECT id FROM token_topups WHERE voucher_id = ? LIMIT 1", [id])) throw conflict("Voucher ini sudah pernah dipakai. Nonaktifkan saja.", { code: "VOUCHER_IN_USE" });
  await query("DELETE FROM platform_vouchers WHERE id = ?", [id]);
}

const NOT_VALID = "Kode voucher tidak berlaku.";

/**
 * What a code does to a list price for one shop, or why it cannot be used. `db` is a transaction handle when the use is
 * about to be recorded (the voucher row is then locked, so two bills at once cannot both take the last use).
 * A code that belongs to someone else or does not exist gets the same answer, so codes cannot be probed.
 */
export async function evaluateVoucher(db, { code, institutionId, tokens, listPriceIdr, lock = false }) {
  const clean = normalizeCode(code);
  if (!clean) throw badRequest(NOT_VALID, { code: "VOUCHER_INVALID" });
  const row = await db.queryOne(`SELECT * FROM platform_vouchers WHERE code = ? ${lock ? "FOR UPDATE" : ""}`, [clean]);
  if (!row || (row.institution_id !== null && row.institution_id !== institutionId)) throw badRequest(NOT_VALID, { code: "VOUCHER_INVALID" });
  const now = Date.now();
  if (!row.is_active) throw badRequest(NOT_VALID, { code: "VOUCHER_INVALID" });
  if (row.valid_from && new Date(row.valid_from).getTime() > now) throw badRequest("Voucher ini belum bisa dipakai.", { code: "VOUCHER_NOT_STARTED" });
  if (row.valid_until && new Date(row.valid_until).getTime() < now) throw badRequest("Voucher ini sudah kedaluwarsa.", { code: "VOUCHER_EXPIRED" });
  if (row.min_tokens !== null && tokens < Number(row.min_tokens)) throw badRequest(`Voucher ini berlaku untuk top up minimal ${Number(row.min_tokens).toLocaleString("id-ID")} token.`, { code: "VOUCHER_MIN_TOKENS" });
  // when the use is about to be recorded the count is a locking read, so it sees bills committed after this transaction began
  const used = await db.queryOne(`SELECT COUNT(*) AS total, SUM(institution_id = ?) AS mine FROM token_topups WHERE voucher_id = ? AND status <> 'cancelled' ${lock ? "FOR UPDATE" : ""}`, [institutionId, row.id]);
  if (row.max_uses !== null && Number(used.total) >= Number(row.max_uses)) throw conflict("Voucher ini sudah habis dipakai.", { code: "VOUCHER_USED_UP" });
  if (Number(used.mine ?? 0) >= Number(row.per_shop_limit)) throw conflict("Toko Anda sudah memakai voucher ini.", { code: "VOUCHER_ALREADY_USED" });

  const value = Number(row.discount_value);
  let discount = row.discount_type === "percent" ? Math.floor((listPriceIdr * value) / 100) : value;
  if (row.discount_type === "percent" && row.max_discount_idr !== null) discount = Math.min(discount, Number(row.max_discount_idr));
  discount = Math.min(discount, Math.max(0, listPriceIdr - MIN_CHARGE_IDR));
  if (discount <= 0) throw badRequest("Voucher ini tidak memberi potongan untuk jumlah tersebut.", { code: "VOUCHER_NO_DISCOUNT" });
  return { voucherId: row.id, code: row.code, discountIdr: discount, finalPriceIdr: listPriceIdr - discount, description: row.description };
}
