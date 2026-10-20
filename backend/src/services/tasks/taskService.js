import { query, queryOne, transaction } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { emitToTenant, emitToUser } from "../../realtime.js";
import { badRequest, conflict, forbidden, notFound } from "../../utils/errors.js";
import { isFeatureOn } from "../featureFlags.js";
import { reasonLabel } from "../handoff/handoffPolicy.js";
import { emitEvent } from "../integrations/eventBus.js";
import { TASK_ASSIGNEE_ROLES, TASK_MANAGERS, canTransition, dedupeKeyFor, defaultTitle, describeChange, isOpenStatus, toTask } from "./taskModel.js";

/**
 * Tasks for the team. One place creates, changes and closes them, whoever asks: a person on the dashboard, an AI agent
 * through its action list, a rule (hand-off, payment proof). Every change is written to the task's history and pushed to
 * the dashboards and to webhooks.
 */

/** Tasks an AI agent may create for one shop per day: a loop or a chatty model cannot flood the team's list. */
export const AI_TASKS_PER_DAY = 200;

const FROM = `FROM tasks t
  LEFT JOIN leads l ON l.id = t.lead_id
  LEFT JOIN orders o ON o.id = t.order_id
  LEFT JOIN users u ON u.id = t.assigned_to
  LEFT JOIN ai_agents a ON a.id = t.agent_id`;
const COLUMNS = "t.*, l.name AS contact_name, o.order_number, u.name AS assignee_name, a.name AS agent_name";

// ---------------------------------------------------------------- who is acting
export const userActor = (user) => ({ type: "user", userId: user.id, role: user.role });
export const agentActor = (agentId) => ({ type: "ai_agent", agentId });
export const systemActor = Object.freeze({ type: "system" });

const isManager = (actor) => actor.type !== "user" || TASK_MANAGERS.includes(actor.role);
const sourceOf = (actor) => (actor.type === "user" ? "staff" : actor.type === "ai_agent" ? "ai_agent" : "rule");

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** What webhook receivers get. Field names are part of the contract: add freely, never rename. */
export const taskEventData = (task) => ({
  id: task.id,
  type: task.type,
  title: task.title,
  status: task.status,
  priority: task.priority,
  contact_id: task.leadId,
  order_id: task.orderId,
  assigned_to: task.assignedTo,
  due_at: iso(task.dueAt),
  source: task.source,
  agent_id: task.agentId,
  created_at: iso(task.createdAt),
  completed_at: iso(task.completedAt),
});

async function writeEvent(exec, { taskId, institutionId, actor, event, detail = null }) {
  await exec(
    "INSERT INTO task_events (task_id, institution_id, actor_type, actor_user_id, actor_agent_id, event, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [taskId, institutionId, actor.type, actor.userId ?? null, actor.agentId ?? null, event, detail ? String(detail).slice(0, 600) : null]
  );
}

async function loadTask(institutionId, id) {
  const row = await queryOne(`SELECT ${COLUMNS} ${FROM} WHERE t.id = ? AND t.institution_id = ?`, [id, institutionId]);
  return row ? toTask(row) : null;
}

function announce(institutionId, kind, task, { previousAssignee = null } = {}) {
  emitToTenant(institutionId, `task:${kind}`, task);
  // the person who just got it hears about it even if they are not looking at the list
  if (task.assignedTo && task.assignedTo !== previousAssignee) emitToUser(task.assignedTo, "task:assigned", task);
}

const visibleTo = (actor, task) => isManager(actor) || task.assignedTo === null || task.assignedTo === actor.userId;

// ---------------------------------------------------------------- checks shared by create and update
async function assertAssignee(institutionId, userId) {
  const user = await queryOne("SELECT id, role FROM users WHERE id = ? AND institution_id = ? AND is_active = 1", [userId, institutionId]);
  if (!user || !TASK_ASSIGNEE_ROLES.includes(user.role)) throw badRequest("Penanggung jawab tidak ditemukan atau tidak aktif.", { code: "UNKNOWN_ASSIGNEE" });
  return user;
}

