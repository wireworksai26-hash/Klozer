import { z } from "zod";

const id = z.coerce.number().int().positive();
export const idParam = z.object({ id });

export const overviewQuery = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) });

export const switchBody = z.object({ institutionId: z.coerce.number().int().positive() });

export const contactsQuery = z.object({
  search: z.string().trim().max(60).default(""),
  shared: z.enum(["0", "1"]).default("0"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export const askBody = z.object({ question: z.string().trim().min(3, "tulis pertanyaannya").max(500) });

const STATUSES = ["new", "in_progress", "closing", "repeat", "idle", "closed_lost"];

/** A saved segment: every key narrows the list, an omitted key filters nothing. */
export const segmentFilters = z
  .object({
    statuses: z.array(z.enum(STATUSES)).max(6).optional(),
    vip: z.boolean().optional(),
    bought: z.boolean().optional(),
    consent: z.enum(["unknown", "opted_in", "opted_out"]).optional(),
    labelIds: z.array(z.coerce.number().int().positive()).max(20).optional(),
    minSpent: z.number().min(0).max(1e12).optional(),
    maxSpent: z.number().min(0).max(1e12).optional(),
    inactiveDays: z.number().int().min(1).max(3650).optional(),
  })
  .strict();

export const createSegmentBody = z.object({ name: z.string().trim().min(2).max(80), filters: segmentFilters });
export const previewBody = z.object({ filters: segmentFilters });
export const pageQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).default(0) });
export const mergeBody = z.object({ keepId: id, dropId: id });

// the Klozer team
export const createWorkspaceBody = z.object({ name: z.string().trim().min(2).max(150) });
export const updateWorkspaceBody = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    assistantEnabled: z.boolean().optional(),
    assistantMonthlyTokenCap: z.number().int().min(1000).max(2_000_000_000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "tidak ada yang diubah");
export const attachBody = z.object({ institutionId: id });
