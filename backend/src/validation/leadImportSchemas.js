import { z } from "zod";
import { MAX_IMPORT_ROWS } from "../services/leads/leadImportService.js";

const cell = (max) => z.union([z.string(), z.number()]).transform((v) => String(v).slice(0, max)).optional();

export const importLeadsBody = z.object({
  rows: z
    .array(
      z.object({
        name: cell(200),
        phone: z.union([z.string(), z.number()]).transform((v) => String(v).slice(0, 40)),
        city: cell(200),
        label: cell(100),
        notes: cell(2000),
      })
    )
    .min(1, "Tidak ada baris untuk diimpor.")
    .max(MAX_IMPORT_ROWS, `Maksimal ${MAX_IMPORT_ROWS} kontak per impor. Pecah filenya.`),
});

export const setVipBody = z.object({ is_vip: z.boolean() });
