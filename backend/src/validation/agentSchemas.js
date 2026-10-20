import { z } from "zod";
import { COMMERCE_MODES, INTENTS } from "../services/agents/agentModel.js";
import { LEAD_STATUSES } from "../services/broadcast/audience.js";
import { TOOL_NAMES } from "../services/agents/tools/toolCatalog.js";

// Request shapes for AI agents and their routing.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const id = z.number().int().positive();
const hasChange = (v) => Object.values(v).some((x) => x !== undefined);

const triggers = z
  .object({
    channels: z.array(z.enum(["whatsapp", "messenger", "instagram", "telegram", "webchat"])).max(5),
    keywords: z.array(text(60)).max(50),
    intents: z.array(z.enum(INTENTS)).max(INTENTS.length),
    labelIds: z.array(id).max(30),
    leadStatuses: z.array(z.enum(LEAD_STATUSES)).max(6),
    newContact: z.boolean().nullable(),
    hasOpenOrder: z.boolean().nullable(),
  })
  .partial();

const capabilities = z.object({ commerce: z.enum(COMMERCE_MODES), tools: z.array(z.enum(TOOL_NAMES)).max(TOOL_NAMES.length) }).partial();

const fields = {
  name: text(80),
  description: text(300, 10),
  instructions: text(2000, 10),
  botName: text(60).nullable(),
  tone: text(200).nullable(),
  greeting: text(300).nullable(),
  capabilities,
  triggers,
  priority: z.number().int().min(0).max(1000),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  knowledgeDocumentIds: z.array(id).max(50),
};

export const createAgentBody = z.object({ name: fields.name, description: fields.description, instructions: fields.instructions, ...Object.fromEntries(Object.entries(fields).slice(3).map(([k, v]) => [k, v.optional()])) });

export const updateAgentBody = z.object(fields).partial().refine(hasChange, "tidak ada yang diubah");

export const updateAgentSettingsBody = z
  .object({ routerMode: z.enum(["rules", "smart"]), switchConfidence: z.number().int().min(50).max(95), announceSwitch: z.boolean() })
  .partial()
  .refine(hasChange, "tidak ada yang diubah");

export const routePreviewBody = z.object({
  text: text(1000),
  channelType: z.enum(["whatsapp", "messenger", "instagram", "telegram", "webchat"]).optional(),
  currentAgentId: id.nullable().optional(),
  leadStatus: z.enum(LEAD_STATUSES).optional(),
  isNewContact: z.boolean().optional(),
  hasOpenOrder: z.boolean().optional(),
  orderInProgress: z.boolean().optional(),
  labelIds: z.array(id).max(30).optional(),
});

export const setConversationAgentBody = z.object({ agentId: id.nullable(), pinned: z.boolean().optional() });

export const toolCallsQuery = z.object({
  leadId: z.coerce.number().int().positive().optional(),
  agentId: z.coerce.number().int().positive().optional(),
  tool: z.enum(TOOL_NAMES).optional(),
  ok: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const routingLogQuery = z.object({ leadId: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().min(1).max(200).optional(), offset: z.coerce.number().int().min(0).optional() });
