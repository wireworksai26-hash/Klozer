/**
 * Tasks for the team: the rules that need no database. What a task can be, which status changes are allowed, when it
 * counts as late, and how the "one open task per contact and kind" key is made.
 */

export const TASK_TYPES = Object.freeze(["follow_up", "check_stock", "call_customer", "check_payment", "handle_chat", "other"]);
export const TASK_STATUSES = Object.freeze(["open", "in_progress", "done", "cancelled"]);
export const TASK_PRIORITIES = Object.freeze(["low", "normal", "high"]);
export const TASK_SOURCES = Object.freeze(["staff", "ai_agent", "rule", "api"]);

/** Roles that see and manage every task; the others see what is theirs or not yet taken. */
export const TASK_MANAGERS = Object.freeze(["owner", "supervisor"]);
/** Roles that can be given a task. */
export const TASK_ASSIGNEE_ROLES = Object.freeze(["owner", "supervisor", "cs", "finance", "pic_warehouse"]);

export const TYPE_LABELS = Object.freeze({
  follow_up: "Hubungi lagi",
  check_stock: "Cek stok",
  call_customer: "Telepon pelanggan",
  check_payment: "Periksa pembayaran",
  handle_chat: "Tangani chat",
  other: "Tugas",
});

const TRANSITIONS = Object.freeze({
  open: ["in_progress", "done", "cancelled"],
  in_progress: ["open", "done", "cancelled"],
  done: ["open"],
  cancelled: ["open"],
});

export const isOpenStatus = (status) => status === "open" || status === "in_progress";

export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** One open task per contact and kind, for tasks made by an AI agent or a rule. Staff may make as many as they like. */
export const dedupeKeyFor = ({ leadId, type }) => (leadId ? `${leadId}:${type}` : null);

export function isOverdue(task, now = new Date()) {
  return isOpenStatus(task.status) && Boolean(task.dueAt) && new Date(task.dueAt) < now;
}

/** The title used when the maker gave none. */
export const defaultTitle = (type, contactName = null) => `${TYPE_LABELS[type] ?? TYPE_LABELS.other}${contactName ? `: ${contactName}` : ""}`.slice(0, 160);

/** What the dashboard and the API return for a task row (a row from `listTasks`' query, with the names joined in). */
export function toTask(row, now = new Date()) {
  const task = {
    id: row.id,
    leadId: row.lead_id,
    contactName: row.contact_name ?? null,
    orderId: row.order_id,
    orderNumber: row.order_number ?? null,
    type: row.type,
    title: row.title,
    note: row.note,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    assigneeName: row.assignee_name ?? null,
    dueAt: row.due_at,
    source: row.source,
    createdBy: row.created_by,
    agentId: row.agent_id,
    agentName: row.agent_name ?? null,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...task, overdue: isOverdue(task, now) };
}

/** A short line for a change, shown in the task's history. */
export const describeChange = (field, from, to) => `${field}: ${from ?? "-"} → ${to ?? "-"}`;
