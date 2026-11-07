import { query, queryOne } from "../config/db.js";
import { emitEvent } from "../services/integrations/eventBus.js";
import { contactPayload } from "../services/integrations/eventPayloads.js";
import { buildPagination, escapeLike, normalizePhone, parsePagination } from "../utils/helpers.js";
import { badRequest, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";
import { importLeads } from "../services/leads/leadImportService.js";

async function assertCsInTenant(csId, tenantId) {
  if (csId === undefined || csId === null) return;
  const cs = await queryOne("SELECT id FROM users WHERE id = ? AND institution_id = ? AND is_active = 1", [csId, tenantId]);
  if (!cs) throw badRequest("assigned_cs_id tidak valid untuk instansi ini.");
}

/** GET /leads */
export async function getLeads(req, res) {
  const paging = parsePagination(req.query);
  const where = ["l.institution_id = ?"];
  const params = [req.tenantId];

  if (req.query.search) {
    const like = `%${escapeLike(req.query.search)}%`;
    where.push("(l.name LIKE ? OR l.phone_number LIKE ? OR l.interest LIKE ?)");
    params.push(like, like, like);
  }
  if (req.query.status) {
    where.push("l.status = ?");
    params.push(req.query.status);
  }
  if (req.query.cs_id) {
    where.push("l.assigned_cs_id = ?");
    params.push(req.query.cs_id);
  }
  const clause = `WHERE ${where.join(" AND ")}`;

  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM leads l ${clause}`, params);
  const items = await query(`SELECT l.*, u.name AS cs_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_cs_id ${clause} ORDER BY COALESCE(l.last_contacted_at, l.created_at) DESC LIMIT ? OFFSET ?`, [
    ...params,
    paging.limit,
    paging.offset,
  ]);

  res.json({ success: true, items, pagination: buildPagination(paging, Number(total)), data: items, leads: items });
}

/** POST /leads — returns the existing lead if the phone number is already known. */
export async function createLead(req, res) {
  const b = req.body;
  const phone = normalizePhone(b.phone_number);
  if (phone.length < 8) throw badRequest("Nomor telepon tidak valid.");
  await assertCsInTenant(b.assigned_cs_id, req.tenantId);

  const existing = await queryOne("SELECT * FROM leads WHERE institution_id = ? AND phone_number = ?", [req.tenantId, phone]);
  if (existing) return res.status(200).json({ success: true, message: "Kontak sudah ada.", data: existing });

  const result = await query(
    `INSERT INTO leads (institution_id, phone_number, external_id, name, gender, address_full, city, assigned_cs_id, status, source,
                        interest, est_value, notes, risk_cod_score, last_contacted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      req.tenantId,
      phone,
      phone,
      b.name ?? "Pelanggan Baru",
      b.gender ?? null,
      b.address_full ?? null,
      b.city ?? null,
      b.assigned_cs_id ?? null,
      b.status,
      b.source ?? "manual",
      b.interest ?? null,
      b.est_value ?? 0,
      b.notes ?? null,
      b.risk_cod_score ?? 100,
    ]
  );
  const lead = await queryOne("SELECT * FROM leads WHERE id = ?", [result.insertId]);
  emitEvent({ institutionId: req.tenantId, type: "contact.created", data: () => contactPayload(lead) });
  res.status(201).json({ success: true, message: "Kontak berhasil ditambahkan.", data: lead });
}

/** PUT /leads/:id */
export async function updateLead(req, res) {
  const lead = await queryOne("SELECT id FROM leads WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!lead) throw notFound("Kontak tidak ditemukan.");
  await assertCsInTenant(req.body.assigned_cs_id, req.tenantId);

  const sets = [];
  const values = [];
  for (const key of ["name", "gender", "address_full", "city", "assigned_cs_id", "status", "source", "interest", "est_value", "notes", "risk_cod_score"]) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (sets.length) await query(`UPDATE leads SET ${sets.join(", ")} WHERE id = ? AND institution_id = ?`, [...values, req.params.id, req.tenantId]);

  const updated = await queryOne("SELECT * FROM leads WHERE id = ?", [req.params.id]);
  emitEvent({ institutionId: req.tenantId, type: "contact.updated", data: () => contactPayload(updated) });
  res.json({ success: true, message: "Kontak berhasil diperbarui.", data: updated });
}

/** DELETE /leads/:id */
export async function deleteLead(req, res) {
  const hasOrders = await queryOne("SELECT id FROM orders WHERE lead_id = ? LIMIT 1", [req.params.id]);
  if (hasOrders) throw badRequest("Kontak memiliki riwayat pesanan dan tidak dapat dihapus. Ubah statusnya menjadi 'closed_lost'.");
  const result = await query("DELETE FROM leads WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!result.affectedRows) throw notFound("Kontak tidak ditemukan.");
  res.json({ success: true, message: "Kontak berhasil dihapus." });
}

/** POST /leads/import — many contacts at once. Existing numbers are skipped, never changed. */
export async function importContacts(req, res) {
  const summary = await importLeads({ institutionId: req.tenantId, rows: req.body.rows });
  await audit(req, "lead.import", { metadata: { total: summary.total, created: summary.created, existing: summary.existing, invalid: summary.invalidCount } });
  res.status(summary.created ? 201 : 200).json({ success: true, message: `${summary.created} kontak diimpor.`, data: summary });
}

/** PUT /leads/:id/vip — the manual VIP mark (a contact is also shown as VIP once their paid orders pass the threshold). */
export async function setVip(req, res) {
  const result = await query("UPDATE leads SET is_vip = ? WHERE id = ? AND institution_id = ?", [req.body.is_vip ? 1 : 0, req.params.id, req.tenantId]);
  if (!result.affectedRows) {
    const exists = await queryOne("SELECT id FROM leads WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
    if (!exists) throw notFound("Kontak tidak ditemukan.");
  }
  res.json({ success: true, message: req.body.is_vip ? "Kontak ditandai VIP." : "Tanda VIP dilepas.", data: { id: Number(req.params.id), is_vip: req.body.is_vip } });
}
