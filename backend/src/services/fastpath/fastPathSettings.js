import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { DEFAULT_TOPICS, FAST_TOPICS } from "./fastPathModel.js";

/** The shop's fast path switches and the opening hours it states (database only, so the assistant can read the hours too). */

export const MAX_STORE_HOURS = 300;

export async function getFastPathSettings(institutionId) {
  const row = await queryOne("SELECT * FROM fast_path_settings WHERE institution_id = ?", [institutionId]);
  if (!row) return { enabled: true, topics: { ...DEFAULT_TOPICS }, storeHours: null };
  return { enabled: Boolean(row.enabled), topics: { ...DEFAULT_TOPICS, ...parseJsonColumn(row.topics_json) }, storeHours: row.store_hours ?? null };
}

export async function updateFastPathSettings(institutionId, patch) {
  const next = await getFastPathSettings(institutionId);
  if (patch.enabled !== undefined) next.enabled = patch.enabled;
  if (patch.topics) for (const topic of FAST_TOPICS) if (patch.topics[topic] !== undefined) next.topics[topic] = Boolean(patch.topics[topic]);
  if (patch.storeHours !== undefined) next.storeHours = patch.storeHours || null;
  await query(
    `INSERT INTO fast_path_settings (institution_id, enabled, topics_json, store_hours) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), topics_json = VALUES(topics_json), store_hours = VALUES(store_hours)`,
    [institutionId, next.enabled ? 1 : 0, JSON.stringify(next.topics), next.storeHours]
  );
  return getFastPathSettings(institutionId);
}

