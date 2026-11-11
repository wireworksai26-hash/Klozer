import { query, queryOne, transaction } from "../config/db.js";
import { conflict, notFound } from "../utils/errors.js";

const PAID = "('paid', 'processing', 'shipped', 'delivered', 'completed')";

/** One contact as the team needs it before talking to them: who, what they bought, what is open, and what was noted. */
export async function contactProfile(institutionId, leadId) {
  const lead = await queryOne(
    `SELECT id, name, phone_number, city, address_full, status, notes, is_vip, marketing_consent, handled_by, channel_type,
            followup_opt_out, assigned_cs_id, last_contacted_at, created_at
       FROM leads WHERE id = ? AND institution_id = ?`,
    [leadId, institutionId]
  );
  if (!lead) throw notFound("Kontak tidak ditemukan.");

  const [stats, orders, labels, tasks, chat, cs] = await Promise.all([
    queryOne(
      `SELECT COUNT(*) AS paid_orders, COALESCE(SUM(total_amount), 0) AS spent, MIN(created_at) AS first_order, MAX(created_at) AS last_order
         FROM orders WHERE institution_id = ? AND lead_id = ? AND status IN ${PAID}`,
      [institutionId, leadId]
    ),
    query("SELECT id, order_number, total_amount, status, payment_method, created_at FROM orders WHERE institution_id = ? AND lead_id = ? ORDER BY id DESC LIMIT 10", [institutionId, leadId]),
    query("SELECT l.id, l.name FROM leads_labels_map m JOIN lead_labels l ON l.id = m.label_id WHERE m.lead_id = ? AND l.institution_id = ? ORDER BY l.name", [leadId, institutionId]),
    query("SELECT id, title, status, priority, due_at FROM tasks WHERE institution_id = ? AND lead_id = ? AND status IN ('open', 'in_progress') ORDER BY (due_at IS NULL), due_at LIMIT 10", [institutionId, leadId]),
    queryOne("SELECT COUNT(*) AS n, MAX(created_at) AS last_at FROM chat_messages WHERE institution_id = ? AND lead_id = ?", [institutionId, leadId]),
    lead.assigned_cs_id ? queryOne("SELECT name FROM users WHERE id = ?", [lead.assigned_cs_id]) : null,
  ]);

  const paidOrders = Number(stats.paid_orders);
  const spent = Number(stats.spent);
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone_number,
    city: lead.city,
    address: lead.address_full,
    status: lead.status,
    notes: lead.notes,
    isVip: Boolean(lead.is_vip),
    marketingConsent: lead.marketing_consent,
    followupOptOut: Boolean(lead.followup_opt_out),
    handledBy: lead.handled_by,
    channelType: lead.channel_type,
    assignedCs: cs?.name ?? null,
    lastContactedAt: lead.last_contacted_at,
    createdAt: lead.created_at,
    stats: { paidOrders, spent, averageOrder: paidOrders ? Math.round(spent / paidOrders) : 0, firstOrderAt: stats.first_order, lastOrderAt: stats.last_order, messages: Number(chat.n), lastMessageAt: chat.last_at },
    orders: orders.map((o) => ({ id: o.id, number: o.order_number, total: Number(o.total_amount), status: o.status, paymentMethod: o.payment_method, createdAt: o.created_at })),
    labels,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueAt: t.due_at })),
  };
}

// ---------------------------------------------------------------- segments

/**
 * A segment is a saved filter. Every key narrows the list further; a key that is left out filters nothing.
 *   statuses: contact statuses, vip: true/false, bought: true (has a paid order) / false (never),
 *   minSpent / maxSpent: paid total, inactiveDays: no chat contact and no paid order for N days,
 *   labelIds: has any of these labels, consent: marketing consent value.
 */
export function segmentSql(filters = {}) {
  const where = [];
  const args = [];
  if (filters.statuses?.length) { where.push(`l.status IN (${filters.statuses.map(() => "?").join(", ")})`); args.push(...filters.statuses); }
  if (filters.vip !== undefined) { where.push("l.is_vip = ?"); args.push(filters.vip ? 1 : 0); }
  if (filters.consent) { where.push("l.marketing_consent = ?"); args.push(filters.consent); }
  if (filters.labelIds?.length) { where.push(`EXISTS (SELECT 1 FROM leads_labels_map m WHERE m.lead_id = l.id AND m.label_id IN (${filters.labelIds.map(() => "?").join(", ")}))`); args.push(...filters.labelIds); }
  if (filters.bought === true) where.push("COALESCE(o.orders, 0) > 0");
  if (filters.bought === false) where.push("COALESCE(o.orders, 0) = 0");
  if (filters.minSpent !== undefined) { where.push("COALESCE(o.spent, 0) >= ?"); args.push(filters.minSpent); }
  if (filters.maxSpent !== undefined) { where.push("COALESCE(o.spent, 0) <= ?"); args.push(filters.maxSpent); }
  if (filters.inactiveDays !== undefined) {
    where.push("COALESCE(GREATEST(l.last_contacted_at, o.last_order), l.last_contacted_at, o.last_order, l.created_at) < DATE_SUB(NOW(), INTERVAL ? DAY)");
    args.push(filters.inactiveDays);
  }
  return { where: where.length ? ` AND ${where.join(" AND ")}` : "", args };
}