async function assertContact(institutionId, leadId) {
  const lead = await queryOne("SELECT id, name, assigned_cs_id FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
  if (!lead) throw badRequest("Kontak tidak ditemukan.", { code: "UNKNOWN_CONTACT" });
  return lead;
}

async function assertOrder(institutionId, orderId) {
  const order = await queryOne("SELECT id, lead_id FROM orders WHERE id = ? AND institution_id = ?", [orderId, institutionId]);
  if (!order) throw badRequest("Pesanan tidak ditemukan.", { code: "UNKNOWN_ORDER" });
  return order;
}

// ---------------------------------------------------------------- create
/**
 * @param {object} p
 * @param {number} p.institutionId
 * @param {{ type: string, userId?: number, agentId?: number, role?: string }} p.actor
 * @param {boolean} [p.dedupe] keep one open task per contact and kind (the default for an AI agent or a rule; a person may make several)
 * @returns {Promise<{ task: object, created: boolean }>} `created: false` when an open task of that kind already exists for the contact
 */
export async function createTask({ institutionId, actor, leadId = null, orderId = null, type = "other", title = null, note = null, priority = "normal", dueAt = null, assignedTo = null, dedupe = actor.type !== "user", source = null }) {
  const lead = leadId ? await assertContact(institutionId, leadId) : null;
  if (orderId) {
    const order = await assertOrder(institutionId, orderId);
    if (leadId && order.lead_id !== leadId) throw badRequest("Pesanan itu bukan milik kontak ini.", { code: "UNKNOWN_ORDER" });
  }
  if (assignedTo !== null) {
    if (actor.type === "user" && !isManager(actor) && assignedTo !== actor.userId) throw forbidden("Anda hanya bisa menugaskan ke diri sendiri.", { code: "TASK_FORBIDDEN" });
    await assertAssignee(institutionId, assignedTo);
  }

  const key = dedupe ? dedupeKeyFor({ leadId, type }) : null;
  if (key) {
    const open = await queryOne("SELECT id FROM tasks WHERE institution_id = ? AND dedupe_key = ?", [institutionId, key]);
    if (open) return { task: await loadTask(institutionId, open.id), created: false };
  }

  if (actor.type === "ai_agent") {
    const today = await queryOne("SELECT COUNT(*) AS n FROM tasks WHERE institution_id = ? AND source = 'ai_agent' AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)", [institutionId]);
    if (Number(today.n) >= AI_TASKS_PER_DAY) throw conflict("Batas tugas buatan AI hari ini tercapai.", { code: "TASK_AI_LIMIT" });
  }

  let id;
  try {
    id = await transaction(async (tx) => {
      const result = await tx.query(
        `INSERT INTO tasks (institution_id, lead_id, order_id, type, title, note, priority, assigned_to, due_at, source, created_by, agent_id, dedupe_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [institutionId, leadId, orderId, type, (title?.trim() || defaultTitle(type, lead?.name)).slice(0, 160), note, priority, assignedTo, dueAt, source ?? sourceOf(actor), actor.userId ?? null, actor.agentId ?? null, key]
      );
      await writeEvent((sql, params) => tx.query(sql, params), { taskId: result.insertId, institutionId, actor, event: "created", detail: assignedTo ? `ditugaskan ke #${assignedTo}` : "belum ada penanggung jawab" });
      return result.insertId;
    });
  } catch (err) {
    // two writers raced for the same open task: the database kept one, hand back that one
    if (err.code === "ER_DUP_ENTRY" && key) {
      const open = await queryOne("SELECT id FROM tasks WHERE institution_id = ? AND dedupe_key = ?", [institutionId, key]);
      if (open) return { task: await loadTask(institutionId, open.id), created: false };
    }
    throw err;
  }

  const task = await loadTask(institutionId, id);
  announce(institutionId, "created", task);
  emitEvent({ institutionId, type: "task.created", data: taskEventData(task) });
  return { task, created: true };
}

// ---------------------------------------------------------------- read
export async function getTask(institutionId, id, actor) {
  const task = await loadTask(institutionId, id);
  if (!task || !visibleTo(actor, task)) throw notFound("Tugas tidak ditemukan.");
  const events = await query(
    `SELECT e.id, e.actor_type, e.actor_user_id, e.actor_agent_id, e.event, e.detail, e.created_at, u.name AS user_name, a.name AS agent_name
       FROM task_events e LEFT JOIN users u ON u.id = e.actor_user_id LEFT JOIN ai_agents a ON a.id = e.actor_agent_id
      WHERE e.task_id = ? ORDER BY e.id ASC`,
    [id]
  );
  return {
    ...task,
    events: events.map((e) => ({ id: Number(e.id), actor: e.actor_type, actorName: e.actor_type === "user" ? e.user_name : e.actor_type === "ai_agent" ? e.agent_name : "Sistem", event: e.event, detail: e.detail, createdAt: e.created_at })),
  };
}

/**
 * @param {object} f
 * @param {string} [f.status] open | in_progress | done | cancelled | active (open and in progress, the default)
 * @param {string|number} [f.assignee] "me", "unassigned" or a user id
 */
export async function listTasks({ institutionId, actor, status = "active", assignee = null, leadId = null, type = null, priority = null, overdue = false, q = null, limit = 50, offset = 0 }) {
  const where = ["t.institution_id = ?"];
  const params = [institutionId];
  if (status === "active") where.push("t.status IN ('open', 'in_progress')");
  else if (status !== "all") (where.push("t.status = ?"), params.push(status));

  if (!isManager(actor)) (where.push("(t.assigned_to IS NULL OR t.assigned_to = ?)"), params.push(actor.userId));
  if (assignee === "me") (where.push("t.assigned_to = ?"), params.push(actor.userId));
  else if (assignee === "unassigned") where.push("t.assigned_to IS NULL");
  else if (assignee) (where.push("t.assigned_to = ?"), params.push(Number(assignee)));

  if (leadId) (where.push("t.lead_id = ?"), params.push(leadId));
  if (type) (where.push("t.type = ?"), params.push(type));
  if (priority) (where.push("t.priority = ?"), params.push(priority));
  if (overdue) where.push("t.status IN ('open', 'in_progress') AND t.due_at IS NOT NULL AND t.due_at < UTC_TIMESTAMP()");
  if (q) (where.push("(t.title LIKE ? OR t.note LIKE ? OR l.name LIKE ?)"), params.push(...Array(3).fill(`%${q.replace(/[\\%_]/g, "\\$&")}%`)));

  const clause = where.join(" AND ");
  const [rows, total] = await Promise.all([
    query(
      `SELECT ${COLUMNS} ${FROM} WHERE ${clause}
        ORDER BY FIELD(t.status, 'open', 'in_progress', 'done', 'cancelled'), t.due_at IS NULL, t.due_at ASC, FIELD(t.priority, 'high', 'normal', 'low'), t.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryOne(`SELECT COUNT(*) AS n ${FROM} WHERE ${clause}`, params),
  ]);
  const now = new Date();
  return { tasks: rows.map((r) => toTask(r, now)), total: Number(total.n) };
}

/** Numbers for the badge and the filters: how many are open, late, nobody's, mine. */
export async function taskSummary(institutionId, actor) {
  const mine = isManager(actor) ? "" : " AND (assigned_to IS NULL OR assigned_to = ?)";
  const row = await queryOne(
    `SELECT COUNT(*) AS active,
            COALESCE(SUM(due_at IS NOT NULL AND due_at < UTC_TIMESTAMP()), 0) AS overdue,
            COALESCE(SUM(assigned_to IS NULL), 0) AS unassigned,
            COALESCE(SUM(assigned_to = ?), 0) AS mine
       FROM tasks WHERE institution_id = ? AND status IN ('open', 'in_progress')${mine}`,
    isManager(actor) ? [actor.userId ?? 0, institutionId] : [actor.userId, institutionId, actor.userId]
  );
  return { active: Number(row.active), overdue: Number(row.overdue), unassigned: Number(row.unassigned), mine: Number(row.mine) };
}

// ---------------------------------------------------------------- change
/** What a person who is not a manager may change on a task that is theirs (or nobody's yet). */
const STAFF_FIELDS = new Set(["status", "note", "dueAt"]);

/**
 * @param {object} p.patch any of status, title, note, priority, dueAt, assignedTo (null = release)
 */
export async function updateTask({ institutionId, id, actor, patch }) {
  const manager = isManager(actor);
  const outcome = await transaction(async (tx) => {
    const row = await tx.queryOne("SELECT * FROM tasks WHERE id = ? AND institution_id = ? FOR UPDATE", [id, institutionId]);
    if (!row) throw notFound("Tugas tidak ditemukan.");
    if (!manager && row.assigned_to !== null && row.assigned_to !== actor.userId) throw notFound("Tugas tidak ditemukan.");

    const selfAssign = patch.assignedTo !== undefined && patch.assignedTo === actor.userId && row.assigned_to === null;
    if (!manager) {
      const blocked = Object.keys(patch).filter((k) => patch[k] !== undefined && !STAFF_FIELDS.has(k) && !(k === "assignedTo" && selfAssign));
      if (blocked.length) throw forbidden(`Anda tidak bisa mengubah: ${blocked.join(", ")}.`, { code: "TASK_FORBIDDEN" });
    }

    const sets = [];
    const values = [];
    const set = (column, value) => (sets.push(`${column} = ?`), values.push(value));
    const events = [];
    const edited = [];

    if (patch.status !== undefined && patch.status !== row.status) {
      if (!canTransition(row.status, patch.status)) throw conflict(`Tugas tidak bisa berpindah dari ${row.status} ke ${patch.status}.`, { code: "TASK_BAD_TRANSITION" });
      set("status", patch.status);
      if (patch.status === "done") (set("completed_at", new Date()), set("completed_by", actor.userId ?? null), sets.push("dedupe_key = NULL"));
      else if (patch.status === "cancelled") sets.push("dedupe_key = NULL");
      else if (!isOpenStatus(row.status)) (sets.push("completed_at = NULL"), sets.push("completed_by = NULL"), sets.push("overdue_notified_at = NULL"));
      events.push(["status", describeChange("status", row.status, patch.status)]);
    }
    if (patch.assignedTo !== undefined && patch.assignedTo !== row.assigned_to) {
      if (patch.assignedTo !== null) await assertAssignee(institutionId, patch.assignedTo);
      set("assigned_to", patch.assignedTo);
      events.push(["assigned", describeChange("penanggung jawab", row.assigned_to, patch.assignedTo)]);
    }
    if (patch.dueAt !== undefined) {
      set("due_at", patch.dueAt);
      sets.push("overdue_notified_at = NULL"); // a new time means it can be reminded about again
      edited.push("tenggat");
    }
    for (const [key, column, label] of [["title", "title", "judul"], ["note", "note", "catatan"], ["priority", "priority", "prioritas"]]) {
      if (patch[key] !== undefined && patch[key] !== row[column]) (set(column, patch[key]), edited.push(label));
    }
    if (edited.length) events.push(["updated", `diubah: ${edited.join(", ")}`]);
    if (!sets.length) return { row, changed: false };

    await tx.query(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
    for (const [event, detail] of events) await writeEvent((sql, params) => tx.query(sql, params), { taskId: id, institutionId, actor, event, detail });
    return { row, changed: true, becameDone: patch.status === "done" && row.status !== "done" };
  });

  const task = await loadTask(institutionId, id);
  if (outcome.changed) {
    announce(institutionId, "updated", task, { previousAssignee: outcome.row.assigned_to });
    emitEvent({ institutionId, type: outcome.becameDone ? "task.completed" : "task.updated", data: taskEventData(task) });
  }
  return task;
}

/** Take a task nobody has. Two people pressing at once: the second is told it is taken. */
export async function claimTask({ institutionId, id, actor }) {
  if (actor.type !== "user") throw forbidden("Hanya anggota tim yang bisa mengambil tugas.");
  const task = await loadTask(institutionId, id);
  if (!task || !visibleTo(actor, task)) throw notFound("Tugas tidak ditemukan.");
  if (!isOpenStatus(task.status)) throw conflict("Tugas ini sudah selesai.", { code: "TASK_BAD_TRANSITION" });

  const result = await query("UPDATE tasks SET assigned_to = ? WHERE id = ? AND institution_id = ? AND assigned_to IS NULL", [actor.userId, id, institutionId]);
  if (result.affectedRows === 0) throw conflict("Tugas ini sudah diambil orang lain.", { code: "TASK_TAKEN" });
  await writeEvent(query, { taskId: id, institutionId, actor, event: "assigned", detail: "diambil sendiri" });

  const claimed = await loadTask(institutionId, id);
  announce(institutionId, "updated", claimed);
  emitEvent({ institutionId, type: "task.updated", data: taskEventData(claimed) });
  return claimed;
}

export async function addComment({ institutionId, id, actor, text }) {
  const task = await loadTask(institutionId, id);
  if (!task || !visibleTo(actor, task)) throw notFound("Tugas tidak ditemukan.");
  await writeEvent(query, { taskId: id, institutionId, actor, event: "comment", detail: text });
  emitToTenant(institutionId, "task:updated", task);
  return { id };
}

export async function deleteTask(institutionId, id) {
  const result = await query("DELETE FROM tasks WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!result.affectedRows) throw notFound("Tugas tidak ditemukan.");
  emitToTenant(institutionId, "task:deleted", { id });
}

// ---------------------------------------------------------------- settings
export const TASK_SETTINGS_DEFAULTS = Object.freeze({ autoOnHandoff: false, autoOnPaymentProof: false, assignToChatOwner: true, defaultDueMinutes: 60, notifyOverdue: true });

export async function getTaskSettings(institutionId) {
  const row = await queryOne("SELECT * FROM task_settings WHERE institution_id = ?", [institutionId]);
  return row
    ? { autoOnHandoff: Boolean(row.auto_on_handoff), autoOnPaymentProof: Boolean(row.auto_on_payment_proof), assignToChatOwner: Boolean(row.assign_to_chat_owner), defaultDueMinutes: Number(row.default_due_minutes), notifyOverdue: Boolean(row.notify_overdue) }
    : { ...TASK_SETTINGS_DEFAULTS };
}

export async function updateTaskSettings(institutionId, patch) {
  const next = { ...(await getTaskSettings(institutionId)) };
  for (const key of Object.keys(TASK_SETTINGS_DEFAULTS)) if (patch[key] !== undefined) next[key] = patch[key];
  await query(
    `INSERT INTO task_settings (institution_id, auto_on_handoff, auto_on_payment_proof, assign_to_chat_owner, default_due_minutes, notify_overdue) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE auto_on_handoff = VALUES(auto_on_handoff), auto_on_payment_proof = VALUES(auto_on_payment_proof), assign_to_chat_owner = VALUES(assign_to_chat_owner),
                             default_due_minutes = VALUES(default_due_minutes), notify_overdue = VALUES(notify_overdue)`,
    [institutionId, next.autoOnHandoff ? 1 : 0, next.autoOnPaymentProof ? 1 : 0, next.assignToChatOwner ? 1 : 0, next.defaultDueMinutes, next.notifyOverdue ? 1 : 0]
  );
  return getTaskSettings(institutionId);
}

// ---------------------------------------------------------------- tasks the system makes by itself
const inMinutes = (minutes) => new Date(Date.now() + minutes * 60_000);

/**
 * A conversation went to a person: make a task so it does not wait unseen, when the shop turned that on. A person who
 * took the chat over on their own needs none. Never throws: this must not get in the way of the hand-off itself.
 */
export async function autoTaskOnHandoff({ institutionId, leadId, reason }) {
  try {
    if (["manual", "cs_replied"].includes(reason)) return null;
    const settings = await getTaskSettings(institutionId);
    const proof = reason === "payment_proof";
    if (!(proof ? settings.autoOnPaymentProof : settings.autoOnHandoff)) return null;
    if (!(await isFeatureOn(institutionId, "tasks"))) return null;

    const lead = await queryOne("SELECT assigned_cs_id FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
    const { task, created } = await createTask({
      institutionId,
      actor: systemActor,
      leadId,
      type: proof ? "check_payment" : "handle_chat",
      title: proof ? "Periksa bukti pembayaran" : `Tangani chat: ${reasonLabel(reason)}`,
      priority: proof ? "high" : "normal",
      dueAt: inMinutes(settings.defaultDueMinutes),
      assignedTo: settings.assignToChatOwner ? lead?.assigned_cs_id ?? null : null,
    });
    return created ? task : null;
  } catch (err) {
    logger.warn({ err: err.message, institutionId, leadId, reason }, "Task for a hand-off was not created");
    return null;
  }
}

/**
 * A person answered the customer: "take over this chat" tasks that the system or an AI agent made are done. Tasks
 * someone wrote themselves are left alone.
 */
export async function closeChatTasks({ institutionId, leadId, userId }) {
  try {
    const rows = await query(
      "SELECT id FROM tasks WHERE institution_id = ? AND lead_id = ? AND type = 'handle_chat' AND status IN ('open', 'in_progress') AND source IN ('rule', 'ai_agent')",
      [institutionId, leadId]
    );
    for (const { id } of rows) {
      const done = await query("UPDATE tasks SET status = 'done', completed_at = UTC_TIMESTAMP(), completed_by = ?, dedupe_key = NULL WHERE id = ? AND status IN ('open', 'in_progress')", [userId, id]);
      if (!done.affectedRows) continue;
      await writeEvent(query, { taskId: id, institutionId, actor: { type: "user", userId }, event: "status", detail: "selesai: tim sudah membalas chat" });
      const task = await loadTask(institutionId, id);
      announce(institutionId, "updated", task);
      emitEvent({ institutionId, type: "task.completed", data: taskEventData(task) });
    }
  } catch (err) {
    logger.warn({ err: err.message, institutionId, leadId }, "Chat tasks were not closed");
  }
}

// ---------------------------------------------------------------- late tasks (called by the worker)
/**
 * Tell the team about tasks that just went past their time. Each task is announced once: the claim is a conditional
 * update, so several servers running this together still produce one notice.
 * @returns {Promise<number>} how many were announced
 */
export async function announceOverdue({ limit = 200 } = {}) {
  const due = await query(
    `SELECT t.id, t.institution_id FROM tasks t
       LEFT JOIN task_settings s ON s.institution_id = t.institution_id
      WHERE t.status IN ('open', 'in_progress') AND t.due_at IS NOT NULL AND t.due_at < UTC_TIMESTAMP() AND t.overdue_notified_at IS NULL
        AND COALESCE(s.notify_overdue, 1) = 1
      ORDER BY t.due_at ASC LIMIT ?`,
    [limit]
  );
  let announced = 0;
  for (const { id, institution_id: institutionId } of due) {
    const claimed = await query("UPDATE tasks SET overdue_notified_at = UTC_TIMESTAMP() WHERE id = ? AND overdue_notified_at IS NULL AND status IN ('open', 'in_progress')", [id]);
    if (!claimed.affectedRows) continue;
    announced++;
    await writeEvent(query, { taskId: id, institutionId, actor: systemActor, event: "overdue", detail: "melewati tenggat" });
    const task = await loadTask(institutionId, id);
    if (!task) continue;
    emitToTenant(institutionId, "task:overdue", task);
    if (task.assignedTo) emitToUser(task.assignedTo, "task:overdue", task);
    emitEvent({ institutionId, type: "task.overdue", data: taskEventData(task) });
  }
  return announced;
}
