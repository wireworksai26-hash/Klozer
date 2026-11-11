import { query, queryOne } from "../config/db.js";
import { conflict, forbidden, notFound } from "../utils/errors.js";
import { escapeLike } from "../utils/helpers.js";

const PAID = "('paid', 'processing', 'shipped', 'delivered', 'completed')";
const placeholders = (ids) => ids.map(() => "?").join(", ");

/**
 * The workspace an owner belongs to, with its member businesses, or null. Only an owner of a business that sits in a
 * workspace gets one: staff, supervisors and businesses outside any workspace behave exactly as before.
 */
export async function workspaceOf(user) {
  if (!user || user.role !== "owner") return null;
  const mine = await queryOne("SELECT workspace_id FROM institutions WHERE id = ? AND is_active = 1", [user.institution_id]);
  if (!mine?.workspace_id) return null;
  const workspace = await queryOne("SELECT id, name, assistant_enabled, assistant_monthly_token_cap FROM workspaces WHERE id = ?", [mine.workspace_id]);
  if (!workspace) return null;
  const institutions = await query("SELECT id, name, sector FROM institutions WHERE workspace_id = ? AND is_active = 1 ORDER BY name", [workspace.id]);
  return {
    id: workspace.id,
    name: workspace.name,
    assistantEnabled: Boolean(workspace.assistant_enabled),
    assistantMonthlyTokenCap: workspace.assistant_monthly_token_cap ?? null,
    currentInstitutionId: user.institution_id,
    institutions: institutions.map((i) => ({ id: i.id, name: i.name, sector: i.sector })),
  };
}

/** Same as workspaceOf, but a 403 for anyone who is not an owner of a workspace business. */
export async function requireWorkspace(user) {
  const workspace = await workspaceOf(user);
  if (!workspace) throw forbidden("Workspace hanya untuk owner bisnis yang tergabung dalam workspace.");
  return workspace;
}

/**
 * The owner account to sign in as when switching to another business of the workspace. Each business keeps its own
 * owner account, so a switch is a new session for that account, and every request after it reads that one business.
 */
export async function switchTarget(user, institutionId) {
  const workspace = await requireWorkspace(user);
  if (!workspace.institutions.some((i) => i.id === institutionId)) throw notFound("Bisnis ini tidak ada di workspace Anda.");
  const target = await queryOne("SELECT * FROM users WHERE institution_id = ? AND role = 'owner' AND is_active = 1 ORDER BY id LIMIT 1", [institutionId]);
  if (!target) throw conflict("Bisnis ini belum punya akun owner yang aktif.");
  const institution = await queryOne("SELECT * FROM institutions WHERE id = ?", [institutionId]);
  return { user: target, institution };
}

const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);

