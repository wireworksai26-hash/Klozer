import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "../services/tasks/taskModel.js";

// Request shapes for tasks.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const id = z.number().int().positive();
const hasChange = (v) => Object.values(v).some((x) => x !== undefined);
const dueAt = z.coerce.date({ message: "tanggal tidak valid" }).refine((d) => d.getFullYear() < 2100, "tanggal tidak valid");

export const createTaskBody = z.object({
  title: text(160).optional(),
  type: z.enum(TASK_TYPES).optional(),
  note: text(2000).nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: dueAt.nullable().optional(),
  assignedTo: id.nullable().optional(),
  leadId: id.nullable().optional(),
  orderId: id.nullable().optional(),
}).refine((v) => v.title || v.type || v.leadId, "isi judul atau jenis tugas");

export const updateTaskBody = z
  .object({
    title: text(160),
    note: text(2000).nullable(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    dueAt: dueAt.nullable(),
    assignedTo: id.nullable(),
  })
  .partial()
  .refine(hasChange, "tidak ada yang diubah");

export const taskListQuery = z.object({
  status: z.enum([...TASK_STATUSES, "active", "all"]).optional(),
  assignee: z.union([z.literal("me"), z.literal("unassigned"), z.coerce.number().int().positive()]).optional(),
  leadId: z.coerce.number().int().positive().optional(),
  type: z.enum(TASK_TYPES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  overdue: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  q: text(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const commentBody = z.object({ text: text(600) });

export const taskSettingsBody = z
  .object({
    autoOnHandoff: z.boolean(),
    autoOnPaymentProof: z.boolean(),
    assignToChatOwner: z.boolean(),
    defaultDueMinutes: z.number().int().min(5).max(10080),
    notifyOverdue: z.boolean(),
  })
  .partial()
  .refine(hasChange, "tidak ada yang diubah");
