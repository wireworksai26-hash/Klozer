import { z } from "zod";
import { LANGUAGES, MAX_BUTTONS } from "../services/broadcast/templateModel.js";
import { LEAD_FIELDS } from "../services/broadcast/variableMapper.js";
import { LEAD_STATUSES } from "../services/broadcast/audience.js";

// Request shapes for templates, campaigns, consent and ads.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const id = z.number().int().positive();
const hasChange = (v) => Object.values(v).some((x) => x !== undefined);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "format tanggal YYYY-MM-DD");
const httpsUrl = z.string().trim().max(500).regex(/^https:\/\/\S+$/, "harus berupa alamat https://");

// ---------------------------------------------------------------- templates
export const createTemplateBody = z.object({
  channelId: id,
  name: z.string().regex(/^[a-z0-9_]{1,100}$/, "hanya huruf kecil, angka, dan garis bawah"),
  language: z.enum(Object.keys(LANGUAGES)),
  category: z.enum(["marketing", "utility"]),
  body: text(1024),
  bodyExamples: z.array(text(100)).max(20).optional(),
  headerText: text(60).optional(),
  headerExample: text(60).optional(),
  footer: text(60).optional(),
  buttons: z
    .array(z.object({ type: z.enum(["quick_reply", "url"]), text: text(25), url: httpsUrl.optional() }))
    .max(MAX_BUTTONS)
    .optional(),
});

export const syncTemplatesBody = z.object({ channelId: id });
export const listTemplatesQuery = z.object({ status: z.enum(["draft", "pending", "approved", "rejected", "paused", "disabled"]).optional(), channelId: z.coerce.number().int().positive().optional() });

// ---------------------------------------------------------------- campaigns
export const audienceSchema = z
  .object({
    statuses: z.array(z.enum(LEAD_STATUSES)).max(6).optional(),
    labelIds: z.array(id).max(50).optional(),
    sources: z.array(text(80)).max(20).optional(),
    adIds: z.array(text(100)).max(50).optional(),
    cities: z.array(text(100)).max(50).optional(),
    orders: z.enum(["never", "has_order", "has_paid_order"]).nullable().optional(),
    quietForDays: z.number().int().min(1).max(3650).optional(),
    activeWithinDays: z.number().int().min(1).max(3650).optional(),
    onlyThisNumber: z.boolean().optional(),
  })
  .default({});

const variableSpec = z.union([
  z.object({ type: z.literal("text"), value: text(200) }),
  z.object({ type: z.literal("field"), field: z.enum(LEAD_FIELDS), fallback: text(100).optional() }),
]);

export const createCampaignBody = z.object({
  name: text(150),
  channelId: id,
  templateId: id,
  audience: audienceSchema,
  variables: z.array(variableSpec).max(20).default([]),
  headerMediaUrl: httpsUrl.optional(),
});

export const previewAudienceBody = z.object({ channelId: id, templateId: id, audience: audienceSchema });

export const launchCampaignBody = z.object({ scheduledAt: z.string().datetime({ offset: true }).optional() });

export const testSendBody = z.object({
  channelId: id,
  templateId: id,
  phone: z.string().trim().regex(/^[0-9+\s-]{9,20}$/, "nomor tidak valid"),
  variables: z.array(variableSpec).max(20).default([]),
  headerMediaUrl: httpsUrl.optional(),
});

export const listRecipientsQuery = z.object({
  status: z.enum(["pending", "sending", "sent", "delivered", "read", "failed", "skipped"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const updateBroadcastSettingsBody = z
  .object({
    dailyLimit: z.number().int().min(1).max(1_000_000),
    frequencyCapDays: z.number().int().min(0).max(90),
    quietStartHour: z.number().int().min(0).max(23),
    quietEndHour: z.number().int().min(0).max(23),
  })
  .partial()
  .refine(hasChange, "tidak ada yang diubah");

// ---------------------------------------------------------------- consent
export const setConsentBody = z.object({ state: z.enum(["unknown", "opted_in", "opted_out"]), source: text(160).optional() });

export const importConsentBody = z.object({
  phones: z.array(z.string().trim().min(5).max(30)).min(1).max(5000),
  state: z.enum(["opted_in", "opted_out"]).default("opted_in"),
  source: text(160),
  attested: z.boolean().optional(),
});

// ---------------------------------------------------------------- ads
const spendRow = z.object({
  date: day,
  adId: text(100).optional(),
  campaignId: text(100).optional(),
  adName: text(200).optional(),
  campaignName: text(200).optional(),
  spend: z.number().min(0).max(100_000_000_000),
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
});

export const upsertSpendBody = z.object({ rows: z.array(spendRow).min(1).max(1000) });

export const listSpendQuery = z.object({ from: day.optional(), to: day.optional(), limit: z.coerce.number().int().min(1).max(500).optional(), offset: z.coerce.number().int().min(0).optional() });

export const adsSettingsBody = z.object({
  adAccountId: z.string().trim().regex(/^(act_)?\d{5,25}$/, "ID akun iklan berupa angka (boleh diawali act_)"),
  accessToken: text(2000, 10),
});

export const syncAdsBody = z.object({ days: z.number().int().min(1).max(90).default(30) });

export const roasQuery = z.object({ from: day.optional(), to: day.optional(), groupBy: z.enum(["ad", "campaign", "day"]).optional() });
