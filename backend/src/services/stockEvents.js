import { query } from "../config/db.js";
import { logger } from "../config/logger.js";
import { emitToTenant } from "../realtime.js";

/**
 * Tell every open dashboard of a shop that stock changed, so the catalog, the CRM and the order screens show the new
 * number without a refresh. Called after the change has committed, whoever made it: a person, the chat assistant
 * taking an order, the public API, or the system releasing an unpaid order. Never throws and never blocks the caller.
 */

/** Product ids whose stock just changed. Reads the current numbers, so the event always carries the truth. */
export async function announceStock(institutionId, productIds) {
  try {
    const ids = [...new Set((productIds ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (!ids.length) return;
    const rows = await query("SELECT id, sku, name, stock_quantity, low_stock_threshold FROM products WHERE institution_id = ? AND id IN (?)", [institutionId, ids]);
    if (!rows.length) return;
    emitToTenant(institutionId, "stock:changed", {
      products: rows.map((p) => ({ id: p.id, sku: p.sku, name: p.name, stock: Number(p.stock_quantity), lowStockThreshold: Number(p.low_stock_threshold) })),
    });
  } catch (err) {
    logger.warn({ err: err.message, institutionId }, "Stock change was not announced");
  }
}

/** An order appeared or changed status: dashboards refetch their order lists. */
export function announceOrder(institutionId, event, order) {
  emitToTenant(institutionId, event, order);
}

/** Same as announceStock for a list of SKUs (imports and edits that know SKUs, not ids). */
export async function announceStockBySku(institutionId, skus) {
  try {
    const list = [...new Set((skus ?? []).filter(Boolean))];
    if (!list.length) return;
    const rows = await query("SELECT id FROM products WHERE institution_id = ? AND sku IN (?)", [institutionId, list]);
    await announceStock(institutionId, rows.map((r) => r.id));
  } catch (err) {
    logger.warn({ err: err.message, institutionId }, "Stock change was not announced");
  }
}
