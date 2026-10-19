import { query } from "../../config/db.js";

/**
 * The tenant's active products as a map by id, with what the order flow needs: price, stock, weight.
 * Order totals are always computed from this (and re-read under lock when the order is placed).
 * @returns {Promise<Map<number, { id: number, name: string, category: string|null, price: number, stock: number, weightGrams: number }>>}
 */
export async function loadCatalog(institutionId, { limit = 150 } = {}) {
  const rows = await query(
    `SELECT id, name, category, selling_price, stock_quantity, weight_in_grams
       FROM products WHERE institution_id = ? AND is_active = 1 ORDER BY id DESC LIMIT ?`,
    [institutionId, limit]
  );
  return new Map(
    rows.map((r) => [r.id, { id: r.id, name: r.name, category: r.category, price: Number(r.selling_price), stock: Number(r.stock_quantity), weightGrams: Number(r.weight_in_grams) || 200 }])
  );
}
