import { queryOne, query } from "../config/db.js";
import { logger } from "../config/logger.js";
import { audit } from "../services/auditService.js";
import { callWithFallback } from "../services/aiBrainService.js";
import { buildPersonaPrompt, parsePersonaAnswer } from "../services/personaGenerator.js";
import { assertTokenQuota, estimateTokens, recordTokenUsage } from "../services/tokenService.js";
import { parseJsonColumn } from "../utils/jsonColumn.js";
import { AppError, serviceUnavailable } from "../utils/errors.js";

/** GET /ai/persona */
export async function getPersona(req, res) {
  const row = await queryOne("SELECT ai_persona_json FROM institutions WHERE id = ?", [req.tenantId]);
  res.json({ success: true, persona: parseJsonColumn(row?.ai_persona_json) });
}

/** PUT /ai/persona — replaces the stored persona (unknown keys are dropped by validation). */
export async function updatePersona(req, res) {
  await query("UPDATE institutions SET ai_persona_json = ? WHERE id = ?", [JSON.stringify(req.body), req.tenantId]);
  await audit(req, "ai.persona_update");
  res.json({ success: true, message: "Persona AI tersimpan.", persona: req.body });
}

/**
 * POST /ai/persona/generate — the model drafts a persona from the shop's profile and a few words from the owner.
 * Nothing is saved: the draft fills the form and the owner saves it after reading it. Costs tokens, like any AI call.
 */
export async function generatePersona(req, res) {
  await assertTokenQuota(req.tenantId);
  const inst = await queryOne("SELECT name, mode, sector, ai_persona_json FROM institutions WHERE id = ?", [req.tenantId]);
  const products = await query("SELECT name FROM products WHERE institution_id = ? AND is_active = 1 ORDER BY id LIMIT 12", [req.tenantId]);
  const current = parseJsonColumn(inst?.ai_persona_json) || {};

  const systemPrompt = buildPersonaPrompt({ shopName: inst?.name, mode: inst?.mode, sector: inst?.sector, products, hint: req.body.hint || "", currentBotName: current.botName || "" });
  const result = await callWithFallback({ systemPrompt, userMessage: "Susun persona untuk toko ini sekarang.", temperature: 0.8, maxTokens: 900 });
  if (!result) throw serviceUnavailable("AI sedang tidak tersedia. Coba lagi sebentar, atau pilih salah satu contoh persona.", { code: "AI_UNAVAILABLE" });

  const tokens = await recordTokenUsage({
    institutionId: req.tenantId,
    userId: req.user.id,
    model: result.model || "unknown",
    usageType: "persona_generate",
    promptTokens: result.usage?.promptTokens ?? estimateTokens(systemPrompt),
    completionTokens: result.usage?.completionTokens ?? estimateTokens(result.text || ""),
    latencyMs: result.latencyMs ?? 0,
  }).catch((err) => {
    logger.warn({ err: err.message }, "Persona draft token usage not recorded");
    return null;
  });

  const persona = parsePersonaAnswer(result.text);
  if (!persona) throw new AppError(502, "AI belum menghasilkan persona yang bisa dipakai. Coba lagi, atau tambahkan arahan yang lebih jelas.", { code: "PERSONA_UNUSABLE" });

  await audit(req, "ai.persona_generate", { metadata: { tokens: tokens?.totalTokens ?? null } });
  res.json({ success: true, data: persona, usedTokens: tokens?.totalTokens ?? null });
}
