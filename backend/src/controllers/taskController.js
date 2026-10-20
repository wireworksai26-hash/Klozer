import { query } from "../config/db.js";
import { audit } from "../services/auditService.js";
import { AI_TASKS_PER_DAY, addComment, claimTask, createTask, deleteTask, getTask, getTaskSettings, listTasks, taskSummary, updateTask, updateTaskSettings, userActor } from "../services/tasks/taskService.js";
import { TASK_ASSIGNEE_ROLES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, TYPE_LABELS } from "../services/tasks/taskModel.js";

const idOf = (req) => Number(req.params.id);
const actorOf = (req) => userActor(req.user);

/** GET /tasks: the list, plus the numbers for the badge. Staff outside management see their own and untaken tasks. */
export async function list(req, res) {
  const actor = actorOf(req);
  const [data, summary] = await Promise.all([listTasks({ institutionId: req.tenantId, actor, ...req.query }), taskSummary(req.tenantId, actor)]);
  res.json({ success: true, data: data.tasks, total: data.total, summary });
}

/** GET /tasks/meta: what the dashboard needs to build its forms (kinds, statuses, who can be given a task). */
export async function meta(req, res) {
  const people = await query("SELECT id, name, role FROM users WHERE institution_id = ? AND is_active = 1 AND role IN (?) ORDER BY name", [req.tenantId, TASK_ASSIGNEE_ROLES]);
  res.json({
    success: true,
    data: { types: TASK_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] })), statuses: TASK_STATUSES, priorities: TASK_PRIORITIES, assignees: people, aiDailyLimit: AI_TASKS_PER_DAY },
  });
}

export async function get(req, res) {
  res.json({ success: true, data: await getTask(req.tenantId, idOf(req), actorOf(req)) });
}

/** POST /tasks */
export async function create(req, res) {
  const { task } = await createTask({ institutionId: req.tenantId, actor: actorOf(req), ...req.body });
  await audit(req, "task.create", { entityType: "task", entityId: task.id });
  res.status(201).json({ success: true, message: "Tugas dibuat.", data: task });
}

/** PUT /tasks/:id */
export async function update(req, res) {
  const task = await updateTask({ institutionId: req.tenantId, id: idOf(req), actor: actorOf(req), patch: req.body });
  res.json({ success: true, data: task });
}

/** POST /tasks/:id/claim */
export async function claim(req, res) {
  res.json({ success: true, data: await claimTask({ institutionId: req.tenantId, id: idOf(req), actor: actorOf(req) }) });
}

/** POST /tasks/:id/comments */
export async function comment(req, res) {
  await addComment({ institutionId: req.tenantId, id: idOf(req), actor: actorOf(req), text: req.body.text });
  res.status(201).json({ success: true, data: await getTask(req.tenantId, idOf(req), actorOf(req)) });
}

/** DELETE /tasks/:id */
export async function remove(req, res) {
  await deleteTask(req.tenantId, idOf(req));
  await audit(req, "task.delete", { entityType: "task", entityId: idOf(req) });
  res.json({ success: true, message: "Tugas dihapus." });
}

export async function getSettings(req, res) {
  res.json({ success: true, data: await getTaskSettings(req.tenantId) });
}

export async function putSettings(req, res) {
  const data = await updateTaskSettings(req.tenantId, req.body);
  await audit(req, "task.settings", { entityType: "task_settings", entityId: req.tenantId, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, data });
}
