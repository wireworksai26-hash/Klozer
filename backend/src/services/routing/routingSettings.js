import { query, queryOne } from "../../config/db.js";
import { DEFAULT_HANDOFF_KEYWORDS } from "../handoff/handoffPolicy.js";

/** How a tenant shares conversations among its agents, with defaults for tenants that never changed anything. */
export const ROUTING_DEFAULTS = Object.freeze({
  mode: "least_busy",
  onlineOnly: true,
  maxOpenChats: 20,
  humanHoldMinutes: 30,
});

const parseJson = (v) => (typeof v === "string" ? JSON.parse(v) : v ?? null);

function fromRow(row) {
  const custom = row ? parseJson(row.handoff_keywords) : null;
  return {
    mode: row?.mode ?? ROUTING_DEFAULTS.mode,
    onlineOnly: row ? Boolean(row.online_only) : ROUTING_DEFAULTS.onlineOnly,
    maxOpenChats: row ? Number(row.max_open_chats) : ROUTING_DEFAULTS.maxOpenChats,
    humanHoldMinutes: row ? Number(row.human_hold_minutes) : ROUTING_DEFAULTS.humanHoldMinutes,
    handoffKeywords: Array.isArray(custom) ? custom : [...DEFAULT_HANDOFF_KEYWORDS],
    handoffKeywordsCustom: Array.isArray(custom),
  };
}

export async function getRoutingSettings(institutionId) {
  return fromRow(await queryOne("SELECT * FROM routing_settings WHERE institution_id = ?", [institutionId]));
}

/**
 * Save changes. A field left undefined keeps its value; `handoffKeywords: null` goes back to the built-in list.
 */
export async function updateRoutingSettings(institutionId, patch) {
  const current = await getRoutingSettings(institutionId);
  const next = {
    mode: patch.mode ?? current.mode,
    onlineOnly: patch.onlineOnly ?? current.onlineOnly,
    maxOpenChats: patch.maxOpenChats ?? current.maxOpenChats,
    humanHoldMinutes: patch.humanHoldMinutes ?? current.humanHoldMinutes,
  };
  const keywords = patch.handoffKeywords === undefined ? (current.handoffKeywordsCustom ? current.handoffKeywords : null) : patch.handoffKeywords;

  await query(
    `INSERT INTO routing_settings (institution_id, mode, online_only, max_open_chats, human_hold_minutes, handoff_keywords)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE mode = VALUES(mode), online_only = VALUES(online_only), max_open_chats = VALUES(max_open_chats),
                             human_hold_minutes = VALUES(human_hold_minutes), handoff_keywords = VALUES(handoff_keywords)`,
    [institutionId, next.mode, next.onlineOnly ? 1 : 0, next.maxOpenChats, next.humanHoldMinutes, keywords === null ? null : JSON.stringify(keywords)]
  );
  return getRoutingSettings(institutionId);
}
