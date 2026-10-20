import { z } from "zod";

// Request shapes for the discount codes the Klozer team gives to its clients.

const hasChange = (v) => Object.values(v).some((x) => x !== undefined);
const optionalText = (max) => z.string().trim().max(max, `maksimal ${max} karakter`).transform((v) => (v === "" ? null : v)).nullable();
const when = z.string().datetime({ offset: true, message: "tanggal tidak valid" }).nullable();

const code = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "3 sampai 30 huruf besar, angka, strip atau garis bawah"));

const fields = {
  description: optionalText(200),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive("harus lebih dari 0").max(1e9, "nilai terlalu besar"),
  maxDiscountIdr: z.number().positive("harus lebih dari 0").max(1e9, "nilai terlalu besar").nullable(),
  minTokens: z.number().int().positive("harus lebih dari 0").max(100_000_000).nullable(),
  institutionId: z.number().int().positive().nullable(),
  maxUses: z.number().int().positive("minimal 1").max(1_000_000).nullable(),
  perShopLimit: z.number().int().min(1, "minimal 1").max(1000),
  validFrom: when,
  validUntil: when,
  isActive: z.boolean(),
};

export const createVoucherBody = z.object({
  code,
  description: fields.description.optional(),
  discountType: fields.discountType,
  discountValue: fields.discountValue,
  maxDiscountIdr: fields.maxDiscountIdr.optional(),
  minTokens: fields.minTokens.optional(),
  institutionId: fields.institutionId.optional(),
  maxUses: fields.maxUses.optional(),
  perShopLimit: fields.perShopLimit.optional(),
  validFrom: fields.validFrom.optional(),
  validUntil: fields.validUntil.optional(),
  isActive: fields.isActive.optional(),
});

export const updateVoucherBody = z.object(fields).partial().strict().refine(hasChange, "tidak ada yang diubah");

export const voucherListQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).optional(), offset: z.coerce.number().int().min(0).optional() });
