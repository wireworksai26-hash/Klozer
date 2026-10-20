import { z } from "zod";
import { ROUTING_MODES } from "../services/routing/assignmentPolicy.js";
import { CONNECTABLE_CHANNEL_TYPES } from "../services/channels/channelPlans.js";

// Request shapes for channels, routing and hand-off endpoints.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const hasChange = (v) => Object.values(v).some((x) => x !== undefined);

// ---------------------------------------------------------------- channels
// How the web chat widget looks and where it may be embedded.
const webchatConfig = z.object({
  title: text(60).optional(),
  welcomeMessage: text(300).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "warna harus berformat #RRGGBB").optional(),
  allowedOrigins: z.array(z.string().regex(/^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/, "isi dengan alamat situs, mis. https://tokoanda.com")).max(20).optional(),
});

// What a tenant has to provide differs per platform; the rest is read from the platform when connecting.
const REQUIRED_FIELDS = {
  whatsapp: ["externalId", "accessToken"],
  messenger: ["pageId", "accessToken"],
  instagram: ["pageId", "accessToken"],
  telegram: ["accessToken"],
  webchat: [],
};

export const createChannelBody = z
  .object({
    type: z.enum(CONNECTABLE_CHANNEL_TYPES),
    name: text(80),
    externalId: z.string().trim().regex(/^[A-Za-z0-9_.-]{3,100}$/, "ID akun tidak valid").optional(),
    pageId: z.string().trim().regex(/^\d{5,30}$/, "ID Halaman Facebook harus berupa angka").optional(),
    wabaId: z.string().trim().regex(/^\d{5,30}$/, "ID WhatsApp Business Account harus berupa angka").optional(),
    displayHandle: text(100).nullable().optional(),
    accessToken: text(2000, 10).optional(),
    aiEnabled: z.boolean().optional(),
    config: webchatConfig.optional(),
  })
  .superRefine((body, ctx) => {
    for (const field of REQUIRED_FIELDS[body.type] || []) {
      if (!body[field]) ctx.addIssue({ code: "custom", path: [field], message: "wajib diisi untuk jenis kanal ini" });
    }
    if (body.config && body.type !== "webchat") ctx.addIssue({ code: "custom", path: ["config"], message: "hanya untuk live chat website" });
    if (body.wabaId && body.type !== "whatsapp") ctx.addIssue({ code: "custom", path: ["wabaId"], message: "hanya untuk WhatsApp" });
  });

export const updateChannelBody = z
  .object({
    name: text(80).optional(),
    displayHandle: text(100).nullable().optional(),
    accessToken: text(2000, 10).optional(),
    aiEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    config: webchatConfig.optional(),
    wabaId: z.string().trim().regex(/^\d{5,30}$/, "ID WhatsApp Business Account harus berupa angka").optional(),
  })
  .refine(hasChange, "tidak ada yang diubah");

// ---------------------------------------------------------------- routing and hand-off
export const updateRoutingBody = z
  .object({
    mode: z.enum(ROUTING_MODES).optional(),
    onlineOnly: z.boolean().optional(),
    maxOpenChats: z.number().int().min(1).max(500).optional(),
    humanHoldMinutes: z.number().int().min(1).max(1440).optional(),
    // null goes back to the built-in list
    handoffKeywords: z.array(text(60, 2)).max(100).nullable().optional(),
  })
  .refine(hasChange, "tidak ada yang diubah");

export const assignLeadBody = z.object({ userId: z.number().int().positive().nullable() });

export const availabilityBody = z.object({ available: z.boolean() });

// ---------------------------------------------------------------- public web chat widget
export const webchatParams = z.object({ key: z.string().regex(/^wc_[a-f0-9]{24}$/, "kunci tidak valid") });

export const webchatMessageBody = z.object({
  text: text(1000),
  clientMessageId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "id pesan tidak valid"),
  name: text(80).optional(),
});

export const webchatPollQuery = z.object({ after: z.coerce.number().int().min(0).optional() });
