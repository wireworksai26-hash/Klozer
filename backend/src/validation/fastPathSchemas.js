import { z } from "zod";
import { FAST_TOPICS } from "../services/fastpath/fastPathModel.js";
import { MAX_STORE_HOURS } from "../services/fastpath/fastPathSettings.js";

// Request shapes for the fast path settings.

const topics = z.object(Object.fromEntries(FAST_TOPICS.map((t) => [t, z.boolean().optional()]))).strict();

export const updateFastPathBody = z
  .object({
    enabled: z.boolean(),
    topics,
    storeHours: z.string().trim().max(MAX_STORE_HOURS, `maksimal ${MAX_STORE_HOURS} karakter`).nullable(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), "tidak ada yang diubah");

export const statsQuery = z.object({ days: z.coerce.number().int().min(1).max(365).optional() });
