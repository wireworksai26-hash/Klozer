import { z } from "zod";
import { queryOne } from "../../../config/db.js";
import { TASK_PRIORITIES, TASK_TYPES } from "../../tasks/taskModel.js";
import { agentActor, createTask, getTaskSettings } from "../../tasks/taskService.js";
import { ToolError } from "./toolError.js";

/** A task for the team about this conversation. One open task per kind per contact: asking again returns the one that exists. */
export const createTaskTool = {
  name: "create_task",
  schema: z.object({
    title: z.string().trim().min(3, "terlalu pendek").max(160).optional(),
    type: z.enum(TASK_TYPES).optional(),
    note: z.string().trim().max(500).optional(),
    dueInMinutes: z.coerce.number().int().min(5).max(10080).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
  }),
  async run(args, { institutionId, leadId, agent }) {
    if (!args.title && !args.type) throw new ToolError("Isi title atau type.");
    const settings = await getTaskSettings(institutionId);
    const lead = await queryOne("SELECT assigned_cs_id FROM leads WHERE id = ? AND institution_id = ?", [leadId, institutionId]);
    const minutes = args.dueInMinutes ?? settings.defaultDueMinutes;
    const { task, created } = await createTask({
      institutionId,
      actor: agentActor(agent.id),
      leadId,
      type: args.type ?? "follow_up",
      title: args.title ?? null,
      note: args.note ?? null,
      priority: args.priority ?? "normal",
      dueAt: new Date(Date.now() + minutes * 60_000),
      assignedTo: settings.assignToChatOwner ? lead?.assigned_cs_id ?? null : null,
    });
    return { taskId: task.id, created, message: created ? "Tugas dibuat untuk tim. Jangan menjanjikan jam pasti ke pelanggan." : "Sudah ada tugas serupa yang masih terbuka; tidak dibuat lagi." };
  },
};
