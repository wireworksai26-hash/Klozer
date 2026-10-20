import { z } from "zod";

// Request shapes for AI token top ups.

const note = z.string().trim().max(300, "maksimal 300 karakter");

const voucherCode = z.string().trim().max(30, "maksimal 30 karakter").optional().transform((v) => (v ? v : undefined));

export const priceQuery = z.object({ tokens: z.coerce.number().int("harus bilangan bulat"), voucher: voucherCode });

export const createTopupBody = z.object({
  tokens: z.coerce.number().int("harus bilangan bulat"),
  voucher: voucherCode,
  note: note.optional().transform((v) => (v ? v : undefined)),
});

export const paidTopupBody = z.object({ reference: note.optional().transform((v) => (v ? v : undefined)) });

export const quoteTopupBody = z.object({
  amountIdr: z.coerce.number().positive("harus lebih dari 0").max(1e10, "nilai terlalu besar"),
  note: note.optional().transform((v) => (v ? v : undefined)),
});

export const topupListQuery = z.object({
  status: z.enum(["requested", "quoted", "credited", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const grantTokensBody = z.object({
  institutionId: z.coerce.number().int().positive("pilih toko"),
  tokens: z.coerce.number().int("harus bilangan bulat"),
  reason: z.string().trim().min(3, "tulis alasannya").max(300, "maksimal 300 karakter"),
});
