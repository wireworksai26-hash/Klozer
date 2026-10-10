import { query, queryOne } from "../config/db.js";
import { notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";

const COLUMNS = "id, bank_code, account_number, account_holder, branch_office, transfer_instruction, is_manual_transfer, is_active";

/** GET /bank-accounts: the transfer accounts the AI may quote to customers. */
export async function listBankAccounts(req, res) {
  const items = await query(`SELECT ${COLUMNS} FROM bank_accounts WHERE institution_id = ? ORDER BY id ASC`, [req.tenantId]);
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
  const row = await queryOne(`SELECT ${COLUMNS} FROM bank_accounts WHERE id = ?`, [result.insertId]);
  await audit(req, "bank_account.create", { entityType: "bank_account", entityId: row.id, metadata: { bank: b.bank_code } });
  res.status(201).json({ success: true, message: "Rekening ditambahkan.", data: row });
}

/** PUT /bank-accounts/:id */
export async function updateBankAccount(req, res) {
  const existing = await queryOne("SELECT id FROM bank_accounts WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!existing) throw notFound("Rekening tidak ditemukan.");

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

  const row = await queryOne(`SELECT ${COLUMNS} FROM bank_accounts WHERE id = ?`, [req.params.id]);
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
