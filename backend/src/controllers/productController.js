import { query, queryOne, transaction } from "../config/db.js";
import { buildPagination, escapeLike, parsePagination } from "../utils/helpers.js";
import { badRequest, notFound } from "../utils/errors.js";
import { audit } from "../services/auditService.js";

const UPDATABLE = [
  "sku",
  "name",
  "category",
  "description",
  "image_url",
  "selling_price",
  "cost_price_hpp",
  "stock_quantity",
  "low_stock_threshold",
  "weight_in_grams",
  "is_active",
];

/** GET /products — always scoped to the caller's tenant. */
export async function getProducts(req, res) {
  const paging = parsePagination(req.query, { defaultLimit: 50 });
  const where = [];
  const params = [];

  const crossTenant = req.user.role === "superadmin" && req.query.all === "true";
  if (!crossTenant) {
    where.push("institution_id = ?");
    params.push(req.tenantId);
  }
  if (req.query.search) {
    const like = `%${escapeLike(req.query.search)}%`;
    where.push("(name LIKE ? OR sku LIKE ?)");
    params.push(like, like);
  }
  if (req.query.category && req.query.category !== "all") {
    where.push("category = ?");
    params.push(req.query.category);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM products ${clause}`, params);
  const items = await query(`SELECT * FROM products ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, paging.limit, paging.offset]);

  res.json({ success: true, items, pagination: buildPagination(paging, Number(total)), data: items, products: items });
}

/** POST /products */
export async function createProduct(req, res) {
  const b = req.body;
  const result = await query(
    `INSERT INTO products
       (institution_id, sku, name, category, description, image_url, selling_price, cost_price_hpp,
        stock_quantity, low_stock_threshold, weight_in_grams, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.tenantId,
      b.sku,
      b.name,
      b.category ?? "Umum",
      b.description ?? null,
      b.image_url ?? null,
      b.selling_price,
      b.cost_price_hpp,
      b.stock_quantity,
      b.low_stock_threshold,
      b.weight_in_grams,
      b.is_active ? 1 : 0,
    ]
  );
  const product = await queryOne("SELECT * FROM products WHERE id = ?", [result.insertId]);
  await audit(req, "product.create", { entityType: "product", entityId: product.id });
  res.status(201).json({ success: true, message: "Produk berhasil ditambahkan.", data: product });
}

/** PUT /products/:id — only whitelisted columns can change. */
export async function updateProduct(req, res) {
  const existing = await queryOne("SELECT id FROM products WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!existing) throw notFound("Produk tidak ditemukan.");

  const sets = [];
  const values = [];
  for (const key of UPDATABLE) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(key === "is_active" ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (sets.length) {
    await query(`UPDATE products SET ${sets.join(", ")} WHERE id = ? AND institution_id = ?`, [...values, req.params.id, req.tenantId]);
  }

  const product = await queryOne("SELECT * FROM products WHERE id = ?", [req.params.id]);
  await audit(req, "product.update", { entityType: "product", entityId: product.id, metadata: Object.keys(req.body) });
  res.json({ success: true, message: "Produk berhasil diperbarui.", data: product });
}

/** DELETE /products/:id */
export async function deleteProduct(req, res) {
  const result = await query("DELETE FROM products WHERE id = ? AND institution_id = ?", [req.params.id, req.tenantId]);
  if (!result.affectedRows) throw notFound("Produk tidak ditemukan.");
  await audit(req, "product.delete", { entityType: "product", entityId: req.params.id });
  res.json({ success: true, message: "Produk berhasil dihapus." });
}

/**
 * POST /products/bulk — import a catalogue in one transaction.
 * Existing SKUs are updated, new ones created. Mode "replace" additionally
 * deactivates (never deletes) products that are not in the file, so it is reversible.
 */
export async function bulkUpsertProducts(req, res) {
  const { items, mode } = req.body;
  const seen = new Set();
  for (const item of items) {
    const key = item.sku.toLowerCase();
    if (seen.has(key)) throw badRequest(`SKU duplikat di file impor: ${item.sku}`);
    seen.add(key);
  }

  const summary = await transaction(async (tx) => {
    const existing = new Set(
      (await tx.query("SELECT sku FROM products WHERE institution_id = ? AND sku IN (?)", [req.tenantId, items.map((i) => i.sku)])).map((r) => r.sku.toLowerCase())
    );
    let created = 0;
    let updated = 0;
    for (const p of items) {
      await tx.query(
        `INSERT INTO products
           (institution_id, sku, name, category, description, selling_price, cost_price_hpp, stock_quantity, low_stock_threshold, weight_in_grams, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), description = VALUES(description),
           selling_price = VALUES(selling_price), cost_price_hpp = VALUES(cost_price_hpp), stock_quantity = VALUES(stock_quantity),
           low_stock_threshold = VALUES(low_stock_threshold), weight_in_grams = VALUES(weight_in_grams), is_active = 1`,
        [req.tenantId, p.sku, p.name, p.category ?? "Umum", p.description ?? null, p.selling_price, p.cost_price_hpp, p.stock_quantity, p.low_stock_threshold, p.weight_in_grams]
      );
      if (existing.has(p.sku.toLowerCase())) updated++;
      else created++;
    }
    let deactivated = 0;
    if (mode === "replace") {
      const result = await tx.query("UPDATE products SET is_active = 0 WHERE institution_id = ? AND sku NOT IN (?) AND is_active = 1", [
        req.tenantId,
        items.map((i) => i.sku),
      ]);
      deactivated = result.affectedRows;
    }
    return { created, updated, deactivated };
  });

  await audit(req, "product.bulk_import", { metadata: { ...summary, mode } });
  res.status(201).json({ success: true, message: "Impor produk selesai.", ...summary });
}

/** POST /products/stock — set absolute stock by SKU. Unknown SKUs are reported, not created. */
export async function importStock(req, res) {
  const unknown = [];
  let updated = 0;
  await transaction(async (tx) => {
    for (const item of req.body.items) {
      const result = await tx.query("UPDATE products SET stock_quantity = ? WHERE institution_id = ? AND sku = ?", [item.stock_quantity, req.tenantId, item.sku]);
      if (result.affectedRows) updated++;
      else unknown.push(item.sku);
    }
  });
  await audit(req, "product.stock_import", { metadata: { updated, unknown: unknown.length } });
  res.json({ success: true, updated, unknownSkus: unknown });
}
