import { z } from "zod";

// Request shapes for the payment methods Klozer itself is paid with.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const optional = (max) => z.string().trim().max(max, `maksimal ${max} karakter`).transform((v) => (v === "" ? null : v)).nullable();
const hasChange = (v) => Object.values(v).some((x) => x !== undefined);

const fields = {
  label: text(80, 2),
  accountName: optional(120),
  accountNumber: optional(60),
  instructions: optional(300),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
};

export const createMethodBody = z.object({
  kind: z.enum(["qris", "bank", "ewallet"]),
  label: fields.label,
  accountName: fields.accountName.optional(),
  accountNumber: fields.accountNumber.optional(),
  instructions: fields.instructions.optional(),
  sortOrder: fields.sortOrder.optional(),
  isActive: fields.isActive.optional(),
});

export const updateMethodBody = z.object(fields).partial().refine(hasChange, "tidak ada yang diubah");

export const qrisImageBody = z.object({ fileBase64: z.string().min(40, "gambar kosong"), fileName: z.string().trim().max(120).optional() });

export const qrisCodeBody = z.object({ payload: z.string().trim().min(40, "kode terlalu pendek").max(700, "kode terlalu panjang") });
