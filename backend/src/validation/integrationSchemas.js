import { z } from "zod";
import { SCOPE_NAMES } from "../services/integrations/apiKeys.js";
import { LEAD_STATUSES } from "../services/broadcast/audience.js";

// Request shapes for API keys, webhooks and the public API.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const id = z.number().int().positive();
const hasChange = (v) => Object.values(v).some((x) => x !== undefined);
const pageNumber = z.coerce.number().int().min(1).max(100000).optional();
const pageSize = (max) => z.coerce.number().int().min(1).max(max).optional();

// ---------------------------------------------------------------- dashboard: keys and webhooks
export const createApiKeyBody = z.object({
  name: text(100),
  scopes: z.array(z.enum(SCOPE_NAMES)).min(1, "pilih minimal satu cakupan").max(SCOPE_NAMES.length),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const createWebhookBody = z.object({
  name: text(100),
  url: text(500),
  events: z.array(text(60)).min(1, "pilih minimal satu event").max(40),
});

export const updateWebhookBody = z
  .object({ name: text(100), url: text(500), events: z.array(text(60)).min(1).max(40), isActive: z.boolean() })
  .partial()
  .refine(hasChange, "tidak ada yang diubah");

export const listDeliveriesQuery = z.object({ status: z.enum(["pending", "sending", "delivered", "failed", "dead"]).optional(), limit: pageSize(200), offset: z.coerce.number().int().min(0).optional() });

// ---------------------------------------------------------------- public API
const phone = z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,19}$/, "nomor telepon tidak valid");
const contactRef = { contactId: id.optional(), phone: phone.optional() };
const needsContact = (v) => v.contactId !== undefined || v.phone !== undefined;

export const openContactsQuery = z.object({
  search: text(100).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  consent: z.enum(["unknown", "opted_in", "opted_out"]).optional(),
  page: pageNumber,
  limit: pageSize(100),
});

export const openUpsertContactBody = z.object({ phone, name: text(150).optional(), city: text(100).optional(), status: z.enum(LEAD_STATUSES).optional(), notes: text(2000).optional() });

export const openPatchContactBody = z.object({ name: text(150), city: text(100), status: z.enum(LEAD_STATUSES), notes: text(2000) }).partial().refine(hasChange, "tidak ada yang diubah");

export const openConsentBody = z.object({ state: z.enum(["unknown", "opted_in", "opted_out"]), source: text(160) });

export const openMessagesQuery = z.object({ limit: pageSize(100), before: z.coerce.number().int().positive().optional() });

export const openSendMessageBody = z.object({ ...contactRef, text: text(2000), transactional: z.boolean().optional() }).refine(needsContact, "isi contactId atau phone");

export const openSendTemplateBody = z
  .object({
    ...contactRef,
    templateId: id,
    variables: z.array(text(200)).max(20).default([]),
    headerMediaUrl: z.string().trim().max(500).regex(/^https:\/\/\S+$/, "harus berupa alamat https://").optional(),
    transactional: z.boolean().optional(),
  })
  .refine(needsContact, "isi contactId atau phone");

export const openOrdersQuery = z.object({
  status: z.enum(["waiting_payment", "paid", "processing", "shipped", "delivered", "completed", "cancelled"]).optional(),
  since: z.string().datetime({ offset: true }).optional(),
  page: pageNumber,
  limit: pageSize(100),
});

export const openCreateOrderBody = z
  .object({
    ...contactRef,
    name: text(150).optional(),
    items: z.array(z.object({ productId: id, quantity: z.number().int().min(1).max(10000) })).min(1).max(50),
    shippingFee: z.number().min(0).max(100_000_000).default(0),
    discountAmount: z.number().min(0).max(100_000_000).default(0),
    paymentMethod: z.enum(["qris", "va", "bank_transfer", "cod"]).default("bank_transfer"),
    fulfillmentType: z.enum(["delivery", "pickup"]).default("delivery"),
    notes: text(1000).optional(),
  })
  .refine(needsContact, "isi contactId atau phone");

export const openProductsQuery = z.object({ search: text(100).optional(), page: pageNumber, limit: pageSize(100) });
