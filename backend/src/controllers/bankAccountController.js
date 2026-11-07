import { query, queryOne } from "../config/db.js";
import { badRequest, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";
import { getPublicQrisImage, getQrisImage, removeQrisImage, renderOrderQrisPng, setQrisImage, tenantQrisUrl } from "../services/tenantQrisService.js";

const COLUMNS = "id, bank_code, account_number, account_holder, branch_office, transfer_instruction, is_manual_transfer, is_active, qris_image IS NOT NULL AS has_qris, qris_payload IS NOT NULL AS qris_readable";

const toAccount = (row) => (row ? { ...row, has_qris: Boolean(row.has_qris), qris_readable: Boolean(row.qris_readable), qrisUrl: row.has_qris ? tenantQrisUrl(row.id) : null } : row);

const load = async (institutionId, id) => {
  const row = await queryOne(`SELECT ${COLUMNS} FROM bank_accounts WHERE id = ? AND institution_id = ?`, [id, institutionId]);
  if (!row) throw notFound("Rekening tidak ditemukan.");
  return row;
};

/** GET /bank-accounts: the transfer accounts and QRIS merchants the AI may quote to customers. */
export async function listBankAccounts(req, res) {
  const items = (await query(`SELECT ${COLUMNS} FROM bank_accounts WHERE institution_id = ? ORDER BY id ASC`, [req.tenantId])).map(toAccount);
  res.json({ success: true, items, data: items });
}

/** POST /bank-accounts */
export async function createBankAccount(req, res) {
  const b = req.body;
  const result = await query(
    `INSERT INTO bank_accounts (institution_id, bank_code, account_number, account_holder, branch_office, transfer_instruction, is_manual_transfer, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId, b.bank_code, b.account_number, b.account_holder, b.branch_office ?? null, b.transfer_instruction ?? null, b.is_manual_transfer ? 1 : 0, b.is_active ? 1 : 0]
  );
  const row = toAccount(await load(req.tenantId, result.insertId));
  await audit(req, "bank_account.create", { entityType: "bank_account", entityId: row.id, metadata: { bank: b.bank_code } });
  res.status(201).json({ success: true, message: "Rekening ditambahkan.", data: row });
}

/** PUT /bank-accounts/:id */
export async function updateBankAccount(req, res) {
  await load(req.tenantId, req.params.id);

  const sets = [];
  const values = [];
  for (const key of ["bank_code", "account_number", "account_holder", "branch_office", "transfer_instruction"]) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  for (const key of ["is_manual_transfer", "is_active"]) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(req.body[key] ? 1 : 0);
    }
  }
  if (sets.length) await query(`UPDATE bank_accounts SET ${sets.join(", ")} WHERE id = ? AND institution_id = ?`, [...values, req.params.id, req.tenantId]);

  const row = toAccount(await load(req.tenantId, req.params.id));
  await audit(req, "bank_account.update", { entityType: "bank_account", entityId: row.id, metadata: Object.keys(req.body) });
  res.json({ success: true, message: "Rekening diperbarui.", data: row });
}

/** DELETE /bank-accounts/:id */
export async function deleteBankAccount(req, res) {
  const result = await query("DELETE FROM bank_accounts WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!result.affectedRows) throw notFound("Rekening tidak ditemukan.");
  await audit(req, "bank_account.delete", { entityType: "bank_account", entityId: req.params.id });
  res.json({ success: true, message: "Rekening dihapus." });
}

/** PUT /bank-accounts/:id/qris: the merchant QR picture, sent as base64. */
export async function uploadQris(req, res) {
  const raw = String(req.body.fileBase64).replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) throw badRequest("Isi gambar tidak valid.", { code: "INVALID_BASE64" });
  const account = await setQrisImage({
    institutionId: req.tenantId,
    id: Number(req.params.id),
    buffer: Buffer.from(raw, "base64"),
    fileName: req.body.fileName,
  });
  const { qrisRead, ...data } = account;
  await audit(req, "bank_account.qris_upload", { entityType: "bank_account", entityId: data.id, metadata: { read: Boolean(qrisRead?.ok) } });
  res.json({ success: true, data, qrisRead });
}

/** DELETE /bank-accounts/:id/qris */
export async function deleteQris(req, res) {
  const account = await removeQrisImage({ institutionId: req.tenantId, id: Number(req.params.id) });
  await audit(req, "bank_account.qris_remove", { entityType: "bank_account", entityId: account.id });
  res.json({ success: true, message: "Gambar QRIS dihapus.", data: account });
}

/** GET /bank-accounts/:id/qris: the picture for the dashboard, active or not. */
export async function qrisImage(req, res) {
  const { buffer, mime } = await getQrisImage({ institutionId: req.tenantId, id: Number(req.params.id) });
  res.set({
    "Content-Type": mime,
    "Content-Length": buffer.length,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": 'inline; filename="qris"',
    "Cache-Control": "private, no-store",
  });
  res.end(buffer);
}

/** GET /public/bank-accounts/:id/qris: the picture itself, for customers and the dashboard preview. */
export async function publicQrisImage(req, res) {
  const { buffer, mime } = await getPublicQrisImage(Number(req.params.id));
  res.set({
    "Content-Type": mime,
    "Content-Length": buffer.length,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": 'inline; filename="qris"',
    "Cache-Control": "public, max-age=300",
  });
  res.end(buffer);
}

/** GET /public/orders/:id/qris.png?sig=: the dynamic QRIS of one order, as a picture for the customer. */
export async function publicOrderQris(req, res) {
  const png = await renderOrderQrisPng({ orderId: Number(req.params.id), sig: req.query.sig });
  res.set({
    "Content-Type": "image/png",
    "Content-Length": png.length,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": 'inline; filename="qris.png"',
    "Cache-Control": "no-store",
  });
  res.end(png);
}