const spentJoin = `LEFT JOIN (SELECT lead_id, SUM(total_amount) AS spent, COUNT(*) AS orders, MAX(created_at) AS last_order FROM orders WHERE status IN ${PAID} GROUP BY lead_id) o ON o.lead_id = l.id`;

export async function contactsMatching(institutionId, filters, { limit = 50, offset = 0 } = {}) {
  const { where, args } = segmentSql(filters);
  const base = `FROM leads l ${spentJoin} WHERE l.institution_id = ?${where}`;
  const total = Number((await queryOne(`SELECT COUNT(*) AS n ${base}`, [institutionId, ...args]))?.n ?? 0);
  const rows = await query(
    `SELECT l.id, l.name, l.phone_number, l.status, l.is_vip, l.last_contacted_at, COALESCE(o.spent, 0) AS spent, COALESCE(o.orders, 0) AS orders
       ${base} ORDER BY COALESCE(o.spent, 0) DESC, l.id DESC LIMIT ? OFFSET ?`,
    [institutionId, ...args, Number(limit), Number(offset)]
  );
  return { total, items: rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone_number, status: r.status, isVip: Boolean(r.is_vip), lastContactedAt: r.last_contacted_at, orders: Number(r.orders), spent: Number(r.spent) })) };
}

export async function listSegments(institutionId) {
  const rows = await query("SELECT id, name, filters_json, created_at FROM crm_segments WHERE institution_id = ? ORDER BY name", [institutionId]);
  const out = [];
  for (const r of rows) {
    const filters = typeof r.filters_json === "string" ? JSON.parse(r.filters_json) : r.filters_json;
    const { total } = await contactsMatching(institutionId, filters, { limit: 1 });
    out.push({ id: r.id, name: r.name, filters, count: total, createdAt: r.created_at });
  }
  return out;
}

export async function createSegment(institutionId, userId, { name, filters }) {
  const dup = await queryOne("SELECT id FROM crm_segments WHERE institution_id = ? AND name = ?", [institutionId, name]);
  if (dup) throw conflict("Sudah ada segmen dengan nama itu.");
  const result = await query("INSERT INTO crm_segments (institution_id, name, filters_json, created_by) VALUES (?, ?, ?, ?)", [institutionId, name, JSON.stringify(filters), userId]);
  return result.insertId;
}

export async function getSegment(institutionId, id) {
  const row = await queryOne("SELECT id, name, filters_json FROM crm_segments WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Segmen tidak ditemukan.");
  return { id: row.id, name: row.name, filters: typeof row.filters_json === "string" ? JSON.parse(row.filters_json) : row.filters_json };
}

export async function deleteSegment(institutionId, id) {
  const row = await queryOne("SELECT id FROM crm_segments WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Segmen tidak ditemukan.");
  await query("DELETE FROM crm_segments WHERE id = ?", [id]);
}

// ---------------------------------------------------------------- merging duplicates

/**
 * Fold one contact into another of the same business: every order, message, label, task and follow-up of `dropId` moves to
 * `keepId`, empty details are filled from it, the more careful marketing consent wins, and `dropId` is removed. Rows that
 * would collide (the same label twice) are skipped and go with the removed contact.
 */
export async function mergeContacts(institutionId, keepId, dropId) {
  if (keepId === dropId) throw conflict("Pilih dua kontak yang berbeda.");
  return transaction(async (tx) => {
    const keep = await tx.queryOne("SELECT * FROM leads WHERE id = ? AND institution_id = ? FOR UPDATE", [keepId, institutionId]);
    const drop = await tx.queryOne("SELECT * FROM leads WHERE id = ? AND institution_id = ? FOR UPDATE", [dropId, institutionId]);
    if (!keep || !drop) throw notFound("Kontak tidak ditemukan.");

    const tables = await tx.query("SELECT DISTINCT table_name AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND column_name = 'lead_id' AND table_name <> 'leads'");
    const moved = {};
    for (const { name } of tables) {
      if (!/^[a-z0-9_]+$/i.test(name)) continue;
      const res = await tx.query(`UPDATE IGNORE \`${name}\` SET lead_id = ? WHERE lead_id = ?`, [keepId, dropId]);
      if (res.affectedRows) moved[name] = res.affectedRows;
    }

    const consent = keep.marketing_consent === "opted_out" || drop.marketing_consent === "opted_out" ? "opted_out" : keep.marketing_consent === "opted_in" || drop.marketing_consent === "opted_in" ? "opted_in" : keep.marketing_consent;
    const notes = [keep.notes, drop.notes].filter(Boolean).join("\n").slice(0, 2000) || null;
    await tx.query(
      `UPDATE leads SET name = COALESCE(NULLIF(name, ''), ?), city = COALESCE(NULLIF(city, ''), ?), address_full = COALESCE(address_full, ?),
              notes = ?, is_vip = ?, marketing_consent = ?, followup_opt_out = ?,
              last_contacted_at = CASE WHEN last_contacted_at IS NULL THEN ? WHEN ? IS NULL THEN last_contacted_at ELSE GREATEST(last_contacted_at, ?) END
        WHERE id = ?`,
      [drop.name, drop.city, drop.address_full, notes, keep.is_vip || drop.is_vip ? 1 : 0, consent, keep.followup_opt_out || drop.followup_opt_out ? 1 : 0, drop.last_contacted_at, drop.last_contacted_at, drop.last_contacted_at, keepId]
    );
    await tx.query("DELETE FROM leads WHERE id = ?", [dropId]);
    return { keepId, droppedId: dropId, moved };
  });
}