/** Per business for the last `days` days, with the same length before it: paid revenue and orders, new contacts, what waits for a person, and a daily series. */
export async function overview(workspace, days = 30) {
  const ids = workspace.institutions.map((i) => i.id);
  if (!ids.length) return { days, businesses: [], series: [], totals: { revenue: 0, previousRevenue: 0, change: null, orders: 0, contacts: 0, attention: 0 } };
  const marks = placeholders(ids);

  const [sales, previous, contacts, waiting, proofs, human, lowStock, overdue, daily] = await Promise.all([
    query(`SELECT institution_id, COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders FROM orders WHERE institution_id IN (${marks}) AND status IN ${PAID} AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY institution_id`, [...ids, days]),
    query(`SELECT institution_id, COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE institution_id IN (${marks}) AND status IN ${PAID} AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY institution_id`, [...ids, days * 2, days]),
    query(`SELECT institution_id, COUNT(*) AS n FROM leads WHERE institution_id IN (${marks}) AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY institution_id`, [...ids, days]),
    query(`SELECT institution_id, COUNT(*) AS n FROM orders WHERE institution_id IN (${marks}) AND status = 'waiting_payment' GROUP BY institution_id`, ids),
    query(`SELECT institution_id, COUNT(*) AS n FROM orders WHERE institution_id IN (${marks}) AND status = 'waiting_payment' AND review_status = 'pending' GROUP BY institution_id`, ids),
    query(`SELECT institution_id, COUNT(*) AS n FROM leads WHERE institution_id IN (${marks}) AND handled_by = 'human' GROUP BY institution_id`, ids),
    query(`SELECT institution_id, COUNT(*) AS n FROM products WHERE institution_id IN (${marks}) AND is_active = 1 AND stock_quantity <= low_stock_threshold GROUP BY institution_id`, ids),
    query(`SELECT institution_id, COUNT(*) AS n FROM tasks WHERE institution_id IN (${marks}) AND status IN ('open', 'in_progress') AND due_at IS NOT NULL AND due_at < UTC_TIMESTAMP() GROUP BY institution_id`, ids),
    query(`SELECT institution_id, DATE(created_at) AS day, COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE institution_id IN (${marks}) AND status IN ${PAID} AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY institution_id, DATE(created_at)`, [...ids, days - 1]),
  ]);

  const by = (rows, key = "n") => new Map(rows.map((r) => [r.institution_id, Number(r[key])]));
  const revenue = by(sales, "revenue");
  const orders = by(sales, "orders");
  const before = by(previous, "revenue");
  const newContacts = by(contacts);
  const waitingMap = by(waiting);
  const proofMap = by(proofs);
  const humanMap = by(human);
  const stockMap = by(lowStock);
  const overdueMap = by(overdue);

  const businesses = workspace.institutions.map((i) => ({
    id: i.id,
    name: i.name,
    revenue: revenue.get(i.id) ?? 0,
    previousRevenue: before.get(i.id) ?? 0,
    change: pct(revenue.get(i.id) ?? 0, before.get(i.id) ?? 0),
    orders: orders.get(i.id) ?? 0,
    newContacts: newContacts.get(i.id) ?? 0,
    waitingPayment: waitingMap.get(i.id) ?? 0,
    proofsToCheck: proofMap.get(i.id) ?? 0,
    chatsForTeam: humanMap.get(i.id) ?? 0,
    lowStock: stockMap.get(i.id) ?? 0,
    overdueTasks: overdueMap.get(i.id) ?? 0,
  }));

  // one row per day, one column per business, zero where nothing was paid
  const dayKey = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
  const byDay = new Map();
  for (const r of daily) byDay.set(`${dayKey(r.day)}|${r.institution_id}`, Number(r.revenue));
  const series = [];
  for (let back = days - 1; back >= 0; back--) {
    const d = new Date(Date.now() - back * 86400000);
    const day = d.toISOString().slice(0, 10);
    series.push({ day, values: Object.fromEntries(ids.map((id) => [id, byDay.get(`${day}|${id}`) ?? 0])) });
  }

  const total = businesses.reduce((a, x) => a + x.revenue, 0);
  const totalBefore = businesses.reduce((a, x) => a + x.previousRevenue, 0);
  return {
    days,
    businesses,
    series,
    totals: {
      revenue: total,
      previousRevenue: totalBefore,
      change: pct(total, totalBefore),
      orders: businesses.reduce((a, x) => a + x.orders, 0),
      contacts: businesses.reduce((a, x) => a + x.newContacts, 0),
      attention: businesses.reduce((a, x) => a + x.waitingPayment + x.chatsForTeam + x.proofsToCheck + x.overdueTasks + x.lowStock, 0),
    },
  };
}

