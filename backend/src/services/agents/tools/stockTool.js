import { z } from "zod";
import { query } from "../../../config/db.js";

/** Price and stock of the shop's active products, found by name or SKU. */
export const checkStock = {
  name: "check_stock",
  schema: z.object({ query: z.string().trim().min(2, "terlalu pendek").max(80) }),
  async run({ query: text }, { institutionId }) {
    const terms = text.split(/\s+/).filter(Boolean).slice(0, 4);
    const like = (term) => `%${term.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await query(
      `SELECT name, sku, selling_price AS price, stock_quantity AS stock FROM products
        WHERE institution_id = ? AND is_active = 1 ${terms.map(() => "AND (name LIKE ? OR sku LIKE ?)").join(" ")}
        ORDER BY stock_quantity > 0 DESC, name ASC LIMIT 5`,
      [institutionId, ...terms.flatMap((t) => [like(t), like(t)])]
    );
    return {
      products: rows.map((p) => ({ name: p.name, sku: p.sku, price: Number(p.price), stock: Number(p.stock), available: Number(p.stock) > 0 })),
      note: rows.length ? "Stok bisa berubah sewaktu-waktu; jangan menjanjikan pasti kebagian." : "Tidak ada produk aktif yang cocok. Jangan mengarang produk.",
    };
  },
};
