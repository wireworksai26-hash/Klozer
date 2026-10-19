import { z } from "zod";
import { ROUTING_MODES } from "../services/routing/assignmentPolicy.js";
import { CONNECTABLE_CHANNEL_TYPES } from "../services/channels/channelPlans.js";

// Request shapes for channels, routing and hand-off endpoints.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const hasChange = (v) => Object.values(v).some((x) => x !== undefined);

// ---------------------------------------------------------------- channels
export const createChannelBody = z.object({
  type: z.enum(CONNECTABLE_CHANNEL_TYPES),
  name: text(100),
  externalId: z.string().trim().regex(/^[A-Za-z0-9_.-]{3,100}$/, "ID akun tidak valid"),
  displayHandle: text(100).nullable().optional(),
  accessToken: text(2000, 10),
  aiEnabled: z.boolean().optional(),
});

export const updateChannelBody = z
  .object({
    name: text(100).optional(),
    displayHandle: text(100).nullable().optional(),
    accessToken: text(2000, 10).optional(),
    aiEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
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
