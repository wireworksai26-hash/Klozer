import { audit } from "../services/auditService.js";
import {
  correctReply,
  createRule,
  deleteCorrection,
  evaluationSummary,
  listCorrections,
  listEvaluationFeed,
  setFeedback,
  updateCorrection,
} from "../services/aiLearningService.js";

/** GET /ai/evaluation: AI replies to review, newest first. */
export async function feed(req, res) {
  const { filter, page, limit } = req.query;
  res.json({ success: true, ...(await listEvaluationFeed({ institutionId: req.tenantId, filter, page, limit })) });
}

/** GET /ai/evaluation/summary */
export async function summary(req, res) {
  res.json({ success: true, ...(await evaluationSummary({ institutionId: req.tenantId, days: req.query.days })) });
}

/** POST /ai/evaluation/:id/feedback: rate a reply, or clear the rating with { rating: null }. */
export async function feedback(req, res) {
  res.json({ success: true, ...(await setFeedback({ institutionId: req.tenantId, userId: req.user.id, messageId: req.params.id, rating: req.body.rating })) });
}

/** POST /ai/evaluation/:id/correct: the answer the AI should have given. Used for similar questions from now on. */
export async function correct(req, res) {
  const data = await correctReply({
    institutionId: req.tenantId,
    userId: req.user.id,
    messageId: req.params.id,
    correctedReply: req.body.correctedReply,
    note: req.body.note ?? null,
  });
  await audit(req, "ai.correction_saved", { entityType: "ai_correction", entityId: data.id, metadata: { messageId: req.params.id } });
  res.status(201).json({ success: true, message: "Koreksi tersimpan. AI akan memakainya untuk pertanyaan serupa.", data });
}

/** GET /ai/corrections */
export async function corrections(req, res) {
  const { kind, page, limit } = req.query;
  res.json({ success: true, ...(await listCorrections({ institutionId: req.tenantId, kind, page, limit })) });
}

/** POST /ai/rules: a standing instruction for every reply. */
export async function rule(req, res) {
  const data = await createRule({ institutionId: req.tenantId, userId: req.user.id, ruleText: req.body.ruleText });
  await audit(req, "ai.rule_created", { entityType: "ai_correction", entityId: data.id });
  res.status(201).json({ success: true, message: "Aturan tersimpan. AI akan selalu mengikutinya.", data });
}

/** PUT /ai/corrections/:id */
export async function update(req, res) {
  const { correctedReply, ruleText, note, isActive } = req.body;
  const data = await updateCorrection({ institutionId: req.tenantId, id: req.params.id, correctedReply, ruleText, note, isActive });
  await audit(req, "ai.correction_updated", { entityType: "ai_correction", entityId: req.params.id, metadata: Object.keys(req.body) });
  res.json({ success: true, data });
}

/** DELETE /ai/corrections/:id */
export async function remove(req, res) {
  await deleteCorrection(req.tenantId, req.params.id);
  await audit(req, "ai.correction_deleted", { entityType: "ai_correction", entityId: req.params.id });
  res.json({ success: true, message: "Koreksi dihapus." });
}