/** One row per business for the Businesses page: how it did against the period before, its AI token balance, its team and its open work. */
export async function portfolio(workspace, days = 30) {
  const base = await overview(workspace, days);
  const ids = workspace.institutions.map((i) => i.id);
  if (!ids.length) return { days, items: [] };
  const marks = placeholders(ids);
  const [meta, staff, lastOrder] = await Promise.all([
    query(`SELECT id, subscription_tier, ai_token_quota, ai_tokens_used FROM institutions WHERE id IN (${marks})`, ids),
    query(`SELECT institution_id, COUNT(*) AS n FROM users WHERE institution_id IN (${marks}) AND is_active = 1 AND role <> 'owner' GROUP BY institution_id`, ids),
    query(`SELECT institution_id, MAX(created_at) AS at FROM orders WHERE institution_id IN (${marks}) AND status IN ${PAID} GROUP BY institution_id`, ids),
  ]);
  const metaMap = new Map(meta.map((m) => [m.id, m]));
  const staffMap = new Map(staff.map((r) => [r.institution_id, Number(r.n)]));
  const lastMap = new Map(lastOrder.map((r) => [r.institution_id, r.at]));
  return {
    days,
    items: base.businesses.map((b) => {
      const m = metaMap.get(b.id);
      const quota = Number(m?.ai_token_quota ?? 0);
      const used = Number(m?.ai_tokens_used ?? 0);
      return { ...b, tier: m?.subscription_tier ?? null, tokenQuota: quota, tokensUsed: used, tokensLeft: Math.max(0, quota - used), staff: staffMap.get(b.id) ?? 0, lastPaidOrderAt: lastMap.get(b.id) ?? null, current: b.id === workspace.currentInstitutionId };
    }),
  };
}

