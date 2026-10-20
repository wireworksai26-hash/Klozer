import { queryOne } from "../config/db.js";
import { parseJsonColumn } from "../utils/jsonColumn.js";

/**
 * Package switches (institutions.features_json) for code that runs outside a request, such as the AI's replies and
 * background jobs. Same rule as the route gate: a feature is on unless it is explicitly set to false.
 */
export async function tenantFeatures(institutionId) {
  const inst = await queryOne("SELECT features_json FROM institutions WHERE id = ?", [institutionId]);
  return parseJsonColumn(inst?.features_json);
}

export async function isFeatureOn(institutionId, flag) {
  return (await tenantFeatures(institutionId))[flag] !== false;
}
