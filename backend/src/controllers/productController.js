import { memoryStore } from "../config/db.js";
import { paginate } from "../utils/helpers.js";

/**
 * Get Paginated Products List (Multi-Tenant Isolated)
 * GET /api/v1/products
 */
export async function getProducts(req, res, next) {
  try {
    const institutionId = Number(req.tenantId || req.user?.institution_id || 1);
    const { page = 1, limit = 10, search = "", category = "" } = req.query;

    let list = (memoryStore.products || []).filter((p) => Number(p.institution_id) === institutionId);

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
    }

    if (category) {
      list = list.filter((p) => p.category === category);
    }

    const result = paginate(list, page, limit);
    res.json({ success: true, ...result, data: result.items, products: result.items });
  } catch (err) {
    next(err);
  }
}

/**
 * Create Product with Multi-Level Variants & HPP
 * POST /api/v1/products
 */
export async function createProduct(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const { sku, name, category, selling_price, cost_price_hpp, stock_quantity, weight_in_grams, description, image_url } = req.body;

    if (!sku || !name || selling_price === undefined) {
      return res.status(400).json({ success: false, message: "SKU, nama produk, dan harga jual wajib diisi." });
    }

    const newProd = {
      id: (memoryStore.products?.length || 0) + 1,
      institution_id: institutionId,
      sku,
      name,
      category: category || "Umum",
      description: description || "",
      image_url: image_url || "",
      selling_price: Number(selling_price),
      cost_price_hpp: Number(cost_price_hpp || 0),
      stock_quantity: Number(stock_quantity || 0),
      low_stock_threshold: 5,
      weight_in_grams: Number(weight_in_grams || 200),
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!memoryStore.products) memoryStore.products = [];
    memoryStore.products.push(newProd);

    res.status(201).json({ success: true, message: "Produk berhasil ditambahkan.", data: newProd });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Product
 * PUT /api/v1/products/:id
 */
export async function updateProduct(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const prodId = parseInt(req.params.id, 10);
    const prod = (memoryStore.products || []).find((p) => p.id === prodId && p.institution_id === institutionId);

    if (!prod) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
    }

    Object.assign(prod, req.body, { updated_at: new Date().toISOString() });
    res.json({ success: true, message: "Produk berhasil diperbarui.", data: prod });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Product
 * DELETE /api/v1/products/:id
 */
export async function deleteProduct(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const prodId = parseInt(req.params.id, 10);
    memoryStore.products = (memoryStore.products || []).filter((p) => !(p.id === prodId && p.institution_id === institutionId));
    res.json({ success: true, message: "Produk berhasil dihapus." });
  } catch (err) {
    next(err);
  }
}