/** Business against business, and this period against the one before it, plus what sells and who sells it. */
export async function report(workspace, days = 30) {
  const ids = workspace.institutions.map((i) => i.id);
  if (!ids.length) return { days, businesses: [], topProducts: [], payments: [], sellers: [] };
  const marks = placeholders(ids);
  const window = `o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
  const [now, before, contactsNow, contactsBefore, products, payments, sellers] = await Promise.all([
    query(`SELECT institution_id, COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders FROM orders o WHERE institution_id IN (${marks}) AND status IN ${PAID} AND ${window} GROUP BY institution_id`, [...ids, days]),
    query(`SELECT institution_id, COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders FROM orders o WHERE institution_id IN (${marks}) AND status IN ${PAID} AND ${window} AND o.created_at < DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY institution_id`, [...ids, days * 2, days]),
    query(`SELECT institution_id, COUNT(*) AS n FROM leads WHERE institution_id IN (${marks}) AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY institution_id`, [...ids, days]),
    query(`SELECT institution_id, COUNT(*) AS n FROM leads WHERE institution_id IN (${marks}) AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY institution_id`, [...ids, days * 2, days]),
    query(`SELECT oi.item_name AS name, SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue, COUNT(DISTINCT o.institution_id) AS businesses FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.institution_id IN (${marks}) AND o.status IN ${PAID} AND ${window} GROUP BY oi.item_name ORDER BY revenue DESC LIMIT 10`, [...ids, days]),
    query(`SELECT payment_method AS method, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue FROM orders o WHERE institution_id IN (${marks}) AND status IN ${PAID} AND ${window} GROUP BY payment_method ORDER BY revenue DESC`, [...ids, days]),
    query(`SELECT u.name, o.institution_id, COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS revenue FROM orders o JOIN users u ON u.id = o.cs_user_id WHERE o.institution_id IN (${marks}) AND o.status IN ${PAID} AND ${window} GROUP BY u.id, u.name, o.institution_id ORDER BY revenue DESC LIMIT 10`, [...ids, days]),
  ]);
  const map = (rows, key) => new Map(rows.map((r) => [r.institution_id, Number(r[key])]));
  const rev = map(now, "revenue"), ord = map(now, "orders"), revB = map(before, "revenue"), ordB = map(before, "orders"), cn = map(contactsNow, "n"), cb = map(contactsBefore, "n");
  const names = new Map(workspace.institutions.map((i) => [i.id, i.name]));
  const aov = (r, o) => (o ? Math.round(r / o) : 0);
  return {
    days,
    businesses: workspace.institutions.map((i) => {
      const r = rev.get(i.id) ?? 0, o = ord.get(i.id) ?? 0, rb = revB.get(i.id) ?? 0, ob = ordB.get(i.id) ?? 0;
      return {
        id: i.id, name: i.name,
        revenue: r, previousRevenue: rb, revenueChange: pct(r, rb),
        orders: o, previousOrders: ob, ordersChange: pct(o, ob),
        averageOrder: aov(r, o), previousAverageOrder: aov(rb, ob), averageOrderChange: pct(aov(r, o), aov(rb, ob)),
        newContacts: cn.get(i.id) ?? 0, previousNewContacts: cb.get(i.id) ?? 0, newContactsChange: pct(cn.get(i.id) ?? 0, cb.get(i.id) ?? 0),
      };
    }),
    topProducts: products.map((p) => ({ name: p.name, quantity: Number(p.qty), revenue: Number(p.revenue), businesses: Number(p.businesses) })),
    payments: payments.map((p) => ({ method: p.method, orders: Number(p.orders), revenue: Number(p.revenue) })),
    sellers: sellers.map((r) => ({ name: r.name, business: names.get(r.institution_id), orders: Number(r.orders), revenue: Number(r.revenue) })),
  };
}

/**
 * People who are customers of more than one business, or of one, joined by phone number. Read only, and it carries no
 * chat text and no address: just who, where, and how much they bought in each business.
 */
export async function joinedContacts(workspace, { search = "", sharedOnly = false, limit = 30, offset = 0 } = {}) {
  const ids = workspace.institutions.map((i) => i.id);
  if (!ids.length) return { items: [], total: 0, people: 0, shared: 0 };
  const marks = placeholders(ids);
  const like = `%${escapeLike(search)}%`;
  const where = `l.institution_id IN (${marks})${search ? " AND (l.name LIKE ? OR l.phone_number LIKE ?)" : ""}`;
  const args = [...ids, ...(search ? [like, like] : [])];
  const spent = `LEFT JOIN (SELECT lead_id, SUM(total_amount) AS spent, COUNT(*) AS orders FROM orders WHERE status IN ${PAID} GROUP BY lead_id) o ON o.lead_id = l.id`;
  const having = sharedOnly ? "HAVING COUNT(DISTINCT l.institution_id) > 1" : "";

  const countRows = await queryOne(`SELECT COUNT(*) AS people, COALESCE(SUM(n > 1), 0) AS shared FROM (SELECT COUNT(DISTINCT institution_id) AS n FROM leads WHERE institution_id IN (${marks}) GROUP BY phone_number) x`, ids);
  const totalRow = await queryOne(`SELECT COUNT(*) AS n FROM (SELECT l.phone_number FROM leads l WHERE ${where} GROUP BY l.phone_number ${having}) x`, args);
  const people = await query(
    `SELECT l.phone_number, MAX(l.name) AS name, COUNT(DISTINCT l.institution_id) AS business_count, COALESCE(SUM(o.spent), 0) AS spent, COALESCE(SUM(o.orders), 0) AS orders
       FROM leads l ${spent} WHERE ${where} GROUP BY l.phone_number ${having}
      ORDER BY spent DESC, business_count DESC, l.phone_number LIMIT ? OFFSET ?`,
    [...args, Number(limit), Number(offset)]
  );
  if (!people.length) return { items: [], total: Number(totalRow?.n ?? 0), people: Number(countRows?.people ?? 0), shared: Number(countRows?.shared ?? 0) };

  const phones = people.map((p) => p.phone_number);
  const rows = await query(
    `SELECT l.phone_number, l.institution_id, l.id AS lead_id, l.status, l.is_vip, l.last_contacted_at, COALESCE(o.spent, 0) AS spent, COALESCE(o.orders, 0) AS orders
       FROM leads l ${spent} WHERE l.institution_id IN (${marks}) AND l.phone_number IN (${placeholders(phones)})`,
    [...ids, ...phones]
  );
  const names = new Map(workspace.institutions.map((i) => [i.id, i.name]));
  const grouped = new Map();
  for (const r of rows) {
    if (!grouped.has(r.phone_number)) grouped.set(r.phone_number, []);
    grouped.get(r.phone_number).push({ institutionId: r.institution_id, institutionName: names.get(r.institution_id), leadId: r.lead_id, status: r.status, isVip: Boolean(r.is_vip), orders: Number(r.orders), spent: Number(r.spent), lastContactedAt: r.last_contacted_at });
  }
  return {
    total: Number(totalRow?.n ?? 0),
    people: Number(countRows?.people ?? 0),
    shared: Number(countRows?.shared ?? 0),
    items: people.map((p) => ({ phone: p.phone_number, name: p.name || null, businessCount: Number(p.business_count), orders: Number(p.orders), spent: Number(p.spent), businesses: grouped.get(p.phone_number) ?? [] })),
  };
}

// ---------------------------------------------------------------- the Klozer team: create and manage workspaces

const monthTokens = async (ids) =>
  ids.length
    ? Number((await queryOne(`SELECT COALESCE(SUM(total_tokens), 0) AS n FROM ai_token_usage_logs WHERE usage_type = 'workspace_ai' AND institution_id IN (${placeholders(ids)}) AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`, ids))?.n ?? 0)
    : 0;

export async function listWorkspaces() {
  const rows = await query("SELECT id, name, assistant_enabled, assistant_monthly_token_cap, created_at FROM workspaces ORDER BY name");
  const members = await query("SELECT id, name, workspace_id, is_active FROM institutions WHERE workspace_id IS NOT NULL ORDER BY name");
  const out = [];
  for (const w of rows) {
    const inst = members.filter((m) => m.workspace_id === w.id);
    out.push({
      id: w.id,
      name: w.name,
      assistantEnabled: Boolean(w.assistant_enabled),
      assistantMonthlyTokenCap: w.assistant_monthly_token_cap ?? null,
      assistantTokensThisMonth: await monthTokens(inst.map((i) => i.id)),
      institutions: inst.map((i) => ({ id: i.id, name: i.name, active: Boolean(i.is_active) })),
      createdAt: w.created_at,
    });
  }
  return out;
}

export async function createWorkspace(name) {
  const result = await query("INSERT INTO workspaces (name) VALUES (?)", [name]);
  return result.insertId;
}

export async function updateWorkspace(id, patch) {
  const w = await queryOne("SELECT id FROM workspaces WHERE id = ?", [id]);
  if (!w) throw notFound("Workspace tidak ditemukan.");
  const sets = [];
  const args = [];
  if (patch.name !== undefined) { sets.push("name = ?"); args.push(patch.name); }
  if (patch.assistantEnabled !== undefined) { sets.push("assistant_enabled = ?"); args.push(patch.assistantEnabled ? 1 : 0); }
  if (patch.assistantMonthlyTokenCap !== undefined) { sets.push("assistant_monthly_token_cap = ?"); args.push(patch.assistantMonthlyTokenCap); }
  if (sets.length) await query(`UPDATE workspaces SET ${sets.join(", ")} WHERE id = ?`, [...args, id]);
}

export async function deleteWorkspace(id) {
  const w = await queryOne("SELECT id FROM workspaces WHERE id = ?", [id]);
  if (!w) throw notFound("Workspace tidak ditemukan.");
  await query("DELETE FROM workspaces WHERE id = ?", [id]); // the businesses stay, only the link goes (ON DELETE SET NULL)
}

export async function attachInstitution(workspaceId, institutionId) {
  const w = await queryOne("SELECT id FROM workspaces WHERE id = ?", [workspaceId]);
  if (!w) throw notFound("Workspace tidak ditemukan.");
  const inst = await queryOne("SELECT id, workspace_id FROM institutions WHERE id = ?", [institutionId]);
  if (!inst) throw notFound("Bisnis tidak ditemukan.");
  if (inst.workspace_id && inst.workspace_id !== workspaceId) throw conflict("Bisnis ini sudah ada di workspace lain. Lepaskan dulu.");
  const owner = await queryOne("SELECT id FROM users WHERE institution_id = ? AND role = 'owner' AND is_active = 1 LIMIT 1", [institutionId]);
  if (!owner) throw conflict("Bisnis ini belum punya akun owner yang aktif, jadi belum bisa digabung.");
  await query("UPDATE institutions SET workspace_id = ? WHERE id = ?", [workspaceId, institutionId]);
}

export async function detachInstitution(institutionId) {
  const inst = await queryOne("SELECT id FROM institutions WHERE id = ?", [institutionId]);
  if (!inst) throw notFound("Bisnis tidak ditemukan.");
  await query("UPDATE institutions SET workspace_id = NULL WHERE id = ?", [institutionId]);
}

export { monthTokens };
