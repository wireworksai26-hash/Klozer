import { queryOne, query } from "../config/db.js";
import { audit } from "../services/auditService.js";

/** GET /ai/persona */
export async function getPersona(req, res) {
  const row = await queryOne("SELECT ai_persona_json FROM institutions WHERE id = ?", [req.tenantId]);
  res.json({ success: true, persona: row?.ai_persona_json || {} });
}

/** PUT /ai/persona — replaces the stored persona (unknown keys are dropped by validation). */
export async function updatePersona(req, res) {
  await query("UPDATE institutions SET ai_persona_json = ? WHERE id = ?", [JSON.stringify(req.body), req.tenantId]);
  await audit(req, "ai.persona_update");
  res.json({ success: true, message: "Persona AI tersimpan.", persona: req.body });
}
