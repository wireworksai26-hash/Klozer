import { z } from "zod";

// Request shapes for the knowledge base and AI evaluation endpoints.

const text = (max, min = 1) => z.string().trim().min(min, "wajib diisi").max(max, `maksimal ${max} karakter`);
const optionalText = (max) => z.string().trim().max(max, `maksimal ${max} karakter`).optional();
const page = z.coerce.number().int().min(1).max(100000).optional();
const pageSize = (max) => z.coerce.number().int().min(1).max(max).optional();

// ---------------------------------------------------------------- knowledge base
export const KNOWLEDGE_TEXT_MAX = 400_000;
const MIN_DOCUMENT_CHARS = 10;

export const createKnowledgeTextBody = z.object({
  title: text(200),
  content: text(KNOWLEDGE_TEXT_MAX, MIN_DOCUMENT_CHARS),
});

export const createKnowledgeFileBody = z.object({
  fileName: text(255),
  title: optionalText(200),
  contentBase64: z
    .string()
    .min(8, "berkas kosong")
    .max(7_500_000, "berkas terlalu besar (maksimal 5 MB)")
    .regex(/^(?:data:[^;]+;base64,)?[A-Za-z0-9+/=\s]+$/, "bukan data base64 yang valid"),
});

export const updateKnowledgeBody = z
  .object({
    title: text(200).optional(),
    content: text(KNOWLEDGE_TEXT_MAX, MIN_DOCUMENT_CHARS).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "tidak ada yang diubah");

export const knowledgeSearchBody = z.object({ query: text(500) });

// ---------------------------------------------------------------- AI evaluation and learning
export const evaluationQuery = z.object({
  filter: z.enum(["all", "unreviewed", "good", "bad", "corrected"]).optional(),
  page,
  limit: pageSize(50),
});

export const evaluationSummaryQuery = z.object({ days: z.coerce.number().int().min(1).max(365).optional() });

export const feedbackBody = z.object({ rating: z.enum(["good", "bad"]).nullable() });

export const correctReplyBody = z.object({
  correctedReply: text(1500),
  note: optionalText(500),
});

export const createRuleBody = z.object({ ruleText: text(300, 5) });

export const updateCorrectionBody = z
  .object({
    correctedReply: text(1500).optional(),
    ruleText: text(300, 5).optional(),
    note: optionalText(500),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "tidak ada yang diubah");

export const correctionsQuery = z.object({
  kind: z.enum(["example", "rule"]).optional(),
  page,
  limit: pageSize(100),
});
