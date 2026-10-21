import { z } from "zod";

// Request shapes for package purchases and payment notices.

const note = z.string().trim().max(300, "maksimal 300 karakter");

export const createOrderBody = z.object({
  plan: z.enum(["starter", "pro"]),
  period: z.enum(["monthly", "annual"]),
});

export const paidOrderBody = z.object({ reference: note.optional().transform((v) => (v ? v : undefined)) });

export const orderListQuery = z.object({
  status: z.enum(["pending", "paid", "cancelled", "expired"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const notificationsQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() });

/** A payment notice. The amount may arrive as a number or as text ("115037", "115.037", "Rp 115.037,00"). */
const amount = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === "number") return v;
    const digits = v.replace(/[^\d,.]/g, "");
    // Indonesian notation: dots group thousands and a comma starts the decimals
    const normalized = digits.includes(",") ? digits.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(digits) ? digits.replace(/\./g, "") : digits;
    return Number(normalized);
  })
  .pipe(z.number().finite("nominal tidak valid").positive("nominal harus lebih dari 0").max(1e11, "nominal terlalu besar"))
  .refine((n) => Number.isInteger(n), "nominal harus rupiah utuh");

export const paymentNoticeBody = z.object({
  amount,
  reference: z.string().trim().min(1).max(80).optional(),
  source: z.string().trim().max(40).optional(),
  payer: z.string().trim().max(120).optional(),
});

export const proofBody = z.object({ fileBase64: z.string().min(40, "gambar kosong"), fileName: z.string().trim().max(120).optional(), note: z.string().trim().max(300).optional() });
export const detailParams = z.object({ type: z.enum(["topup", "order"]), id: z.coerce.number().int().positive() });
export const summaryQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });
