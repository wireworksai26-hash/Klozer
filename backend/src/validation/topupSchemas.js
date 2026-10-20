import { z } from "zod";

// Request shapes for AI token top ups.

const note = z.string().trim().max(300, "maksimal 300 karakter");

export const createTopupBody = z.object({
  tokens: z.coerce.number().int("harus bilangan bulat"),
  note: note.optional().transform((v) => (v ? v : undefined)),
});

export const quoteTopupBody = z.object({
  amountIdr: z.coerce.number().positive("harus lebih dari 0").max(1e10, "nilai terlalu besar"),
  note: note.optional().transform((v) => (v ? v : undefined)),
});

export const topupListQuery = z.object({
  status: z.enum(["requested", "quoted", "credited", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
