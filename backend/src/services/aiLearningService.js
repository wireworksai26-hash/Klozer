import { query, queryOne, transaction } from "../config/db.js";
import { conflict, notFound } from "../utils/errors.js";
import { toFulltextQuery } from "./knowledge/queryTerms.js";

/**
 * Evaluation and learning for the AI.
 *
 * The owner reviews what the assistant said, rates it, and corrects wrong answers. A correction does not retrain a
 * model: it is stored per tenant and the most relevant ones are placed in the prompt of later replies, so the very
 * next similar question is answered the way the owner corrected it. Standing instructions ("rules") are always sent.
 */

export const LEARNING_LIMITS = Object.freeze({ maxRules: 30, maxExamples: 500 });
const FEEDBACK = new Set(["good", "bad"]);

const parseJson = (v) => (typeof v === "string" ? JSON.parse(v) : v ?? null);

function correctionFromRow(r) {
  return {
    id: r.id,
    kind: r.kind,
    messageId: r.message_id,
    leadId: r.lead_id,
    customerMessage: r.customer_message,
    originalReply: r.original_reply,
    correctedReply: r.corrected_reply,
    ruleText: r.rule_text,
    note: r.note,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------------------------------------------------------------- reviewing replies
/** The customer message an AI reply answered: the last customer message in the same chat before it. */
const PREVIOUS_CUSTOMER_MESSAGE = `(SELECT c.content_text FROM chat_messages c
   WHERE c.lead_id = m.lead_id AND c.sender_type = 'customer' AND c.content_text IS NOT NULL AND c.id < m.id ORDER BY c.id DESC LIMIT 1)`;

const FILTERS = {
  all: "",
  unreviewed: "AND m.feedback IS NULL AND ac.id IS NULL",
  good: "AND m.feedback = 'good'",
  bad: "AND m.feedback = 'bad'",
  corrected: "AND ac.id IS NOT NULL",
};

/** AI replies for the owner to review, newest first. */
export async function listEvaluationFeed({ institutionId, filter = "all", page = 1, limit = 20 }) {
  const where = FILTERS[filter] ?? FILTERS.all;
  const offset = (page - 1) * limit;
  const base = `FROM chat_messages m
      JOIN leads l ON l.id = m.lead_id
      LEFT JOIN ai_corrections ac ON ac.message_id = m.id
     WHERE m.institution_id = ? AND m.sender_type = 'ai_agent' AND m.content_text IS NOT NULL ${where}`;

  const [{ total }] = await query(`SELECT COUNT(*) AS total ${base}`, [institutionId]);
  const rows = await query(
    `SELECT m.id, m.lead_id, l.name AS lead_name, l.phone_number, m.content_text AS ai_reply, m.model_used, m.meta_json, m.feedback, m.created_at,
            ${PREVIOUS_CUSTOMER_MESSAGE} AS customer_message,
            ac.id AS correction_id, ac.corrected_reply, ac.is_active AS correction_active
       ${base}
      ORDER BY m.id DESC LIMIT ? OFFSET ?`,
    [institutionId, limit, offset]
  );

  return {
    total: Number(total),
    page,
    limit,
    items: rows.map((r) => {
      const meta = parseJson(r.meta_json) || {};
      return {
        messageId: r.id,
        leadId: r.lead_id,
        leadName: r.lead_name || r.phone_number,
        customerMessage: r.customer_message,
        aiReply: r.ai_reply,
        model: r.model_used,
        sources: meta.sources || [],
        fallbackUsed: Boolean(meta.fallbackUsed),
        feedback: r.feedback,
        correction: r.correction_id ? { id: r.correction_id, correctedReply: r.corrected_reply, isActive: Boolean(r.correction_active) } : null,
        createdAt: r.created_at,
      };
    }),
  };
}

/** Counts for the evaluation dashboard over the last `days` days. */
export async function evaluationSummary({ institutionId, days = 30 }) {
  const row = await queryOne(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(m.feedback = 'good'), 0) AS good,
            COALESCE(SUM(m.feedback = 'bad'), 0) AS bad,
            COALESCE(SUM(ac.id IS NOT NULL), 0) AS corrected,
            COALESCE(SUM(m.feedback IS NULL AND ac.id IS NULL), 0) AS unreviewed
       FROM chat_messages m LEFT JOIN ai_corrections ac ON ac.message_id = m.id
      WHERE m.institution_id = ? AND m.sender_type = 'ai_agent' AND m.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`,
    [institutionId, days]
  );
  const total = Number(row.total);
  const good = Number(row.good);
  const bad = Number(row.bad);
  const reviewed = good + bad;
  const rules = await queryOne("SELECT COUNT(*) AS n FROM ai_corrections WHERE institution_id = ? AND kind = 'rule' AND is_active = 1", [institutionId]);
  const examples = await queryOne("SELECT COUNT(*) AS n FROM ai_corrections WHERE institution_id = ? AND kind = 'example' AND is_active = 1", [institutionId]);
  return {
    days,
    total,
    good,
    bad,
    corrected: Number(row.corrected),
    unreviewed: Number(row.unreviewed),
    approvalRate: reviewed ? Math.round((good / reviewed) * 100) : null,
    activeRules: Number(rules.n),
    activeExamples: Number(examples.n),
  };
}

async function aiMessage(institutionId, messageId) {
  const message = await queryOne(
    "SELECT id, lead_id, content_text FROM chat_messages WHERE id = ? AND institution_id = ? AND sender_type = 'ai_agent'",
    [messageId, institutionId]
  );
  if (!message) throw notFound("Balasan AI tidak ditemukan.");
  return message;
}

/** Rate an AI reply. `rating: null` clears the rating. */
export async function setFeedback({ institutionId, userId, messageId, rating }) {
  await aiMessage(institutionId, messageId);
  if (rating !== null && !FEEDBACK.has(rating)) throw conflict("Penilaian tidak valid.");
  await query(
    "UPDATE chat_messages SET feedback = ?, feedback_by = ?, feedback_at = IF(? IS NULL, NULL, UTC_TIMESTAMP()) WHERE id = ? AND institution_id = ?",
    [rating, rating === null ? null : userId, rating, messageId, institutionId]
  );
  return { messageId, feedback: rating };
}

// ---------------------------------------------------------------- corrections and rules
/**
 * Correct one AI reply. The correction is attached to that reply (a second correction replaces the first), the reply
 * is rated "bad", and the corrected answer starts being used for similar questions right away.
 */
export async function correctReply({ institutionId, userId, messageId, correctedReply, note = null }) {
  const message = await aiMessage(institutionId, messageId);
  const customerMessage = await queryOne(
    `SELECT content_text FROM chat_messages
      WHERE lead_id = ? AND sender_type = 'customer' AND content_text IS NOT NULL AND id < ? ORDER BY id DESC LIMIT 1`,
    [message.lead_id, message.id]
  );

  const id = await transaction(async (tx) => {
    const existing = await tx.queryOne("SELECT id FROM ai_corrections WHERE message_id = ? AND institution_id = ?", [messageId, institutionId]);
    if (!existing) {
      const count = await tx.queryOne("SELECT COUNT(*) AS n FROM ai_corrections WHERE institution_id = ? AND kind = 'example'", [institutionId]);
      if (Number(count.n) >= LEARNING_LIMITS.maxExamples) {
        throw conflict(`Batas ${LEARNING_LIMITS.maxExamples} koreksi tercapai. Hapus koreksi lama yang tidak relevan.`, { code: "CORRECTION_LIMIT" });
      }
    }
    await tx.query(
      `INSERT INTO ai_corrections (institution_id, kind, message_id, lead_id, customer_message, original_reply, corrected_reply, note, created_by)
       VALUES (?, 'example', ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE corrected_reply = VALUES(corrected_reply), note = VALUES(note), is_active = 1`,
      [institutionId, messageId, message.lead_id, customerMessage?.content_text ?? null, message.content_text, correctedReply, note, userId ?? null]
    );
    const row = await tx.queryOne("SELECT id FROM ai_corrections WHERE message_id = ? AND institution_id = ?", [messageId, institutionId]);
    await tx.query("UPDATE chat_messages SET feedback = 'bad', feedback_by = ?, feedback_at = UTC_TIMESTAMP() WHERE id = ?", [userId ?? null, messageId]);
    return row.id;
  });
  return correctionFromRow(await queryOne("SELECT * FROM ai_corrections WHERE id = ?", [id]));
}

/** A standing instruction the AI must always follow ("jangan menjanjikan stok kosong"). */
export async function createRule({ institutionId, userId, ruleText }) {
  const count = await queryOne("SELECT COUNT(*) AS n FROM ai_corrections WHERE institution_id = ? AND kind = 'rule'", [institutionId]);
  if (Number(count.n) >= LEARNING_LIMITS.maxRules) {
    throw conflict(`Batas ${LEARNING_LIMITS.maxRules} aturan tercapai. Hapus atau gabungkan aturan lama.`, { code: "RULE_LIMIT" });
  }
  const result = await query("INSERT INTO ai_corrections (institution_id, kind, rule_text, created_by) VALUES (?, 'rule', ?, ?)", [institutionId, ruleText, userId ?? null]);
  return correctionFromRow(await queryOne("SELECT * FROM ai_corrections WHERE id = ?", [result.insertId]));
}

export async function listCorrections({ institutionId, kind, page = 1, limit = 50 }) {
  const kindSql = kind ? "AND kind = ?" : "";
  const params = kind ? [institutionId, kind] : [institutionId];
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM ai_corrections WHERE institution_id = ? ${kindSql}`, params);
  const rows = await query(`SELECT * FROM ai_corrections WHERE institution_id = ? ${kindSql} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { total: Number(total), page, limit, items: rows.map(correctionFromRow) };
}

export async function updateCorrection({ institutionId, id, correctedReply, ruleText, note, isActive }) {
  const existing = await queryOne("SELECT id, kind FROM ai_corrections WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!existing) throw notFound("Koreksi tidak ditemukan.");
  const sets = [];
  const values = [];
  if (existing.kind === "example" && correctedReply !== undefined) {
    sets.push("corrected_reply = ?");
    values.push(correctedReply);
  }
  if (existing.kind === "rule" && ruleText !== undefined) {
    sets.push("rule_text = ?");
    values.push(ruleText);
  }
  if (note !== undefined) {
    sets.push("note = ?");
    values.push(note);
  }
  if (isActive !== undefined) {
    sets.push("is_active = ?");
    values.push(isActive ? 1 : 0);
  }
  if (sets.length) await query(`UPDATE ai_corrections SET ${sets.join(", ")} WHERE id = ? AND institution_id = ?`, [...values, id, institutionId]);
  return correctionFromRow(await queryOne("SELECT * FROM ai_corrections WHERE id = ?", [id]));
}

export async function deleteCorrection(institutionId, id) {
  const result = await query("DELETE FROM ai_corrections WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!result.affectedRows) throw notFound("Koreksi tidak ditemukan.");
}

// ---------------------------------------------------------------- what the AI is given
/**
 * Rules (always) and the corrections whose original question is most like the new message, for the prompt.
 * @returns {Promise<{ rules: {id:number,text:string}[], examples: {id:number,question:string,answer:string}[] }>}
 */
export async function retrieveLearning({ institutionId, text, exampleLimit = 3, ruleLimit = 15 }) {
  const rules = await query(
    "SELECT id, rule_text FROM ai_corrections WHERE institution_id = ? AND kind = 'rule' AND is_active = 1 AND rule_text IS NOT NULL ORDER BY id DESC LIMIT ?",
    [institutionId, ruleLimit]
  );

  const terms = toFulltextQuery(text);
  const examples = terms
    ? await query(
        `SELECT id, customer_message, corrected_reply, MATCH(customer_message) AGAINST(? IN NATURAL LANGUAGE MODE) AS score
           FROM ai_corrections
          WHERE institution_id = ? AND kind = 'example' AND is_active = 1 AND corrected_reply IS NOT NULL
            AND MATCH(customer_message) AGAINST(? IN NATURAL LANGUAGE MODE)
          ORDER BY score DESC, id DESC LIMIT ?`,
        [terms, institutionId, terms, exampleLimit]
      )
    : [];

  return {
    rules: rules.map((r) => ({ id: r.id, text: r.rule_text })),
    examples: examples.map((e) => ({ id: e.id, question: e.customer_message, answer: e.corrected_reply })),
  };
}
